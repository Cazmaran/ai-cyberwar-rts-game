// Unit behavior: carry out orders, move, fight, and resolve deaths.
import { ADAPTATION, BUILDINGS, ECONOMY, MOVEMENT, SIGNAL, UNITS, type Faction } from './data.ts';
import { dist2, isqrt, pct, stepToward, within } from './fixed.ts';
import { inBlackout } from './economy.ts';
import { inSignal, leashed, nearestSignal, onAutopilot } from './signal.ts';
import { CORE_BUILDING, type Building, type Entity, type Unit, type World } from './world.ts';

/** Idle and attack-moving units look for targets only every N ticks to keep the sim fast. All units search on
 * the same ticks so neither side spots the other first. */
const ACQUIRE_EVERY = 5;

export function updateUnits(world: World): void {
  // Every unit alive at the start of the tick acts, even if hit earlier this tick: combat resolves
  // simultaneously, so creation order (which faction spawned first) gives no first-strike advantage.
  for (const e of world.entities.values()) {
    if (e.kind !== 'unit') continue;
    // AI processes need power; people don't. A blackout freezes AI units only.
    if (e.faction === 'ai' && inBlackout(world, e.x, e.y)) continue;
    if (e.cooldown > 0) e.cooldown--;
    if (SIGNAL.leash === 'hard' && leashed(e) && !inSignal(world, e.x, e.y, e.id)) { returnToSignal(world, e); continue; }
    runOrder(world, e);
  }
  separate(world);
  resolveDeaths(world);
}

/**
 * Push overlapping units apart. Pushes are computed from positions before any are applied, so the
 * result doesn't depend on processing order. A spatial grid keeps it near-linear in unit count.
 */
function separate(world: World): void {
  const cell = MOVEMENT.spacing;
  const grid = new Map<number, Unit[]>();
  const key = (cx: number, cy: number) => cx * 4096 + cy;
  const list: Unit[] = [];
  for (const e of world.entities.values()) {
    if (e.kind !== 'unit' || e.hp <= 0) continue;
    list.push(e);
    const k = key(Math.trunc(e.x / cell), Math.trunc(e.y / cell));
    const bucket = grid.get(k);
    if (bucket) bucket.push(e); else grid.set(k, [e]);
  }
  const push = new Map<number, [number, number]>();
  for (const u of list) {
    const cx = Math.trunc(u.x / cell);
    const cy = Math.trunc(u.y / cell);
    let px = 0;
    let py = 0;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (const o of grid.get(key(cx + dx, cy + dy)) ?? []) {
          if (o === u) continue;
          const d2 = dist2(u.x, u.y, o.x, o.y);
          if (d2 >= MOVEMENT.spacing * MOVEMENT.spacing) continue;
          const d = isqrt(d2);
          const overlap = Math.trunc((MOVEMENT.spacing - d) / 2);
          if (d === 0) {
            // Exactly stacked: split along a direction fixed by the pair's ids.
            const s = u.id < o.id ? -1 : 1;
            const turn = (Math.min(u.id, o.id) * 7 + Math.max(u.id, o.id)) % 4;
            px += s * overlap * (turn === 0 ? 1 : turn === 2 ? -1 : 0);
            py += s * overlap * (turn === 1 ? 1 : turn === 3 ? -1 : 0);
          } else {
            px += Math.trunc(((u.x - o.x) * overlap) / d);
            py += Math.trunc(((u.y - o.y) * overlap) / d);
          }
        }
      }
    }
    if (px !== 0 || py !== 0) push.set(u.id, [px, py]);
  }
  const maxX = world.map.width * 1000;
  const maxY = world.map.height * 1000;
  for (const u of list) {
    const p = push.get(u.id);
    if (!p) continue;
    const len = isqrt(p[0] * p[0] + p[1] * p[1]);
    const scale = len > MOVEMENT.maxPush ? MOVEMENT.maxPush : len;
    const nx = u.x + (len === 0 ? 0 : Math.trunc((p[0] * scale) / len));
    const ny = u.y + (len === 0 ? 0 : Math.trunc((p[1] * scale) / len));
    // Never push a unit into an enemy Barricade.
    if (blockingBarricade(world, u.faction, nx, ny)) continue;
    u.x = Math.max(0, Math.min(maxX, nx));
    u.y = Math.max(0, Math.min(maxY, ny));
  }
}

