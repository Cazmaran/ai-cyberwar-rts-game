// The layered command API (Tenet 2). Every controller (human UI, scripted AI, LLM) acts only through these.
// Unit orders act on specific units; high-level orders are expanded by the sim into unit orders.
import { BUILDINGS, SIGNAL, UNITS, type BuildingTypeId, type Faction, type UnitTypeId } from './data.ts';
import { dist2, TILE, within } from './fixed.ts';
import { pullThePlug } from './abilities.ts';
import { sectorCenter, sectorOf, SECTORS, type SectorId } from './sectors.ts';
import { onAutopilot } from './signal.ts';
import { buildings, spawnBuilding, units, WORKER, type Order, type Unit, type World } from './world.ts';

export type UnitOrder =
  | { type: 'move'; units: number[]; x: number; y: number }
  | { type: 'attackMove'; units: number[]; x: number; y: number }
  | { type: 'attack'; units: number[]; target: number }
  | { type: 'stop'; units: number[] }
  | { type: 'build'; units: number[]; building: BuildingTypeId; x: number; y: number }
  /** Send workers to help finish an existing, unfinished building. */
  | { type: 'construct'; units: number[]; building: number }
  | { type: 'claim'; units: number[]; site: string }
  | { type: 'lightLink'; units: number[]; link: number }
  | { type: 'train'; building: number; unit: UnitTypeId }
  | { type: 'setRally'; building: number; x: number; y: number }
  | { type: 'pullThePlug'; x: number; y: number };

export type HighLevelOrder =
  /** All combat units attack-move to a sector. */
  | { type: 'attackSector'; sector: SectorId }
  /** All combat units return to a sector and hold it. */
  | { type: 'defendSector'; sector: SectorId }
  /** An idle worker claims the nearest site the faction doesn't own. */
  | { type: 'expand' };

export type Command = UnitOrder | HighLevelOrder;

export const MAX_QUEUE = 5;

