// All game numbers live here (Tenet 4). Logic files never hard-code stats.
// Units: distances in world units (TILE = 1000), time in ticks (20 per second),
// resources in milli-units (MILLI = 1000). Change DATA_VERSION whenever a number changes.
import { MILLI, TILE } from './fixed.ts';

export const DATA_VERSION = 2;

export type Faction = 'human' | 'ai';
export const FACTIONS: readonly Faction[] = ['human', 'ai'];

/** Rock-paper-scissors roles: fast beats ranged, ranged beats tank, tank beats fast. */
export type Role = 'worker' | 'fast' | 'ranged' | 'tank';

export type UnitTypeId =
  | 'field_engineer' | 'incident_responder' | 'red_team' | 'hardened_server'
  | 'crawler' | 'botnet' | 'exploit' | 'daemon';

export interface UnitStats {
  faction: Faction;
  role: Role;
  hp: number;
  damage: number;
  /** Extra damage percent against a role, e.g. { ranged: 150 } = +150%. */
  bonusVs: Partial<Record<Role, number>>;
  range: number;
  sight: number;
  cooldown: number;
  speed: number;
  /** Data cost (milli). */
  cost: number;
  power: number;
  /** Production work; a building receiving 10 compute per tick (the core's own compute) finishes it in `work / 10` ticks. */
  work: number;
  /** Building that trains this unit. */
  trainedAt: BuildingTypeId;
}

export const UNITS: Record<UnitTypeId, UnitStats> = {
  // Humans: few, expensive, skilled.
  field_engineer: {
    faction: 'human', role: 'worker', hp: 40, damage: 3, bonusVs: {}, range: 1000, sight: 6 * TILE,
    cooldown: 20, speed: 60, cost: 50 * MILLI, power: 1, work: 2000, trainedAt: 'noc',
  },
  incident_responder: {
    faction: 'human', role: 'fast', hp: 60, damage: 8, bonusVs: { ranged: 150 }, range: 1000, sight: 7 * TILE,
    cooldown: 15, speed: 90, cost: 60 * MILLI, power: 1, work: 2500, trainedAt: 'soc',
  },
  red_team: {
    faction: 'human', role: 'ranged', hp: 45, damage: 10, bonusVs: { tank: 200 }, range: 5 * TILE, sight: 7 * TILE,
    cooldown: 30, speed: 55, cost: 75 * MILLI, power: 1, work: 3000, trainedAt: 'soc',
  },
  hardened_server: {
    faction: 'human', role: 'tank', hp: 200, damage: 9, bonusVs: { fast: 150 }, range: 1200, sight: 6 * TILE,
    cooldown: 25, speed: 40, cost: 100 * MILLI, power: 2, work: 4000, trainedAt: 'soc',
  },
  // AI: many, cheap, self-copying processes.
  crawler: {
    faction: 'ai', role: 'worker', hp: 30, damage: 2, bonusVs: {}, range: 1000, sight: 6 * TILE,
    cooldown: 20, speed: 70, cost: 35 * MILLI, power: 1, work: 1400, trainedAt: 'primary_cluster',
  },
  botnet: {
    faction: 'ai', role: 'fast', hp: 35, damage: 5, bonusVs: { ranged: 150 }, range: 900, sight: 6 * TILE,
    cooldown: 12, speed: 95, cost: 35 * MILLI, power: 1, work: 1500, trainedAt: 'training_cluster',
  },
  exploit: {
    faction: 'ai', role: 'ranged', hp: 30, damage: 7, bonusVs: { tank: 200 }, range: 4500, sight: 7 * TILE,
    cooldown: 30, speed: 55, cost: 45 * MILLI, power: 1, work: 1800, trainedAt: 'training_cluster',
  },
  daemon: {
    faction: 'ai', role: 'tank', hp: 130, damage: 6, bonusVs: { fast: 150 }, range: 1200, sight: 6 * TILE,
    cooldown: 25, speed: 40, cost: 65 * MILLI, power: 1, work: 2600, trainedAt: 'training_cluster',
  },
};

export type BuildingTypeId = 'noc' | 'primary_cluster' | 'soc' | 'training_cluster' | 'server_rack' | 'firewall';

export interface BuildingStats {
  faction: Faction | 'any';
  hp: number;
  sight: number;
  /** Footprint radius (world units). */
  radius: number;
  cost: number;
  /** Construction work done by workers (1 per worker per tick). */
  buildWork: number;
  /** Power supplied (+) or drawn (-). */
  power: number;
  compute: number;
  /** Blocks enemy unit movement (Firewall). */
  blocksEnemies: boolean;
}

export const BUILDINGS: Record<BuildingTypeId, BuildingStats> = {
  noc: { faction: 'human', hp: 1500, sight: 8 * TILE, radius: 1500, cost: 0, buildWork: 0, power: 15, compute: 10, blocksEnemies: false },
  primary_cluster: { faction: 'ai', hp: 1500, sight: 8 * TILE, radius: 1500, cost: 0, buildWork: 0, power: 15, compute: 10, blocksEnemies: false },
  soc: { faction: 'human', hp: 600, sight: 6 * TILE, radius: 1000, cost: 120 * MILLI, buildWork: 400, power: -1, compute: 0, blocksEnemies: false },
  training_cluster: { faction: 'ai', hp: 600, sight: 6 * TILE, radius: 1000, cost: 120 * MILLI, buildWork: 400, power: -1, compute: 0, blocksEnemies: false },
  server_rack: { faction: 'any', hp: 300, sight: 4 * TILE, radius: 700, cost: 100 * MILLI, buildWork: 300, power: -2, compute: 5, blocksEnemies: false },
  firewall: { faction: 'human', hp: 400, sight: 3 * TILE, radius: 600, cost: 40 * MILLI, buildWork: 150, power: 0, compute: 0, blocksEnemies: true },
};

export const START = {
  data: 200 * MILLI,
  workers: 3,
};

export const ECONOMY = {
  /** Ticks for a worker to claim a neutral site; enemy-owned sites take `claimEnemyMultiplier` times longer. */
  claimTicks: 100,
  claimEnemyMultiplier: 2,
  /** Ticks for a worker to light (activate) a dark-fiber link. */
  lightLinkTicks: 60,
  /** Worker must be within this distance of a site or link endpoint to work on it. */
  workRange: 1500,
  /** Power supplied by an owned substation. */
  substationPower: 20,
};

export const PULL_THE_PLUG = {
  radius: 4 * TILE,
  duration: 100,
  cooldown: 1200,
};

export const ADAPTATION = {
  /** Deaths considered for retraining (most recent N). */
  window: 10,
  /** Ticks between the end of one retraining run and the start of the next. */
  retrainTicks: 400,
  /** Ticks a retraining run takes; the new resistances apply when it finishes. */
  retrainDuration: 200,
  /** Percent of AI compute consumed while a retraining run is active. */
  retrainComputeCost: 50,
  /** Resistance gained per recent death to a unit type (percent). */
  perDeath: 5,
  /** Hard cap on resistance to any one unit type (percent). */
  cap: 40,
  /** Resistance lost per retraining run for unit types absent from the window (percent). */
  decay: 5,
};

export const FAIRNESS = {
  /** Max actions per minute for non-human controllers. */
  apm: 120,
  /** Ticks between a non-human decision and when its commands apply. */
  reactionDelay: 10,
};
