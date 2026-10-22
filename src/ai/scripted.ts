// Scripted strategy bots. They play either faction through the same commands and view a human or LLM gets.
// Strategies are data, so new ones (and balance experiments) need no new logic.
import {
  BUILDINGS, createRng, FAIRNESS, UNITS, TILE, dist2, type BuildingTypeId, type Command, type Faction, type FactionView,
  type Rng, type Role, type SiteView, type UnitTypeId, type UnitView,
} from '../sim/index.ts';
import type { Controller } from './controller.ts';

export interface Strategy {
  name: string;
  workers: number;
  racks: number;
  /** Physical barricades to build (humans only). */
  barricades: number;
  /** Static defenses (Security Post / Sentry Gun) to build in front of the core. */
  defenses: number;
  mix: Partial<Record<Role, number>>;
  /** Army size that triggers an attack. */
  attackAt: number;
  /** Skilled play: in a fight, each role focuses the weakest enemy it counters (else the weakest in reach). */
  focusFire: boolean;
  /** Skilled play: shift the build mix toward counters of scouted enemy units. */
  counterBuild: boolean;
  /** Use Pull the Plug on clustered AI units (humans only). */
  usePlug: boolean;
  /** Earliest tick for the first attack (gives new players time to learn). */
  attackNotBefore?: number;
}

export const STRATEGIES: Record<string, Strategy> = {
  rush: { name: 'rush', workers: 4, racks: 0, barricades: 0, defenses: 0, mix: { fast: 2, ranged: 1 }, attackAt: 5, focusFire: true, counterBuild: true, usePlug: true },
  boom: { name: 'boom', workers: 8, racks: 2, barricades: 0, defenses: 1, mix: { fast: 1, ranged: 1, tank: 1 }, attackAt: 14, focusFire: true, counterBuild: true, usePlug: true },
  turtle: { name: 'turtle', workers: 6, racks: 1, barricades: 3, defenses: 3, mix: { ranged: 2, tank: 2, fast: 1 }, attackAt: 18, focusFire: true, counterBuild: true, usePlug: true },
};

/** Gentle opponent for learning the game: slow economy, no micro, attacks late. Not part of balance runs. */
export const TRAINING: Strategy = {
  name: 'training', workers: 4, racks: 0, barricades: 0, defenses: 0, mix: { fast: 1, ranged: 1, tank: 1 }, attackAt: 10,
  focusFire: false, counterBuild: false, usePlug: false, attackNotBefore: 8 * 60 * 20,
};

const ARMY_UNITS: Record<Faction, Record<Exclude<Role, 'worker'>, UnitTypeId>> = {
  human: { fast: 'counter_drone_team', ranged: 'red_team', tank: 'armored_vehicle' },
  ai: { fast: 'botnet_swarm', ranged: 'hunter_drone', tank: 'industrial_robot' },
};
const BEATS = { fast: 'ranged', ranged: 'tank', tank: 'fast' } as const;
const PRODUCTION: Record<Faction, BuildingTypeId> = { human: 'soc', ai: 'training_cluster' };
const CORE: Record<Faction, BuildingTypeId> = { human: 'noc', ai: 'primary_cluster' };
const WORKER: Record<Faction, UnitTypeId> = { human: 'field_engineer', ai: 'maintenance_drone' };
const DEFENSE: Record<Faction, BuildingTypeId> = { human: 'security_post', ai: 'sentry_gun' };

