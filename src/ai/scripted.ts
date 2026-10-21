// Scripted strategy bots. They play either faction through the same commands and view a human or LLM gets.
// Strategies are data, so new ones (and balance experiments) need no new logic.
import {
  BUILDINGS, createRng, UNITS, TILE, dist2, type BuildingTypeId, type Command, type Faction, type FactionView,
  type Rng, type Role, type SiteView, type UnitTypeId, type UnitView,
} from '../sim/index.ts';
import type { Controller } from './controller.ts';

export interface Strategy {
  name: string;
  workers: number;
  racks: number;
  /** Humans only. */
  firewalls: number;
  mix: Partial<Record<Role, number>>;
  /** Army size that triggers an attack. */
  attackAt: number;
  /** Focus fire on the weakest enemy in reach (the "skilled player" behavior). */
  micro: boolean;
  /** Use Pull the Plug on clustered AI units (humans only). */
  usePlug: boolean;
}

export const STRATEGIES: Record<string, Strategy> = {
  rush: { name: 'rush', workers: 4, racks: 0, firewalls: 0, mix: { fast: 2, ranged: 1 }, attackAt: 5, micro: true, usePlug: true },
  boom: { name: 'boom', workers: 8, racks: 2, firewalls: 0, mix: { fast: 1, ranged: 1, tank: 1 }, attackAt: 14, micro: true, usePlug: true },
  turtle: { name: 'turtle', workers: 6, racks: 1, firewalls: 3, mix: { ranged: 2, tank: 2, fast: 1 }, attackAt: 18, micro: true, usePlug: true },
};

const ARMY_UNITS: Record<Faction, Record<Exclude<Role, 'worker'>, UnitTypeId>> = {
  human: { fast: 'incident_responder', ranged: 'red_team', tank: 'hardened_server' },
  ai: { fast: 'botnet', ranged: 'exploit', tank: 'daemon' },
};
const PRODUCTION: Record<Faction, BuildingTypeId> = { human: 'soc', ai: 'training_cluster' };
const CORE: Record<Faction, BuildingTypeId> = { human: 'noc', ai: 'primary_cluster' };
const WORKER: Record<Faction, UnitTypeId> = { human: 'field_engineer', ai: 'crawler' };