/** Apply a command for a faction. Returns an error message, or null if applied. Invalid commands change nothing. */
export function applyCommand(world: World, faction: Faction, cmd: Command): string | null {
  if (world.winner !== null) return 'match is over';
  switch (cmd.type) {
    case 'move':
    case 'attackMove': {
      if (!inBounds(world, cmd.x, cmd.y)) return 'position out of bounds';
      return orderUnits(world, faction, cmd.units, () => ({ type: cmd.type, x: cmd.x, y: cmd.y }));
    }
    case 'attack': {
      const t = world.entities.get(cmd.target);
      if (!t || t.faction === faction) return 'invalid target';
      return orderUnits(world, faction, cmd.units, () => ({ type: 'attack', target: cmd.target }));
    }
    case 'stop':
      return orderUnits(world, faction, cmd.units, () => ({ type: 'idle' }));
    case 'build': {
      const stats = BUILDINGS[cmd.building];
      if (!stats) return 'unknown building';
      if (stats.faction !== 'any' && stats.faction !== faction) return 'faction cannot build that';
      if (cmd.building === 'noc' || cmd.building === 'primary_cluster') return 'cannot build another core';
      if (!inBounds(world, cmd.x, cmd.y)) return 'position out of bounds';
      if (world.factions[faction].data < stats.cost) return 'not enough data';
      if (overlaps(world, cmd.x, cmd.y, stats.radius)) return 'location blocked';
      const workers = ownUnits(world, faction, cmd.units).filter((u) => UNITS[u.type].role === 'worker');
      if (workers.length === 0) return 'no workers selected';
      world.factions[faction].data -= stats.cost;
      const b = spawnBuilding(world, cmd.building, faction, cmd.x, cmd.y);
      for (const w of workers) setOrder(w, { type: 'build', building: b.id });
      return null;
    }
    case 'construct': {
      const b = world.entities.get(cmd.building);
      if (!b || b.kind !== 'building' || b.faction !== faction || b.built) return 'invalid building';
      const workers = ownUnits(world, faction, cmd.units).filter((u) => UNITS[u.type].role === 'worker');
      if (workers.length === 0) return 'no workers selected';
      for (const w of workers) setOrder(w, { type: 'build', building: b.id });
      return null;
    }
    case 'claim': {
      const s = world.sites.get(cmd.site);
      if (!s || s.kind === 'core') return 'invalid site';
      const workers = ownUnits(world, faction, cmd.units).filter((u) => UNITS[u.type].role === 'worker');
      if (workers.length === 0) return 'no workers selected';
      for (const w of workers) setOrder(w, { type: 'claim', site: cmd.site });
      return null;
    }
    case 'lightLink': {
      if (!world.links[cmd.link]) return 'invalid link';
      const workers = ownUnits(world, faction, cmd.units).filter((u) => UNITS[u.type].role === 'worker');
      if (workers.length === 0) return 'no workers selected';
      for (const w of workers) setOrder(w, { type: 'lightLink', link: cmd.link });
      return null;
    }
    case 'train': {
      const b = world.entities.get(cmd.building);
      const stats = UNITS[cmd.unit];
      if (!b || b.kind !== 'building' || b.faction !== faction || !b.built) return 'invalid building';
      if (!stats || stats.trainedAt !== b.type) return 'building cannot train that unit';
      if (b.queue.length >= MAX_QUEUE) return 'queue full';
      if (world.factions[faction].data < stats.cost) return 'not enough data';
      world.factions[faction].data -= stats.cost;
      b.queue.push(cmd.unit);
      return null;
    }
    case 'setRally': {
      const b = world.entities.get(cmd.building);
      if (!b || b.kind !== 'building' || b.faction !== faction) return 'invalid building';
      if (!inBounds(world, cmd.x, cmd.y)) return 'position out of bounds';
      b.rallyX = cmd.x;
      b.rallyY = cmd.y;
      return null;
    }
    case 'pullThePlug':
      if (faction !== 'human') return 'only humans can pull the plug';
      if (!inBounds(world, cmd.x, cmd.y)) return 'position out of bounds';
      return pullThePlug(world, cmd.x, cmd.y);
    case 'attackSector':
    case 'defendSector': {
      if (!SECTORS.includes(cmd.sector)) return 'invalid sector';
      const [x, y] = sectorCenter(world.map, cmd.sector);
      const army = units(world).filter((u) => u.faction === faction && UNITS[u.type].role !== 'worker');
      if (army.length === 0) return 'no combat units';
      const type = cmd.type === 'attackSector' ? 'attackMove' : 'move';
      for (const u of army) {
        // Defenders already in the sector stay put and fight from there.
        if (type === 'move' && sectorOf(world.map, u.x, u.y) === cmd.sector) continue;
        setOrder(u, { type, x, y });
      }
      return null;
    }
    case 'expand': {
      const worker = units(world).find(
        (u) => u.faction === faction && u.type === WORKER[faction] && u.order.type === 'idle',
      );
      if (!worker) return 'no idle worker';
      let best: string | null = null;
      let bestD = Infinity;
      for (const s of world.sites.values()) {
        if (s.kind === 'core' || s.owner === faction) continue;
        const d = dist2(worker.x, worker.y, s.x, s.y);
        if (d < bestD) { bestD = d; best = s.id; }
      }
      if (!best) return 'nothing left to claim';
      setOrder(worker, { type: 'claim', site: best });
      return null;
    }
  }
}

function setOrder(u: Unit, order: Order): void {
  u.order = order;
  u.target = null;
  u.jobProgress = 0;
}

function ownUnits(world: World, faction: Faction, ids: number[]): Unit[] {
  const out: Unit[] = [];
  for (const id of ids) {
    const e = world.entities.get(id);
    if (e && e.kind === 'unit' && e.faction === faction && e.hp > 0) out.push(e);
  }
  return out;
}

function orderUnits(world: World, faction: Faction, ids: number[], order: () => Order): string | null {
  const list = ownUnits(world, faction, ids);
  if (list.length === 0) return 'no valid units';
  // Soft leash (proposal 0001): machines on autopilot are out of the Model's reach and keep their last order.
  const reachable = SIGNAL.autopilotDeaf ? list.filter((u) => !onAutopilot(world, u)) : list;
  if (reachable.length === 0) return 'out of signal';
  for (const u of reachable) setOrder(u, order());
  return null;
}

function inBounds(world: World, x: number, y: number): boolean {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0
    && x <= world.map.width * TILE && y <= world.map.height * TILE;
}

function overlaps(world: World, x: number, y: number, radius: number): boolean {
  for (const b of buildings(world)) {
    if (within(x, y, b.x, b.y, radius + BUILDINGS[b.type].radius)) return true;
  }
  for (const s of world.sites.values()) {
    if (within(x, y, s.x, s.y, radius + TILE)) return true;
  }
  return false;
}
