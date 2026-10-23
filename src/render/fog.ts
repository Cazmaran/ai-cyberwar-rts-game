// Fog of war, drawn: tiles none of your units or buildings can see right now are shaded. Enemy units
// there are hidden, and sites show what you last knew. Uses the same sight rules as the sim's view.
import type { Graphics } from 'pixi.js';
import { BUILDINGS, TILE, UNITS, within, type FactionView } from '../sim/index.ts';

/** One flag per tile (row-major): 1 if the tile center is in sight of any of your units or finished buildings. */
export function visibleTiles(view: FactionView): Uint8Array {
  const eyes = [
    ...view.units.map((u) => ({ x: u.x, y: u.y, r: UNITS[u.type].sight })),
    ...view.buildings.filter((b) => b.built).map((b) => ({ x: b.x, y: b.y, r: BUILDINGS[b.type].sight })),
  ];
  const out = new Uint8Array(view.mapWidth * view.mapHeight);
  for (let ty = 0; ty < view.mapHeight; ty++) {
    for (let tx = 0; tx < view.mapWidth; tx++) {
      const cx = tx * TILE + TILE / 2;
      const cy = ty * TILE + TILE / 2;
      if (eyes.some((e) => within(cx, cy, e.x, e.y, e.r))) out[ty * view.mapWidth + tx] = 1;
    }
  }
  return out;
}

export function drawFog(g: Graphics, view: FactionView): void {
  const seen = visibleTiles(view);
  for (let ty = 0; ty < view.mapHeight; ty++) {
    for (let tx = 0; tx < view.mapWidth; tx++) {
      if (!seen[ty * view.mapWidth + tx]) g.rect(tx * TILE, ty * TILE, TILE, TILE).fill({ color: 0x000000, alpha: 0.6 });
    }
  }
}
