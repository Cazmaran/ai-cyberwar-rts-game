// Ground marks drawn over the objects (iso layer, world units): blackouts, death crosses, map pings.
import type { Graphics } from 'pixi.js';
import { PULL_THE_PLUG, type World } from '../../sim/index.ts';
import { COLORS } from '../draw.ts';
import type { Effects } from '../effects.ts';

export function drawOverlay(g: Graphics, world: World, fx: Effects, now: number): void {
  g.clear();
  for (const b of world.blackouts) {
    if (b.until <= world.tick) continue;
    g.circle(b.x, b.y, PULL_THE_PLUG.radius).fill({ color: COLORS.blackout, alpha: 0.45 }).stroke({ width: 80, color: 0xffffff, alpha: 0.4 });
  }
  for (const d of fx.deaths) {
    const a = Math.max(0, (d.until - now) / 1500);
    g.moveTo(d.x - 400, d.y - 400).lineTo(d.x + 400, d.y + 400).moveTo(d.x + 400, d.y - 400).lineTo(d.x - 400, d.y + 400)
      .stroke({ width: 120, color: d.color, alpha: a });
  }
  for (const p of fx.pings) {
    const t = (p.until - now) / 1000;
    const r = 1500 + ((3 - t) % 1) * 2500;
    g.circle(p.x, p.y, r).stroke({ width: 150, color: p.color, alpha: Math.min(1, t) });
  }
}
