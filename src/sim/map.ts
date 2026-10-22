// Data-driven map format. Maps are plain data so contributors (and agents) can add them without touching logic.
import type { Faction } from './data.ts';
import { TILE } from './fixed.ts';

export type SiteKind = 'core' | 'data_source' | 'router' | 'substation';

export interface MapSite {
  id: string;
  kind: SiteKind;
  /** Tile coordinates. */
  x: number;
  y: number;
  /** Cores start owned; everything else starts neutral. */
  owner?: Faction;
  /** Data sources: milli-data produced per tick. */
  rate?: number;
}

export interface MapLink {
  a: string;
  b: string;
  /** Milli-data per tick the link can carry. */
  bandwidth: number;
}

export interface GameMap {
  id: string;
  name: string;
  /** Size in tiles. */
  width: number;
  height: number;
  sites: MapSite[];
  links: MapLink[];
}

/** Mirror a site through the map center (point symmetry), for building fair maps. */
function mirror(map: { width: number; height: number }, s: MapSite, id: string, owner?: Faction): MapSite {
  const out: MapSite = { ...s, id, x: map.width - s.x, y: map.height - s.y };
  if (owner) out.owner = owner;
  else delete out.owner;
  return out;
}

const W = 48;
const H = 32;

/** Human half of the duel map; the AI half is its point mirror. */
const humanHalf: MapSite[] = [
  { id: 'h_core', kind: 'core', x: 6, y: 16, owner: 'human' },
  { id: 'h_router', kind: 'router', x: 12, y: 16 },
  { id: 'h_src_n', kind: 'data_source', x: 9, y: 9, rate: 120 },
  { id: 'h_src_s', kind: 'data_source', x: 9, y: 23, rate: 120 },
  { id: 'h_sub', kind: 'substation', x: 4, y: 6 },
  { id: 'h_router_fwd', kind: 'router', x: 18, y: 10 },
  // Expansions (D-013): extra income for a player who invests in workers, far from the core and hard to defend.
  { id: 'h_exp_n', kind: 'data_source', x: 15, y: 3, rate: 50 },
  { id: 'h_exp_s', kind: 'data_source', x: 15, y: 29, rate: 50 },
];

const toAi = (s: MapSite): MapSite =>
  mirror({ width: W, height: H }, s, s.id.replace(/^h_/, 'a_'), s.kind === 'core' ? 'ai' : undefined);

/** Symmetric 1v1 map: two home bases, two expansions per side, two contested mid data sources, a contested center router. */
export const DUEL_MAP: GameMap = {
  id: 'duel',
  name: 'Duel',
  width: W,
  height: H,
  sites: [
    ...humanHalf,
    ...humanHalf.map(toAi),
    { id: 'mid_router', kind: 'router', x: 24, y: 16 },
    { id: 'mid_src_n', kind: 'data_source', x: 24, y: 6, rate: 200 },
    { id: 'mid_src_s', kind: 'data_source', x: 24, y: 26, rate: 200 },
    { id: 'mid_sub_n', kind: 'substation', x: 30, y: 4 },
    { id: 'mid_sub_s', kind: 'substation', x: 18, y: 28 },
  ],
  links: [
    ...[
      { a: 'h_core', b: 'h_router', bandwidth: 900 },
      { a: 'h_router', b: 'h_src_n', bandwidth: 200 },
      { a: 'h_router', b: 'h_src_s', bandwidth: 200 },
      { a: 'h_router', b: 'h_router_fwd', bandwidth: 300 },
      { a: 'h_router_fwd', b: 'mid_src_n', bandwidth: 250 },
      { a: 'h_router', b: 'mid_router', bandwidth: 300 },
      { a: 'h_router_fwd', b: 'h_exp_n', bandwidth: 150 },
      { a: 'h_router', b: 'h_exp_s', bandwidth: 150 },
    ].flatMap((l) => [l, { a: l.a.replace(/^h_/, 'a_'), b: aiMirrorId(l.b), bandwidth: l.bandwidth }]),
    { a: 'mid_router', b: 'mid_src_n', bandwidth: 250 },
    { a: 'mid_router', b: 'mid_src_s', bandwidth: 250 },
  ],
};

/** Mid sites mirror onto each other; home sites swap prefix. */
function aiMirrorId(id: string): string {
  if (id.startsWith('h_')) return id.replace(/^h_/, 'a_');
  if (id === 'mid_src_n') return 'mid_src_s';
  if (id === 'mid_src_s') return 'mid_src_n';
  return id;
}

export const MAPS: Record<string, GameMap> = { [DUEL_MAP.id]: DUEL_MAP };

export function siteWorldPos(s: MapSite): [number, number] {
  return [s.x * TILE, s.y * TILE];
}