export function createScriptedBot(faction: Faction, strategy: Strategy, seed = 1): Controller {
  const rng = createRng(seed);
  // Small per-seed variation so batch matches differ.
  const attackAt = strategy.attackAt + rng.int(-1, 2);
  const busy = new Map<number, string>(); // worker id -> job key
  let attacking = false;
  let rallySet = false;
  /** Most enemy units of each role seen at once (scouting memory, used for counter-building). */
  const seen: Record<Exclude<Role, 'worker'>, number> = { fast: 0, ranged: 0, tank: 0 };
  /** Current focus target per role, so focus fire doesn't spend an action every decision. */
  const focus: Record<Exclude<Role, 'worker'>, number | null> = { fast: null, ranged: null, tank: null };
  // The bot sees the world a reaction delay late. Remember orders and spending not visible yet, so it
  // neither repeats an order nor spends the same Data twice.
  const pendingUntil = new Map<number, number>(); // unit or building id -> last tick its order may be unseen
  let reserved: { until: number; cost: number }[] = [];

  return {
    name: `${strategy.name}${strategy.focusFire || strategy.counterBuild ? '' : '-sloppy'}`,
    decide(raw: FactionView): Command[] {
      const out: Command[] = [];
      reserved = reserved.filter((r) => r.until >= raw.tick);
      const v = { ...raw, data: raw.data - reserved.reduce((sum, r) => sum + r.cost, 0) };
      const pending = (id: number) => (pendingUntil.get(id) ?? -1) >= v.tick;
      const order = (cmd: Command, ids: number[], cost = 0) => {
        out.push(cmd);
        for (const id of ids) pendingUntil.set(id, v.tick + FAIRNESS.reactionDelay);
        if (cost > 0) {
          v.data -= cost;
          reserved.push({ until: v.tick + FAIRNESS.reactionDelay, cost });
        }
      };
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
        if (!w || (w.order === 'idle' && !pending(id))) busy.delete(id);
      }

      // 1. Defend the base.
      const threats = v.enemyUnits.filter((e) => dist2(e.x, e.y, core.x, core.y) < (12 * TILE) ** 2);
      // Only units not already fighting a threat get orders: at the APM cap, re-issuing the same order
      // every decision would starve production and worker jobs.
      const defenders = army.filter((u) => !pending(u.id) && !threats.some((t) => t.id === u.target));
      if (threats.length > 0 && defenders.length > 0) {
        if (strategy.focusFire) {
          for (const role of ['fast', 'ranged', 'tank'] as const) {
            const group = defenders.filter((u) => u.role === role).map((u) => u.id);
            if (group.length > 0) order({ type: 'attack', units: group, target: pickTarget(role, threats).id }, group);
          }
        } else {
          const ids = defenders.map((u) => u.id);
          order({ type: 'attackMove', units: ids, x: core.x, y: core.y }, ids);
        }
      }

      // 2. Pull the Plug on clustered enemies near our units.
      if (strategy.usePlug && v.plugReadyIn === 0) {
        const target = clusterNear(v.enemyUnits, [...army, ...workers]);
        if (target) order({ type: 'pullThePlug', x: target[0], y: target[1] }, []);
      }

      for (const role of ['fast', 'ranged', 'tank'] as const) {
        seen[role] = Math.max(seen[role], v.enemyUnits.filter((e) => e.role === role).length);
      }

      // 3. Micro: each role in a fight focuses the enemy it counters.
      if (strategy.focusFire && threats.length === 0) {
        for (const role of ['fast', 'ranged', 'tank'] as const) {
          const group = army.filter((a) => a.role === role && !pending(a.id)
            && v.enemyUnits.some((e) => dist2(a.x, a.y, e.x, e.y) < (7 * TILE) ** 2));
          const near = v.enemyUnits.filter((e) => group.some((a) => dist2(a.x, a.y, e.x, e.y) < (6 * TILE) ** 2));
          // Re-target only when the current focus target is gone.
          if (near.length === 0 || near.some((e) => e.id === focus[role])) continue;
          const target = pickTarget(role, near);
          focus[role] = target.id;
          order({ type: 'attack', units: group.map((u) => u.id), target: target.id }, group.map((u) => u.id));
        }
      }

      // 4. Production comes before worker jobs: the APM cap allows about one action per decision.
      // When a larger enemy army is on our half, stop growing the economy and train army only.
      const invaders = v.enemyUnits.filter((e) => e.role !== 'worker'
        && (!enemyCore || dist2(e.x, e.y, core.x, core.y) < dist2(e.x, e.y, enemyCore.x, enemyCore.y)));
      const underPressure = invaders.length > army.length;
      if (prod?.built) {
        if (!rallySet) {
          rallySet = true;
          order({ type: 'setRally', building: prod.id, x: core.x + towardCenter * 5 * TILE, y: core.y }, []);
        }
        if (prod.queue.length < 2 && !pending(prod.id)) {
          const unit = pickArmyUnit(faction, strategy.counterBuild ? counterMix(strategy, seen) : strategy, army);
          if (v.data >= UNITS[unit].cost) order({ type: 'train', building: prod.id, unit }, [prod.id], UNITS[unit].cost);
        }
      }

      if (!underPressure && workers.length < strategy.workers && core.queue.length === 0 && !pending(core.id)
        && v.data >= UNITS[WORKER[faction]].cost) {
        order({ type: 'train', building: core.id, unit: WORKER[faction] }, [core.id], UNITS[WORKER[faction]].cost);
      }

      // 5. Jobs for idle workers.
      for (const w of workers) {
        if (w.order !== 'idle' || busy.has(w.id)) continue;
        const job = nextJob(v, faction, strategy, core, prod, busy, rng, towardCenter);
        if (!job) break;
        busy.set(w.id, job.key);
        if ('units' in job.cmd) job.cmd.units = [w.id];
        order(job.cmd, [w.id], job.cmd.type === 'build' ? BUILDINGS[job.cmd.building].cost : 0);
      }

      // 6. Attack once the army is big enough; keep feeding reinforcements.
      const idleArmy = army.filter((u) => u.order === 'idle' && !pending(u.id));
      const mayAttack = v.tick >= (strategy.attackNotBefore ?? 0);
      if (enemyCore && mayAttack && (attacking ? idleArmy.length >= 3 : army.length >= attackAt)) {
        const group = attacking ? idleArmy : army;
        attacking = true;
        if (group.length > 0) order({ type: 'attackMove', units: group.map((u) => u.id), x: enemyCore.x, y: enemyCore.y }, group.map((u) => u.id));
      }
      return out;
    },
  };
}

