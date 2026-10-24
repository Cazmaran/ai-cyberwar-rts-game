// The object layer: buildings, units and site markers drawn upright at their projected spot, painted
// back to front by depth (x + y), then a top pass for shot lines, hit flashes, job markers and bars.
import type { Graphics } from 'pixi.js';
import { BUILDINGS, dist2, TILE, UNITS, type BuildingView, type FactionView, type SiteView, type UnitView } from '../../sim/index.ts';
import type { Effects } from '../effects.ts';
import { drawBuilding } from './buildings.ts';
import { project } from './camera.ts';
import { factionColor } from './ground.ts';
import { bar, isoBox } from './shapes.ts';
import { drawUnit } from './units.ts';

type Item = { d: number; kind: 0; e: BuildingView; mine: boolean } | { d: number; kind: 1; e: UnitView; mine: boolean } | { d: number; kind: 2; e: SiteView };

/** Painter's order: smaller x + y is further from the camera, so it draws first. */
export function depthOrder<T extends { d: number }>(items: T[]): T[] {
  return items.sort((a, b) => a.d - b.d);
}

/** Remembers which way each unit last moved, so drones and tank barrels face their travel. */
export type Headings = Map<number, { x: number; y: number; h: number }>;

function heading(hs: Headings, u: UnitView, fallback: number): number {
  const prev = hs.get(u.id);
  if (!prev) { hs.set(u.id, { x: u.x, y: u.y, h: fallback }); return fallback; }
  const dx = u.x - prev.x;
  const dy = u.y - prev.y;
  if (dx * dx + dy * dy > 40 * 40) { prev.h = Math.atan2(dy, dx); prev.x = u.x; prev.y = u.y; }
  return prev.h;
}

export function drawObjects(g: Graphics, view: FactionView, selected: Set<number>, fx: Effects, seen: Uint8Array, hs: Headings, now: number): void {
  g.clear();
  const enemy = view.faction === 'human' ? 'ai' : 'human';
  const items: Item[] = [];
  for (const b of view.buildings) items.push({ d: b.x + b.y, kind: 0, e: b, mine: true });
  for (const b of view.enemyBuildings) items.push({ d: b.x + b.y, kind: 0, e: b, mine: false });
  for (const u of view.units) items.push({ d: u.x + u.y, kind: 1, e: u, mine: true });
  for (const u of view.enemyUnits) items.push({ d: u.x + u.y, kind: 1, e: u, mine: false });
  for (const s of view.sites) if (s.kind === 'data_source' || s.kind === 'router') items.push({ d: s.x + s.y, kind: 2, e: s });

  // Body centers (projected) for shots, flashes and bars in the top pass.
  const tops = new Map<number, { px: number; py: number; h: number }>();
  const live = new Set<number>();
  for (const it of depthOrder(items)) {
    if (it.kind === 2) {
      const s = it.e;
      const tx = Math.floor(s.x / TILE);
      const ty = Math.floor(s.y / TILE);
      const alpha = seen[ty * view.mapWidth + tx] ? 1 : 0.5;
      const c = factionColor(s.owner);
      if (s.kind === 'data_source') isoBox(g, s.x, s.y, 180, 180, 520, c, alpha);
      else isoBox(g, s.x, s.y, 260, 260, 220, c, alpha);
      continue;
    }
    const [px, py] = project(it.e.x, it.e.y);
    const color = factionColor(it.mine ? view.faction : enemy);
    if (it.kind === 0) {
      tops.set(it.e.id, { px, py, h: drawBuilding(g, it.e, color, it.mine, now) });
    } else {
      live.add(it.e.id);
      const facing = (it.mine ? view.faction : enemy) === 'human' ? 0 : Math.PI;
      const bob = Math.sin(now / 220 + it.e.id);
      tops.set(it.e.id, { px, py, h: drawUnit(g, it.e.role, it.e.x, it.e.y, heading(hs, it.e, facing), color, bob) });
    }
  }
  for (const id of hs.keys()) if (!live.has(id)) hs.delete(id);

  // Shot lines between bodies, for units in range of their target (same rule as effects.ts).
  const byId = new Map<number, { x: number; y: number }>();
  for (const e of [...view.units, ...view.enemyUnits, ...view.buildings, ...view.enemyBuildings]) byId.set(e.id, e);
  for (const [list, color] of [[view.units, 0x9fd0ff], [view.enemyUnits, 0xffc29a]] as const) {
    for (const u of list) {
      if (u.target === null) continue;
      const t = byId.get(u.target);
      const a = tops.get(u.id);
      const b = tops.get(u.target);
      if (!t || !a || !b) continue;
      const reach = UNITS[u.type].range + 1800;
      if (dist2(u.x, u.y, t.x, t.y) > reach * reach) continue;
      g.moveTo(a.px, a.py - a.h * 0.6).lineTo(b.px, b.py - b.h * 0.5).stroke({ width: 50, color, alpha: 0.6 });
    }
  }
  for (const [id] of fx.flashes) {
    const t = tops.get(id);
    if (t) g.circle(t.px, t.py - t.h * 0.5, 420).fill({ color: 0xffffff, alpha: 0.5 });
  }

  // Worker job markers over heads: yellow dot when idle, a progress bar while working.
  for (const u of view.units) {
    const t = tops.get(u.id);
    if (u.role !== 'worker' || !t) continue;
    if (!u.job) g.circle(t.px, t.py - t.h - 250, 150).fill({ color: 0xffd866, alpha: 0.9 });
    else if (u.job.working) bar(g, t.px, t.py - t.h - 250, 900, u.job.progress, 100, u.job.contested ? 0xff7a59 : 0x7fd4ff);
  }

  // Health: selected or damaged units, every building; plus build and training progress on yours.
  for (const u of [...view.units, ...view.enemyUnits]) {
    const t = tops.get(u.id);
    if (t && (selected.has(u.id) || u.hp < u.maxHp)) bar(g, t.px, t.py - t.h - 480, 1000, u.hp, u.maxHp);
  }
  for (const b of [...view.buildings, ...view.enemyBuildings]) {
    const t = tops.get(b.id);
    if (!t) continue;
    const w = BUILDINGS[b.type].radius * 1.6;
    bar(g, t.px, t.py - t.h - 450, w, b.hp, b.maxHp);
    const mine = view.buildings.includes(b);
    if (!b.built && mine) bar(g, t.px, t.py - t.h - 220, w, b.buildProgress, BUILDINGS[b.type].buildWork, 0x9fb3c8);
    const next = b.queue[0];
    if (b.built && next && mine) bar(g, t.px, t.py - t.h - 220, w, b.progress, UNITS[next].work, 0x7fd4ff);
  }
}