export function createScriptedBot(faction: Faction, strategy: Strategy, seed = 1): Controller {
  const rng = createRng(seed);
  // Small per-seed variation so batch matches differ.
  const attackAt = strategy.attackAt + rng.int(-1, 2);
  const busy = new Map<number, string>(); // worker id -> job key
  let attacking = false;
  let rallySet = false;

  return {
    name: `${strategy.name}${strategy.micro ? '' : '-sloppy'}`,
    decide(v: FactionView): Command[] {
      const out: Command[] = [];
      const core = v.buildings.find((b) => b.type === CORE[faction]);
      if (!core) return out;
      const enemyCore = v.sites.find((s) => s.kind === 'core' && !(s.x === core.x && s.y === core.y));
      const workers = v.units.filter((u) => u.role === 'worker');
      const army = v.units.filter((u) => u.role !== 'worker');
      const prod = v.buildings.find((b) => b.type === PRODUCTION[faction]);
      const towardCenter = Math.sign(v.mapWidth * TILE / 2 - core.x);

      // Forget jobs of workers that went idle or died.
      for (const [id] of busy) {
        const w = workers.find((u) => u.id === id);
        if (!w || w.order === 'idle') busy.delete(id);
      }

      // 1. Defend the base.
      const threats = v.enemyUnits.filter((e) => dist2(e.x, e.y, core.x, core.y) < (12 * TILE) ** 2);
      if (threats.length > 0 && army.length > 0) {
        out.push(focusOrMove(army, threats, strategy.micro, core.x, core.y));
      }

      // 2. Pull the Plug on clustered enemies near our units.
      if (strategy.usePlug && v.plugReadyIn === 0) {
        const target = clusterNear(v.enemyUnits, [...army, ...workers]);
        if (target) out.push({ type: 'pullThePlug', x: target[0], y: target[1] });
      }

      // 3. Micro: focus the weakest enemy near the army.
      if (strategy.micro && army.length > 0 && threats.length === 0) {
        const near = v.enemyUnits.filter((e) => army.some((a) => dist2(a.x, a.y, e.x, e.y) < (6 * TILE) ** 2));
        if (near.length > 0) out.push(focusOrMove(army, near, true, 0, 0));
      }

      // 4. Jobs for idle workers.
      for (const w of workers) {
        if (w.order !== 'idle' || busy.has(w.id)) continue;
        const job = nextJob(v, faction, strategy, core, prod, busy, rng, towardCenter);
        if (!job) break;
        busy.set(w.id, job.key);
        if ('units' in job.cmd) job.cmd.units = [w.id];
        out.push(job.cmd);
      }

      // 5. Production.
      if (workers.length < strategy.workers && core.queue.length === 0 && v.data >= UNITS[WORKER[faction]].cost) {
        out.push({ type: 'train', building: core.id, unit: WORKER[faction] });
      }
      if (prod?.built) {
        if (!rallySet) {
          rallySet = true;
          out.push({ type: 'setRally', building: prod.id, x: core.x + towardCenter * 5 * TILE, y: core.y });
        }
        if (prod.queue.length < 2) {
          const unit = pickArmyUnit(faction, strategy, army);
          if (v.data >= UNITS[unit].cost) out.push({ type: 'train', building: prod.id, unit });
        }
      }

      // 6. Attack once the army is big enough; keep feeding reinforcements.
      const idleArmy = army.filter((u) => u.order === 'idle');
      if (enemyCore && (attacking ? idleArmy.length >= 3 : army.length >= attackAt)) {
        const group = attacking ? idleArmy : army;
        attacking = true;
        if (group.length > 0) out.push({ type: 'attackMove', units: group.map((u) => u.id), x: enemyCore.x, y: enemyCore.y });
      }
      return out;
    },
  };
}

function focusOrMove(army: UnitView[], enemies: UnitView[], micro: boolean, x: number, y: number): Command {
  const ids = army.map((u) => u.id);
  if (micro) {
    const weakest = [...enemies].sort((a, b) => a.hp - b.hp || a.id - b.id)[0]!;
    return { type: 'attack', units: ids, target: weakest.id };
  }
  const t = enemies[0]!;
  return { type: 'attackMove', units: ids, x: x || t.x, y: y || t.y };
}

function clusterNear(enemies: UnitView[], ours: UnitView[]): [number, number] | null {
  for (const e of enemies) {
    const group = enemies.filter((o) => dist2(o.x, o.y, e.x, e.y) < (3 * TILE) ** 2);
    if (group.length >= 4 && ours.some((u) => dist2(u.x, u.y, e.x, e.y) < (8 * TILE) ** 2)) {
      const cx = Math.trunc(group.reduce((s, g) => s + g.x, 0) / group.length);
      const cy = Math.trunc(group.reduce((s, g) => s + g.y, 0) / group.length);
      return [cx, cy];
    }
  }
  return null;
}

function pickArmyUnit(faction: Faction, s: Strategy, army: UnitView[]): UnitTypeId {
  let best: Exclude<Role, 'worker'> = 'fast';
  let bestScore = Infinity;
  for (const role of ['fast', 'ranged', 'tank'] as const) {
    const weight = s.mix[role] ?? 0;
    if (weight <= 0) continue;
    const score = army.filter((u) => u.role === role).length / weight;
    if (score < bestScore) { bestScore = score; best = role; }
  }
  return ARMY_UNITS[faction][best];
}

type Job = { key: string; cmd: Command & { units?: number[] } };

