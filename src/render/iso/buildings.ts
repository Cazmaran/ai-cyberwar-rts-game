// Upright buildings for the object layer: iso blocks sized by footprint, height by type (cores
// tallest). Unfinished buildings are see-through and grow with construction. Returns the top height.
import type { Graphics } from 'pixi.js';
import { BUILDINGS, type BuildingView } from '../../sim/index.ts';
import { project } from './camera.ts';
import { isoBox, shade, shadow } from './shapes.ts';

export function drawBuilding(g: Graphics, b: BuildingView, color: number, mine: boolean, now: number): number {
  const r = BUILDINGS[b.type].radius;
  const alpha = b.built ? 1 : 0.45;
  // Own construction shows as the block rising; enemy progress is unknown, so it stays half height.
  const grow = b.built ? 1 : mine ? 0.2 + 0.8 * Math.min(1, b.buildProgress / Math.max(1, BUILDINGS[b.type].buildWork)) : 0.5;
  const [px, py] = project(b.x, b.y);
  switch (b.type) {
    case 'noc':
    case 'primary_cluster': {
      const h = 2300 * grow;
      isoBox(g, b.x, b.y, r * 0.95, r * 0.95, 280, shade(color, 0.6), alpha);
      isoBox(g, b.x, b.y, r * 0.7, r * 0.7, h, color, alpha, 280);
      isoBox(g, b.x, b.y, r * 0.45, r * 0.45, 260, shade(color, 1.25), alpha, 280 + h);
      // Lit floor bands on the right face.
      const [ax, ay] = project(b.x + r * 0.7, b.y - r * 0.7);
      const [fx, fy] = project(b.x + r * 0.7, b.y + r * 0.7);
      for (let k = 1; k <= 4; k++) {
        const z = 280 + (h * k) / 5;
        g.moveTo(ax, ay - z).lineTo(fx, fy - z);
      }
      g.stroke({ width: 50, color: 0xffffff, alpha: 0.25 * alpha });
      return 280 + h + 260;
    }
    case 'soc':
    case 'training_cluster': {
      const h = 1100 * grow;
      isoBox(g, b.x, b.y, r * 0.85, r * 0.85, h, color, alpha);
      isoBox(g, b.x - r * 0.3, b.y - r * 0.3, r * 0.3, r * 0.3, 300, shade(color, 1.2), alpha, h);
      return h + 300;
    }
    case 'server_rack': {
      const h = 1300 * grow;
      isoBox(g, b.x, b.y, r * 0.45, r * 0.8, h, shade(color, 0.85), alpha);
      // Status LEDs down the front face.
      const blink = Math.floor(now / 400) % 3;
      for (let k = 0; k < 4; k++) {
        const [lx, ly] = project(b.x + r * 0.2 - k * r * 0.2, b.y + r * 0.8);
        g.rect(lx - 50, ly - h * 0.75, 100, 80).fill({ color: k % 3 === blink ? 0x9dffb0 : 0x2b6b3a, alpha });
      }
      return h;
    }
    case 'barricade':
      shadow(g, b.x, b.y, r * 0.8);
      isoBox(g, b.x, b.y, r / 3, r, 480 * grow, shade(color, 0.8), alpha);
      return 480;
    case 'security_post':
    case 'sentry_gun': {
      isoBox(g, b.x, b.y, r * 0.6, r * 0.6, 500 * grow, shade(color, 0.75), alpha);
      if (b.built) {
        isoBox(g, b.x, b.y, r * 0.35, r * 0.35, 300, color, alpha, 500);
        g.moveTo(px, py - 650).lineTo(px - 450, py - 820).stroke({ width: 80, color: shade(color, 0.35) });
      }
      return 800;
    }
    case 'signal_relay': {
      isoBox(g, b.x, b.y, r * 0.45, r * 0.45, 160, shade(color, 0.7), alpha);
      const h = 1700 * grow;
      g.rect(px - 40, py - h, 80, h - 100).fill({ color: shade(color, 0.5), alpha });
      g.circle(px, py - h, 150).fill({ color, alpha: alpha * (0.7 + 0.3 * Math.sin(now / 250)) });
      return h + 150;
    }
  }
}