function runOrder(world: World, u: Unit): void {
  const o = u.order;
  switch (o.type) {
    case 'idle': {
      const t = currentTarget(world, u);
      if (t) engage(world, u, t);
      return;
    }
    case 'move':
      if (arrived(world, u, o.x, o.y) || moveTo(world, u, o.x, o.y)) u.order = { type: 'idle' };
      return;
    case 'attackMove': {
      const t = currentTarget(world, u);
      if (t) engage(world, u, t);
      else if (arrived(world, u, o.x, o.y) || moveTo(world, u, o.x, o.y)) u.order = { type: 'idle' };
      return;
    }
    case 'attack': {
      const t = world.entities.get(o.target);
      if (!t || t.hp <= 0 || t.faction === u.faction) { u.order = { type: 'idle' }; return; }
      engage(world, u, t);
      return;
    }
    case 'build': {
      const b = world.entities.get(o.building);
      if (!b || b.kind !== 'building' || b.built || b.faction !== u.faction) { u.order = { type: 'idle' }; return; }
      const reach = BUILDINGS[b.type].radius + ECONOMY.workRange;
      if (!within(u.x, u.y, b.x, b.y, reach)) { moveTo(world, u, b.x, b.y, reach); return; }
      b.buildProgress++;
      if (b.buildProgress >= BUILDINGS[b.type].buildWork) { b.built = true; u.order = { type: 'idle' }; }
      return;
    }
    case 'claim': {
      const s = world.sites.get(o.site);
      if (!s || s.owner === u.faction || s.kind === 'core') { u.order = { type: 'idle' }; u.jobProgress = 0; return; }
      if (!within(u.x, u.y, s.x, s.y, ECONOMY.workRange)) { moveTo(world, u, s.x, s.y, ECONOMY.workRange); return; }
      // Contested: while an enemy worker is also claiming this site in range, nobody makes progress.
      if (contested(world, u, s.id, s.x, s.y)) return;
      const needed = ECONOMY.claimTicks * (s.owner === null ? 1 : ECONOMY.claimEnemyMultiplier);
      if (++u.jobProgress >= needed) { s.owner = u.faction; u.order = { type: 'idle' }; u.jobProgress = 0; }
      return;
    }
    case 'lightLink': {
      const l = world.links[o.link];
      if (!l || l.owner === u.faction) { u.order = { type: 'idle' }; u.jobProgress = 0; return; }
      const a = world.sites.get(l.a)!;
      const b = world.sites.get(l.b)!;
      const end = dist2(u.x, u.y, a.x, a.y) <= dist2(u.x, u.y, b.x, b.y) ? a : b;
      if (!within(u.x, u.y, end.x, end.y, ECONOMY.workRange)) { moveTo(world, u, end.x, end.y, ECONOMY.workRange); return; }
      if (++u.jobProgress >= ECONOMY.lightLinkTicks) { l.owner = u.faction; u.order = { type: 'idle' }; u.jobProgress = 0; }
      return;
    }
  }
}

/**
 * A group sent to one point can't all stand on it. A unit has arrived once it is within one spacing of
 * the point, or near it and touching a friendly unit that has already stopped there.
 */
function arrived(world: World, u: Unit, x: number, y: number): boolean {
  const s = MOVEMENT.spacing;
  if (u.x === x && u.y === y) return false; // moveTo finishes exact arrivals
  if (within(u.x, u.y, x, y, s)) return true;
  if (!within(u.x, u.y, x, y, 4 * s)) return false;
  for (const e of world.entities.values()) {
    if (e.kind === 'unit' && e !== u && e.faction === u.faction && e.order.type === 'idle' && within(u.x, u.y, e.x, e.y, s)) return true;
  }
  return false;
}

function contested(world: World, u: Unit, site: string, x: number, y: number): boolean {
  for (const e of world.entities.values()) {
    if (e.kind === 'unit' && e.faction !== u.faction && e.hp > 0 && e.order.type === 'claim' && e.order.site === site
      && within(e.x, e.y, x, y, ECONOMY.workRange)) return true;
  }
  return false;
}

/** Keep the current auto-target while it is alive and in sight; otherwise periodically look for a new one. */
function currentTarget(world: World, u: Unit): Entity | null {
  if (UNITS[u.type].role === 'worker') return null;
  if (u.target !== null) {
    const t = world.entities.get(u.target);
    if (t && t.hp > 0 && within(u.x, u.y, t.x, t.y, UNITS[u.type].sight + reachOf(t))) return t;
    u.target = null;
  }
  if (world.tick % ACQUIRE_EVERY !== 0) return null;
  const t = acquire(world, u);
  u.target = t ? t.id : null;
  return t;
}

