// Signal range (proposal 0001, off unless SIGNAL.enabled): hijacked machines need a control link to the
// Model. Signal comes from AI-owned sites, built AI buildings and AI-lit fiber, but not from anything
// inside a blackout. Combat machines won't leave signal; one that loses it flies back (lost-link failsafe).
import { SIGNAL } from './data.ts';
import { dist2, idiv } from './fixed.ts';
import { inBlackout } from './economy.ts';
import type { World } from './world.ts';

interface Coverage { tick: number; points: [number, number][]; segments: [number, number, number, number][] }

// Rebuilt once per tick; kept outside World so it never affects the state hash.
const cache = new WeakMap<World, Coverage>();

function coverage(world: World): Coverage {
  const hit = cache.get(world);
  if (hit && hit.tick === world.tick) return hit;
  const points: [number, number][] = [];
  const segments: [number, number, number, number][] = [];
  const live = (x: number, y: number) => !inBlackout(world, x, y);
  for (const s of world.sites.values()) if (s.owner === 'ai' && live(s.x, s.y)) points.push([s.x, s.y]);
  for (const e of world.entities.values()) {
    if (e.kind === 'building' && e.faction === 'ai' && e.built && live(e.x, e.y)) points.push([e.x, e.y]);
  }
  for (const l of world.links) {
    if (l.owner !== 'ai') continue;
    const a = world.sites.get(l.a)!;
    const b = world.sites.get(l.b)!;
    if (live(a.x, a.y) && live(b.x, b.y)) segments.push([a.x, a.y, b.x, b.y]);
  }
  const c = { tick: world.tick, points, segments };
  cache.set(world, c);
  return c;
}

/** Closest point to (x, y) on the segment a-b, integer math only. */
function closestOnSegment(x: number, y: number, ax: number, ay: number, bx: number, by: number): [number, number] {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = (x - ax) * dx + (y - ay) * dy;
  if (len2 === 0 || t <= 0) return [ax, ay];
  if (t >= len2) return [bx, by];
  return [ax + idiv(dx * t, len2), ay + idiv(dy * t, len2)];
}

/** Nearest point that gives signal, or null if the AI has no signal anywhere. */
export function nearestSignal(world: World, x: number, y: number): [number, number] | null {
  const c = coverage(world);
  let best: [number, number] | null = null;
  let bestD = Infinity;
  const consider = (p: [number, number]) => {
    const d = dist2(x, y, p[0], p[1]);
    if (d < bestD) { bestD = d; best = p; }
  };
  for (const p of c.points) consider(p);
  for (const [ax, ay, bx, by] of c.segments) consider(closestOnSegment(x, y, ax, ay, bx, by));
  return best;
}

export function inSignal(world: World, x: number, y: number): boolean {
  const p = nearestSignal(world, x, y);
  return p !== null && dist2(x, y, p[0], p[1]) <= SIGNAL.range * SIGNAL.range;
}