function nextJob(
  v: FactionView, faction: Faction, s: Strategy, core: FactionView['buildings'][number],
  prod: FactionView['buildings'][number] | undefined, busy: Map<number, string>, rng: Rng, toward: number,
): Job | null {
  const taken = new Set(busy.values());
  const mine = (site: SiteView | undefined) =>
    !!site && (site.owner === faction || (site.kind === 'router' && site.owner === null) || (site.kind === 'core' && site.x === core.x && site.y === core.y));
  const siteById = new Map(v.sites.map((x) => [x.id, x]));

  // Finish unbuilt buildings first.
  const unbuilt = v.buildings.find((b) => !b.built && !taken.has(`build:${b.id}`));
  if (unbuilt) return { key: `build:${unbuilt.id}`, cmd: { type: 'construct', units: [], building: unbuilt.id } };

  // Production building early.
  if (!prod && v.data >= BUILDINGS[PRODUCTION[faction]].cost && !taken.has('new:prod')) {
    const [x, y] = spot(v, core, toward, rng);
    return { key: 'new:prod', cmd: { type: 'build', units: [], building: PRODUCTION[faction], x, y } };
  }

  // Light links between friendly endpoints (our sites, our core, neutral routers), closest to home first.
  const links = v.links
    .filter((l) => !l.mine && !taken.has(`link:${l.index}`) && mine(siteById.get(l.a)) && mine(siteById.get(l.b)))
    .sort((a, b) => linkDist(a, siteById, core) - linkDist(b, siteById, core) || a.index - b.index);
  if (links[0]) return { key: `link:${links[0].index}`, cmd: { type: 'lightLink', units: [], link: links[0].index } };

  // Claim the nearest unclaimed site (not enemy-held: workers don't contest).
  const sites = v.sites
    .filter((x) => x.kind !== 'core' && (x.owner === null || x.owner === 'unknown') && !taken.has(`claim:${x.id}`))
    .sort((a, b) => dist2(a.x, a.y, core.x, core.y) - dist2(b.x, b.y, core.x, core.y) || a.id.localeCompare(b.id));
  if (sites[0]) return { key: `claim:${sites[0].id}`, cmd: { type: 'claim', units: [], site: sites[0].id } };

  const racks = v.buildings.filter((b) => b.type === 'server_rack').length;
  if (racks < s.racks && v.data >= BUILDINGS.server_rack.cost && !taken.has('new:rack')) {
    const [x, y] = spot(v, core, toward, rng);
    return { key: 'new:rack', cmd: { type: 'build', units: [], building: 'server_rack', x, y } };
  }
  const walls = v.buildings.filter((b) => b.type === 'firewall').length;
  if (faction === 'human' && walls < s.firewalls && v.data >= BUILDINGS.firewall.cost && !taken.has('new:wall')) {
    const x = core.x + toward * 9 * TILE;
    const y = core.y + (walls - 1) * 2 * TILE;
    return { key: 'new:wall', cmd: { type: 'build', units: [], building: 'firewall', x, y } };
  }
  return null;
}

function linkDist(l: FactionView['links'][number], sites: Map<string, SiteView>, core: { x: number; y: number }): number {
  const a = sites.get(l.a)!;
  const b = sites.get(l.b)!;
  return Math.min(dist2(a.x, a.y, core.x, core.y), dist2(b.x, b.y, core.x, core.y));
}

/** A building spot behind the core, away from sites and other buildings. */
function spot(v: FactionView, core: { x: number; y: number }, toward: number, rng: Rng): [number, number] {
  for (let i = 0; i < 20; i++) {
    const x = core.x + (rng.int(-4, 1) * toward) * TILE;
    const y = core.y + rng.int(-6, 6) * TILE;
    const clear = v.buildings.every((b) => dist2(b.x, b.y, x, y) > (3 * TILE) ** 2)
      && v.sites.every((s) => dist2(s.x, s.y, x, y) > (3 * TILE) ** 2);
    if (clear && x > TILE && y > TILE && x < (v.mapWidth - 1) * TILE && y < (v.mapHeight - 1) * TILE) return [x, y];
  }
  return [core.x - toward * 3 * TILE, core.y + 4 * TILE];
}
