// What a worker is doing, for the UI and LLM controllers: the job, its target, how far along it is,
// whether the worker has arrived and is working, and whether an enemy worker contests the same claim.
// Claim and fiber progress belong to the worker, so a new order resets them; construction progress
// belongs to the building.
import { BUILDINGS, ECONOMY } from './data.ts';
import { dist2, within } from './fixed.ts';
import { TICK_RATE, units, type Unit, type World } from './world.ts';

export interface Job {
  kind: 'claim' | 'link' | 'build';
  /** Site id, link index or building id. */
  target: string;
  /** Where the work happens (site, the link end being worked on, or the building). */
  x: number;
  y: number;
  /** Links only: the far end, so the UI can draw how much of the fiber is lit. */
  toX?: number;
  toY?: number;
  /** True once the worker is in range and making progress (false while walking there). */
  working: boolean;
  /** Percent done. */
  progress: number;
  /** Seconds left at the current rate, or null while walking (or while a claim is contested). */
  seconds: number | null;
  /** Claims only: an enemy worker is claiming the same site, so nobody progresses. */
  contested: boolean;
}

const secs = (ticks: number) => Math.ceil(ticks / TICK_RATE);

export function workerJob(world: World, u: Unit): Job | null {
  const o = u.order;
  if (o.type === 'claim') {
    const s = world.sites.get(o.site);
    if (!s) return null;
    const needed = ECONOMY.claimTicks * (s.owner === null ? 1 : ECONOMY.claimEnemyMultiplier);
    const working = within(u.x, u.y, s.x, s.y, ECONOMY.workRange);
    const contested = units(world).some((e) => e.faction !== u.faction && e.order.type === 'claim'
      && e.order.site === s.id && within(e.x, e.y, s.x, s.y, ECONOMY.workRange));
    return {
      kind: 'claim', target: s.id, x: s.x, y: s.y, working, contested,
      progress: Math.trunc((100 * u.jobProgress) / needed),
      seconds: working && !contested ? secs(needed - u.jobProgress) : null,
    };
  }
  if (o.type === 'lightLink') {
    const l = world.links[o.link];
    if (!l) return null;
    const a = world.sites.get(l.a)!;
    const b = world.sites.get(l.b)!;
    const [end, far] = dist2(u.x, u.y, a.x, a.y) <= dist2(u.x, u.y, b.x, b.y) ? [a, b] : [b, a];
    const working = within(u.x, u.y, end.x, end.y, ECONOMY.workRange);
    return {
      kind: 'link', target: String(l.index), x: end.x, y: end.y, toX: far.x, toY: far.y, working, contested: false,
      progress: Math.trunc((100 * u.jobProgress) / ECONOMY.lightLinkTicks),
      seconds: working ? secs(ECONOMY.lightLinkTicks - u.jobProgress) : null,
    };
  }
  if (o.type === 'build') {
    const bld = world.entities.get(o.building);
    if (!bld || bld.kind !== 'building') return null;
    const stats = BUILDINGS[bld.type];
    const working = within(u.x, u.y, bld.x, bld.y, stats.radius + ECONOMY.workRange);
    const crew = units(world).filter((e) => e.order.type === 'build' && e.order.building === bld.id).length;
    return {
      kind: 'build', target: String(bld.id), x: bld.x, y: bld.y, working, contested: false,
      progress: Math.trunc((100 * bld.buildProgress) / stats.buildWork),
      seconds: working ? secs(Math.ceil((stats.buildWork - bld.buildProgress) / Math.max(1, crew))) : null,
    };
  }
  return null;
}
