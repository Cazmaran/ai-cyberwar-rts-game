// Upright unit silhouettes for the object layer (projected units). One look per role so units read
// by shape, not just color: engineer = small round body, fast = hovering arrowhead drone,
// ranged = diamond on a stalk, tank = chunky low block with a turret. Returns the top height.
import type { Graphics } from 'pixi.js';
import type { Role } from '../../sim/index.ts';
import { project } from './camera.ts';
import { isoBox, shade, shadow } from './shapes.ts';

/** Ground-plane point at (forward, side) from (x, y) facing `heading` (radians, world space), projected. */
function at(x: number, y: number, heading: number, fwd: number, side: number, h: number): [number, number] {
  const c = Math.cos(heading);
  const s = Math.sin(heading);
  const [px, py] = project(x + c * fwd - s * side, y + s * fwd + c * side);
  return [px, py - h];
}

export function drawUnit(g: Graphics, role: Role, x: number, y: number, heading: number, color: number, bob: number): number {
  const [px, py] = project(x, y);
  switch (role) {
    case 'worker': {
      shadow(g, x, y, 300);
      g.circle(px, py - 280, 250).fill(shade(color, 0.5));
      g.circle(px - 50, py - 320, 180).fill(color);
      g.circle(px - 90, py - 370, 60).fill({ color: 0xffffff, alpha: 0.35 });
      return 560;
    }
    case 'fast': {
      shadow(g, x, y, 380);
      const h = 420 + bob * 60;
      const pts = (lift: number) => [
        ...at(x, y, heading, 560, 0, lift), ...at(x, y, heading, -380, 420, lift),
        ...at(x, y, heading, -170, 0, lift), ...at(x, y, heading, -380, -420, lift)];
      g.poly(pts(h - 90)).fill(shade(color, 0.45));
      g.poly(pts(h)).fill(color);
      return h + 100;
    }
    case 'ranged': {
      shadow(g, x, y, 320);
      g.rect(px - 45, py - 330, 90, 330).fill(shade(color, 0.4));
      const cy = py - 470;
      // Octahedron: lit top-left, mid top-right, dark underside.
      g.poly([px, cy - 300, px - 260, cy, px, cy + 30]).fill(color);
      g.poly([px, cy - 300, px + 260, cy, px, cy + 30]).fill(shade(color, 0.7));
      g.poly([px - 260, cy, px, cy + 230, px, cy + 30]).fill(shade(color, 0.5));
      g.poly([px + 260, cy, px, cy + 230, px, cy + 30]).fill(shade(color, 0.38));
      return 800;
    }
    case 'tank': {
      shadow(g, x, y, 600);
      isoBox(g, x, y, 430, 430, 260, color);
      isoBox(g, x, y, 220, 220, 150, shade(color, 1.15), 1, 260);
      const [bx, by] = at(x, y, heading, 650, 0, 340);
      g.moveTo(px, py - 340).lineTo(bx, by).stroke({ width: 90, color: shade(color, 0.35) });
      return 480;
    }
  }
}
