// What one faction can see (fog of war applies), as data for controllers and as text for LLMs and humans.
import { BUILDINGS, UNITS, type BuildingTypeId, type Faction, type Role, type UnitTypeId } from './data.ts';
import { MILLI, within } from './fixed.ts';
import type { SiteKind } from './map.ts';
import { sectorOf, type SectorId } from './sectors.ts';
import { buildings, TICK_RATE, units, type Order, type World } from './world.ts';

export interface UnitView { id: number; type: UnitTypeId; role: Role; x: number; y: number; hp: number; maxHp: number; sector: SectorId; order: Order['type']; target: number | null }
export interface BuildingView {
  id: number; type: BuildingTypeId; x: number; y: number; hp: number; maxHp: number; built: boolean;
  /** Own buildings only: units queued, and production work done on the first one. */
  queue: UnitTypeId[]; progress: number; sector: SectorId;
}
export interface SiteView { id: string; kind: SiteKind; x: number; y: number; sector: SectorId; visible: boolean; owner: Faction | null | 'unknown' }
export interface LinkView { index: number; a: string; b: string; bandwidth: number; mine: boolean }

export interface FactionView {
  tick: number;
  faction: Faction;
  mapId: string;
  mapWidth: number;
  mapHeight: number;
  data: number;
  income: number;
  powerUsed: number;
  powerCap: number;
  compute: number;
  plugReadyIn: number | null;
  /** AI only: current trained resistances (percent by attacker type). */
  resist: Partial<Record<UnitTypeId, number>> | null;
  retraining: boolean;
  units: UnitView[];
  buildings: BuildingView[];
  enemyUnits: UnitView[];
  enemyBuildings: BuildingView[];
  sites: SiteView[];
  links: LinkView[];
}

export function factionView(world: World, faction: Faction): FactionView {
  const fs = world.factions[faction];
  const eyes: { x: number; y: number; sight: number }[] = [];
  for (const u of units(world)) if (u.faction === faction) eyes.push({ x: u.x, y: u.y, sight: UNITS[u.type].sight });
  for (const b of buildings(world)) if (b.faction === faction && b.built) eyes.push({ x: b.x, y: b.y, sight: BUILDINGS[b.type].sight });
  const seen = (x: number, y: number) => eyes.some((e) => within(x, y, e.x, e.y, e.sight));

  const unitView = (u: ReturnType<typeof units>[number]): UnitView => ({
    id: u.id, type: u.type, role: UNITS[u.type].role, x: u.x, y: u.y, hp: u.hp, maxHp: UNITS[u.type].hp,
    sector: sectorOf(world.map, u.x, u.y), order: u.order.type,
    target: u.order.type === 'attack' ? u.order.target : u.target,
  });
  const buildingView = (b: ReturnType<typeof buildings>[number]): BuildingView => ({
    id: b.id, type: b.type, x: b.x, y: b.y, hp: b.hp, maxHp: BUILDINGS[b.type].hp, built: b.built,
    queue: b.faction === faction ? [...b.queue] : [], progress: b.faction === faction ? b.progress : 0, sector: sectorOf(world.map, b.x, b.y),
  });

  const allUnits = units(world);
  const allBuildings = buildings(world);
  return {
    tick: world.tick,
    faction,
    mapId: world.map.id,
    mapWidth: world.map.width,
    mapHeight: world.map.height,
    data: fs.data,
    income: fs.income,
    powerUsed: fs.powerUsed,
    powerCap: fs.powerCap,
    compute: fs.compute,
    plugReadyIn: faction === 'human' ? Math.max(0, fs.plugReadyAt - world.tick) : null,
    resist: faction === 'ai' ? { ...fs.resist } : null,
    retraining: faction === 'ai' && world.tick < fs.retrainingUntil,
    units: allUnits.filter((u) => u.faction === faction).map(unitView),
    buildings: allBuildings.filter((b) => b.faction === faction).map(buildingView),
    enemyUnits: allUnits.filter((u) => u.faction !== faction && seen(u.x, u.y)).map(unitView),
    enemyBuildings: allBuildings.filter((b) => b.faction !== faction && seen(b.x, b.y)).map(buildingView),
    sites: [...world.sites.values()].map((s) => {
      const visible = s.owner === faction || seen(s.x, s.y);
      return { id: s.id, kind: s.kind, x: s.x, y: s.y, sector: sectorOf(world.map, s.x, s.y), visible, owner: visible ? s.owner : 'unknown' };
    }),
    links: world.links.map((l) => ({ index: l.index, a: l.a, b: l.b, bandwidth: l.bandwidth, mine: l.owner === faction })),
  };
}