/** The weakest enemy this role counters, else the weakest enemy. */
function pickTarget(role: Exclude<Role, 'worker'>, enemies: UnitView[]): UnitView {
  const prey = enemies.filter((e) => e.role === BEATS[role]);
  return [...(prey.length > 0 ? prey : enemies)].sort((a, b) => a.hp - b.hp || a.id - b.id)[0]!;
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

/** Shift the build mix toward units that beat what we've scouted. */
function counterMix(s: Strategy, seen: Record<Exclude<Role, 'worker'>, number>): Strategy {
  const counterOf = { fast: 'tank', ranged: 'fast', tank: 'ranged' } as const;
  const mix = { ...s.mix };
  for (const role of ['fast', 'ranged', 'tank'] as const) {
    const c = counterOf[role];
    mix[c] = (mix[c] ?? 0) + seen[role];
  }
  return { ...s, mix };
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
  const enemyCore = v.sites.find((x) => x.kind === 'core' && !(x.x === core.x && x.y === core.y));
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

  // One worker builds static defenses while the others expand.
  const defense = DEFENSE[faction];
  const defenses = v.buildings.filter((b) => b.type === defense).length;
  if (defenses < s.defenses && v.data >= BUILDINGS[defense].cost && !taken.has('new:defense')) {
    const at = defenseSpot(v, faction, core, toward);
    if (at) return { key: 'new:defense', cmd: { type: 'build', units: [], building: defense, x: at[0], y: at[1] } };
  }

  // Claim (or retake) the nearest site on our half or in the center.
  const sites = v.sites
    .filter((x) => x.kind !== 'core' && x.owner !== faction && !taken.has(`claim:${x.id}`)
      // Workers stay on our half and the center; the far half is enemy territory.
      && (!enemyCore || dist2(x.x, x.y, core.x, core.y) <= dist2(x.x, x.y, enemyCore.x, enemyCore.y)))
    .sort((a, b) => dist2(a.x, a.y, core.x, core.y) - dist2(b.x, b.y, core.x, core.y)
      || side(core, enemyCore, a) - side(core, enemyCore, b) || a.id.localeCompare(b.id));
  if (sites[0]) return { key: `claim:${sites[0].id}`, cmd: { type: 'claim', units: [], site: sites[0].id } };

  const racks = v.buildings.filter((b) => b.type === 'server_rack').length;
  if (racks < s.racks && v.data >= BUILDINGS.server_rack.cost && !taken.has('new:rack')) {
    const [x, y] = spot(v, core, toward, rng);
    return { key: 'new:rack', cmd: { type: 'build', units: [], building: 'server_rack', x, y } };
  }
  const walls = v.buildings.filter((b) => b.type === 'barricade').length;
  if (faction === 'human' && walls < s.barricades && v.data >= BUILDINGS.barricade.cost && !taken.has('new:wall')) {
    const x = core.x + toward * 9 * TILE;
    const y = core.y + (walls - 1) * 2 * TILE;
    return { key: 'new:wall', cmd: { type: 'build', units: [], building: 'barricade', x, y } };
  }
  return null;
}

/**
 * Which side of the line from our core to the enemy core a site is on. Used as a tie-break so bots on
 * both sides of a symmetric map make mirror-image choices instead of racing for the same site.
 */
function side(core: { x: number; y: number }, enemy: { x: number; y: number } | undefined, s: { x: number; y: number }): number {
  if (!enemy) return 0;
  return Math.sign((enemy.x - core.x) * (s.y - core.y) - (enemy.y - core.y) * (s.x - core.x));
}

function linkDist(l: FactionView['links'][number], sites: Map<string, SiteView>, core: { x: number; y: number }): number {
  const a = sites.get(l.a)!;
  const b = sites.get(l.b)!;
  return Math.min(dist2(a.x, a.y, core.x, core.y), dist2(b.x, b.y, core.x, core.y));
}

/**
 * A spot guarding our most exposed Data source (the one nearest the enemy core), clear of sites and
 * other buildings. Falls back to the front of our core.
 */
function defenseSpot(v: FactionView, faction: Faction, core: { x: number; y: number }, toward: number): [number, number] | null {
  const enemyCore = v.sites.find((x) => x.kind === 'core' && !(x.x === core.x && x.y === core.y));
  const guarded = (x: number, y: number) => v.buildings.some((b) => b.type === DEFENSE[faction] && dist2(b.x, b.y, x, y) < (5 * TILE) ** 2);
  const exposed = v.sites
    .filter((x) => x.kind === 'data_source' && x.owner === faction && !guarded(x.x, x.y))
    .sort((a, b) => (enemyCore ? dist2(a.x, a.y, enemyCore.x, enemyCore.y) - dist2(b.x, b.y, enemyCore.x, enemyCore.y) : 0) || a.id.localeCompare(b.id));
  const anchors = [...exposed.map((x) => [x.x, x.y] as const), [core.x + toward * 4 * TILE, core.y] as const];
  for (const [ax, ay] of anchors) {
    for (const [dx, dy] of [[toward * 2, 0], [0, 2], [0, -2], [-toward * 2, 0]]) {
      const x = ax + dx! * TILE;
      const y = ay + dy! * TILE;
      if (clearOf(v, x, y, 2)) return [x, y];
    }
  }
  return null;
}

function clearOf(v: FactionView, x: number, y: number, tiles = 3): boolean {
  return v.buildings.every((b) => dist2(b.x, b.y, x, y) > (tiles * TILE) ** 2)
    && v.sites.every((s) => dist2(s.x, s.y, x, y) > (tiles * TILE) ** 2);
}

/** A building spot behind the core, away from sites and other buildings. */
function spot(v: FactionView, core: { x: number; y: number }, toward: number, rng: Rng): [number, number] {
  for (let i = 0; i < 20; i++) {
    const x = core.x + (rng.int(-4, 1) * toward) * TILE;
    const y = core.y + rng.int(-6, 6) * TILE;
    if (clearOf(v, x, y) && x > TILE && y > TILE && x < (v.mapWidth - 1) * TILE && y < (v.mapHeight - 1) * TILE) return [x, y];
  }
  return [core.x - toward * 3 * TILE, core.y + 4 * TILE];
}