/** Nearest visible enemy unit, else nearest visible enemy building. */
function acquire(world: World, u: Unit): Entity | null {
  const sight = UNITS[u.type].sight;
  let bestUnit: Entity | null = null;
  let bestUnitD = Infinity;
  let bestBld: Entity | null = null;
  let bestBldD = Infinity;
  for (const e of world.entities.values()) {
    if (e.faction === u.faction || e.hp <= 0) continue;
    const d = dist2(u.x, u.y, e.x, e.y);
    if (d > sight * sight) continue;
    if (e.kind === 'unit') { if (d < bestUnitD) { bestUnitD = d; bestUnit = e; } }
    else if (d < bestBldD) { bestBldD = d; bestBld = e; }
  }
  return bestUnit ?? bestBld;
}

function reachOf(target: Entity): number {
  return target.kind === 'building' ? BUILDINGS[target.type].radius : 0;
}

/** Fire if in range, otherwise close the distance. */
function engage(world: World, u: Unit, t: Entity): void {
  const range = UNITS[u.type].range + reachOf(t);
  if (within(u.x, u.y, t.x, t.y, range)) fire(world, u, t);
  else moveTo(world, u, t.x, t.y, range);
}

function fire(world: World, u: Unit, t: Entity): void {
  if (u.cooldown > 0) return;
  const stats = UNITS[u.type];
  let dmg = stats.damage;
  if (onAutopilot(world, u)) dmg = pct(dmg, SIGNAL.autopilotDamage);
  if (t.kind === 'unit') {
    dmg += pct(dmg, stats.bonusVs[UNITS[t.type].role] ?? 0);
    dmg -= pct(dmg, t.resist[u.type] ?? 0);
    t.lastHitBy = u.type;
  }
  t.hp -= Math.max(1, dmg);
  u.cooldown = stats.cooldown;
}

/**
 * Step toward (x, y) until within `stopAt`. Returns true when arrived.
 * An enemy Barricade in the way stops movement; the unit attacks it instead (it must be breached).
 */
function moveTo(world: World, u: Unit, x: number, y: number, stopAt = 0): boolean {
  if (stopAt > 0 ? within(u.x, u.y, x, y, stopAt) : u.x === x && u.y === y) return true;
  const speed = onAutopilot(world, u) ? pct(UNITS[u.type].speed, SIGNAL.autopilotSpeed) : UNITS[u.type].speed;
  const [nx, ny] = stepToward(u.x, u.y, x, y, speed);
  // Hard leash: a machine on the Model's link won't fly out of signal range.
  if (SIGNAL.leash === 'hard' && leashed(u) && !inSignal(world, nx, ny, u.id) && inSignal(world, u.x, u.y, u.id)) return false;
  const wall = blockingBarricade(world, u.faction, nx, ny);
  if (wall) { engage(world, u, wall); return false; }
  u.x = nx;
  u.y = ny;
  return stopAt > 0 ? within(u.x, u.y, x, y, stopAt) : u.x === x && u.y === y;
}

/** Lost-link failsafe: fly straight back toward the nearest signal, ignoring orders. */
function returnToSignal(world: World, u: Unit): void {
  const p = nearestSignal(world, u.x, u.y);
  if (!p) return;
  [u.x, u.y] = stepToward(u.x, u.y, p[0], p[1], UNITS[u.type].speed);
}

function blockingBarricade(world: World, faction: Faction, x: number, y: number): Building | null {
  for (const e of world.entities.values()) {
    if (e.kind !== 'building' || e.faction === faction || !e.built || e.hp <= 0) continue;
    const stats = BUILDINGS[e.type];
    if (stats.blocksEnemies && within(x, y, e.x, e.y, stats.radius)) return e;
  }
  return null;
}

function resolveDeaths(world: World): void {
  for (const [id, e] of world.entities) {
    if (e.hp > 0) continue;
    world.entities.delete(id);
    if (e.kind === 'unit' && e.faction === 'ai' && e.lastHitBy) {
      const deaths = world.factions.ai.recentDeaths;
      deaths.push(e.lastHitBy);
      if (deaths.length > ADAPTATION.window) deaths.splice(0, deaths.length - ADAPTATION.window);
    }
    if (e.kind === 'building' && e.type === CORE_BUILDING[e.faction] && world.winner === null) {
      world.winner = e.faction === 'human' ? 'ai' : 'human';
    }
  }
}