/**
 * Power left once every queued unit comes online. A finished unit waits in its building until there is
 * Power for it, so training past zero only ties up Data.
 */
export function powerHeadroom(v: FactionView): number {
  let queued = 0;
  for (const b of v.buildings) for (const t of b.queue) queued += UNITS[t].power;
  return Math.max(0, v.powerCap - v.powerUsed - queued);
}

export interface Training { unit: UnitTypeId; seconds: number; queued: number; waitingForPower: boolean }

/**
 * What a building is training and when the next unit comes out. Compute is shared equally between
 * buildings that are training (as in the sim's production step). A finished unit waits for Power.
 */
export function training(v: FactionView, b: BuildingView): Training | null {
  const unit = b.queue[0];
  if (!unit || !b.built) return null;
  const busy = v.buildings.filter((x) => x.built && x.queue.length > 0).length;
  const share = Math.max(1, Math.trunc(v.compute / Math.max(1, busy)));
  const left = Math.max(0, UNITS[unit].work - b.progress);
  const waitingForPower = left === 0 && v.powerUsed + UNITS[unit].power > v.powerCap;
  return { unit, seconds: Math.ceil(Math.ceil(left / share) / TICK_RATE), queued: b.queue.length - 1, waitingForPower };
}

/** Compact text summary by sector: what an LLM General reads, and what a human can inspect when debugging. */
export function describeView(v: FactionView): string {
  const secs = Math.trunc(v.tick / TICK_RATE);
  const lines: string[] = [];
  lines.push(`[${v.faction}] t=${Math.trunc(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
    + ` data=${Math.trunc(v.data / MILLI)} (+${((v.income * TICK_RATE) / MILLI).toFixed(1)}/s)`
    + ` power=${v.powerUsed}/${v.powerCap}${powerHeadroom(v) === 0 ? ' FULL' : ''} compute=${v.compute}`);
  if (v.plugReadyIn !== null) lines.push(`pull_the_plug: ${v.plugReadyIn === 0 ? 'READY' : `ready in ${Math.ceil(v.plugReadyIn / TICK_RATE)}s`}`);
  if (v.resist) {
    const r = Object.entries(v.resist).filter(([, p]) => (p ?? 0) > 0).map(([t, p]) => `${t} ${p}%`);
    lines.push(`adaptation: ${r.length ? r.join(', ') : 'none'}${v.retraining ? ' (retraining)' : ''}`);
  }
  const bySector = new Map<SectorId, string[]>();
  const add = (s: SectorId, text: string) => { if (!bySector.has(s)) bySector.set(s, []); bySector.get(s)!.push(text); };
  const count = (list: UnitView[]) => {
    const m = new Map<UnitTypeId, number>();
    for (const u of list) m.set(u.type, (m.get(u.type) ?? 0) + 1);
    return [...m].map(([t, n]) => `${n} ${t}`).join(', ');
  };
  for (const s of new Set([...v.units, ...v.enemyUnits].map((u) => u.sector))) {
    const mine = count(v.units.filter((u) => u.sector === s));
    const theirs = count(v.enemyUnits.filter((u) => u.sector === s));
    if (mine) add(s, `ours: ${mine}`);
    if (theirs) add(s, `ENEMY: ${theirs}`);
  }
  for (const b of v.buildings) {
    const t = training(v, b);
    const tr = !t ? '' : ` training ${t.unit} ${t.waitingForPower ? 'waiting for power' : `${t.seconds}s`}${t.queued ? ` (+${t.queued} queued)` : ''}`;
    add(b.sector, `our ${b.type}${b.built ? '' : ' (building)'} ${b.hp}/${b.maxHp}hp${tr}`);
  }
  for (const b of v.enemyBuildings) add(b.sector, `ENEMY ${b.type} ${b.hp}/${b.maxHp}hp`);
  for (const s of v.sites) {
    if (s.kind === 'core') continue;
    const owner = s.owner === v.faction ? 'ours' : s.owner === null ? 'neutral' : s.owner === 'unknown' ? 'unseen' : 'ENEMY';
    add(s.sector, `${s.kind} ${s.id}: ${owner}`);
  }
  for (const [sector, items] of [...bySector].sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`${sector}: ${items.join('; ')}`);
  }
  return lines.join('\n');
}
