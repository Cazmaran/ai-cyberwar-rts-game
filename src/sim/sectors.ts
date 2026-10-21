// Named map sectors (3x3 grid). The text view and high-level orders speak in sectors, not coordinates.
import { TILE } from './fixed.ts';
import type { GameMap } from './map.ts';

export const SECTORS = ['NW', 'N', 'NE', 'W', 'C', 'E', 'SW', 'S', 'SE'] as const;
export type SectorId = (typeof SECTORS)[number];

export function sectorOf(map: GameMap, x: number, y: number): SectorId {
  const col = Math.min(2, Math.max(0, Math.trunc((x * 3) / (map.width * TILE))));
  const row = Math.min(2, Math.max(0, Math.trunc((y * 3) / (map.height * TILE))));
  return SECTORS[row * 3 + col]!;
}

/** Center of a sector in world units. */
export function sectorCenter(map: GameMap, sector: SectorId): [number, number] {
  const i = SECTORS.indexOf(sector);
  const col = i % 3;
  const row = Math.trunc(i / 3);
  return [Math.trunc(((2 * col + 1) * map.width * TILE) / 6), Math.trunc(((2 * row + 1) * map.height * TILE) / 6)];
}
