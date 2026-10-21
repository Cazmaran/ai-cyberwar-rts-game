import { BUILDINGS, DATA_VERSION, FACTIONS, START, UNITS, type BuildingTypeId, type Faction, type UnitTypeId } from './data.ts';
import { TILE } from './fixed.ts';
import type { GameMap, SiteKind } from './map.ts';
import { createRng, type Rng } from './rng.ts';

/** Simulation ticks per second. Rendering runs independently of this. */
export const TICK_RATE = 20;

export const GAME_VERSION = '0.1.0';
export { DATA_VERSION };

export type Order =
  | { type: 'idle' }
  | { type: 'move'; x: number; y: number }
  | { type: 'attackMove'; x: number; y: number }
  | { type: 'attack'; target: number }
  | { type: 'build'; building: number }
  | { type: 'claim'; site: string }
  | { type: 'lightLink'; link: number };

export interface Unit {
  id: number;
  kind: 'unit';
  type: UnitTypeId;
  faction: Faction;
  x: number;
  y: number;
  hp: number;
  order: Order;
  cooldown: number;
  /** Progress on the current claim / light-link job (ticks). */
  jobProgress: number;
  /** Resistance percent per attacker type, fixed at spawn (the model version it was trained with). */
  resist: Partial<Record<UnitTypeId, number>>;
  /** Type of the last unit that damaged this one (feeds AI Adaptation). */
  lastHitBy: UnitTypeId | null;
  /** Auto-acquired target while idle or attack-moving. */
  target: number | null;
}

export interface Building {
  id: number;
  kind: 'building';
  type: BuildingTypeId;
  faction: Faction;
  x: number;
  y: number;
  hp: number;
  built: boolean;
  buildProgress: number;
  queue: UnitTypeId[];
  progress: number;
  /** Rally point for trained units. */
  rallyX: number;
  rallyY: number;
}

export type Entity = Unit | Building;

export interface Site {
  id: string;
  kind: SiteKind;
  x: number;
  y: number;
  owner: Faction | null;
  rate: number;
}

export interface Link {
  index: number;
  a: string;
  b: string;
  bandwidth: number;
  /** Faction operating this link; null = dark fiber. */
  owner: Faction | null;
}

export interface FactionState {
  data: number;
  /** Tick when Pull the Plug is ready again (humans). */
  plugReadyAt: number;
  /** Adaptation (AI): recent deaths by killer type, oldest first. */
  recentDeaths: UnitTypeId[];
  resist: Partial<Record<UnitTypeId, number>>;
  nextRetrainAt: number;
  retrainingUntil: number;
  /** Derived each tick by the economy system. */
  powerCap: number;
  powerUsed: number;
  compute: number;
  income: number;
}

export interface Blackout {
  x: number;
  y: number;
  until: number;
}

export interface World {
  readonly seed: number;
  readonly map: GameMap;
  tick: number;
  rng: Rng;
  nextId: number;
  entities: Map<number, Entity>;
  sites: Map<string, Site>;
  links: Link[];
  factions: Record<Faction, FactionState>;
  blackouts: Blackout[];
  winner: Faction | null;
}

function newFactionState(): FactionState {
  return {
    data: START.data, plugReadyAt: 0, recentDeaths: [], resist: {}, nextRetrainAt: 0, retrainingUntil: 0,
    powerCap: 0, powerUsed: 0, compute: 0, income: 0,
  };
}

export const CORE_BUILDING: Record<Faction, BuildingTypeId> = { human: 'noc', ai: 'primary_cluster' };
export const WORKER: Record<Faction, UnitTypeId> = { human: 'field_engineer', ai: 'crawler' };

export function createWorld(seed: number, map: GameMap): World {
  const world: World = {
    seed, map, tick: 0, rng: createRng(seed), nextId: 1,
    entities: new Map(),
    sites: new Map(),
    links: map.links.map((l, index) => ({ index, a: l.a, b: l.b, bandwidth: l.bandwidth, owner: null })),
    factions: { human: newFactionState(), ai: newFactionState() },
    blackouts: [],
    winner: null,
  };
  for (const s of map.sites) {
    world.sites.set(s.id, { id: s.id, kind: s.kind, x: s.x * TILE, y: s.y * TILE, owner: s.owner ?? null, rate: s.rate ?? 0 });
  }
  for (const faction of FACTIONS) {
    const core = [...world.sites.values()].find((s) => s.kind === 'core' && s.owner === faction);
    if (!core) throw new Error(`map ${map.id} has no core for ${faction}`);
    const b = spawnBuilding(world, CORE_BUILDING[faction], faction, core.x, core.y);
    b.built = true;
    for (let i = 0; i < START.workers; i++) {
      spawnUnit(world, WORKER[faction], faction, core.x + (i - 1) * TILE, core.y + 2 * TILE);
    }
  }
  return world;
}

export function spawnUnit(world: World, type: UnitTypeId, faction: Faction, x: number, y: number): Unit {
  const unit: Unit = {
    id: world.nextId++, kind: 'unit', type, faction, x, y, hp: UNITS[type].hp,
    order: { type: 'idle' }, cooldown: 0, jobProgress: 0, resist: { ...world.factions[faction].resist }, lastHitBy: null, target: null,
  };
  world.entities.set(unit.id, unit);
  return unit;
}

export function spawnBuilding(world: World, type: BuildingTypeId, faction: Faction, x: number, y: number): Building {
  const b: Building = {
    id: world.nextId++, kind: 'building', type, faction, x, y, hp: BUILDINGS[type].hp,
    built: false, buildProgress: 0, queue: [], progress: 0, rallyX: x, rallyY: y + 2 * TILE,
  };
  world.entities.set(b.id, b);
  return b;
}

export function units(world: World): Unit[] {
  const out: Unit[] = [];
  for (const e of world.entities.values()) if (e.kind === 'unit') out.push(e);
  return out;
}

export function buildings(world: World): Building[] {
  const out: Building[] = [];
  for (const e of world.entities.values()) if (e.kind === 'building') out.push(e);
  return out;
}

export function coreOf(world: World, faction: Faction): Building | undefined {
  return buildings(world).find((b) => b.faction === faction && b.type === CORE_BUILDING[faction]);
}

/** FNV-1a fingerprint of the full world state; identical for identical seeds and commands. */
export function hashWorld(world: World): string {
  const state = JSON.stringify({
    tick: world.tick, rng: world.rng.state(), nextId: world.nextId,
    entities: [...world.entities.values()], sites: [...world.sites.values()], links: world.links,
    factions: world.factions, blackouts: world.blackouts, winner: world.winner,
  });
  let h = 0x811c9dc5;
  for (let i = 0; i < state.length; i++) {
    h ^= state.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `${world.tick}:${(h >>> 0).toString(16).padStart(8, '0')}`;
}
