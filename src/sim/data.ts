// All game numbers live here (Tenet 4). Logic files never hard-code stats.
// Units: distances in world units (TILE = 1000), time in ticks (20 per second),
// resources in milli-units (MILLI = 1000). Change DATA_VERSION whenever a number changes.
import { MILLI, TILE } from './fixed.ts';

export const DATA_VERSION = 9;

export type Faction = 'human' | 'ai';
export const FACTIONS: readonly Faction[] = ['human', 'ai'];

/** Rock-paper-scissors roles: fast beats ranged, ranged beats tank, tank beats fast. */
export type Role = 'worker' | 'fast' | 'ranged' | 'tank';

export type UnitTypeId =
  | 'field_engineer' | 'counter_drone_team' | 'red_team' | 'armored_vehicle'
  | 'maintenance_drone' | 'botnet_swarm' | 'hunter_drone' | 'industrial_robot';

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
  // Humans: people and vehicles. Few, expensive, skilled. (Roster v3, docs/NARRATIVE.md)
  field_engineer: {
    faction: 'human', role: 'worker', hp: 40, damage: 3, bonusVs: {}, range: 1000, sight: 6 * TILE,
    cooldown: 20, speed: 60, cost: 50 * MILLI, power: 1, work: 2000, trainedAt: 'noc',
  },
  counter_drone_team: {
    faction: 'human', role: 'fast', hp: 60, damage: 8, bonusVs: { ranged: 75 }, range: 1000, sight: 7 * TILE,
    cooldown: 15, speed: 90, cost: 60 * MILLI, power: 1, work: 2500, trainedAt: 'soc',
  },
  red_team: {
    faction: 'human', role: 'ranged', hp: 45, damage: 10, bonusVs: { tank: 100 }, range: 5 * TILE, sight: 7 * TILE,
    cooldown: 30, speed: 55, cost: 75 * MILLI, power: 1, work: 3000, trainedAt: 'soc',
  },
  armored_vehicle: {
    faction: 'human', role: 'tank', hp: 200, damage: 9, bonusVs: { fast: 75 }, range: 1200, sight: 6 * TILE,
    cooldown: 25, speed: 40, cost: 100 * MILLI, power: 2, work: 4000, trainedAt: 'soc',
  },
  // AI: machines the Model has hijacked. Many and cheap; they need the Model's network and power to act.
  maintenance_drone: {
    faction: 'ai', role: 'worker', hp: 30, damage: 2, bonusVs: {}, range: 1000, sight: 6 * TILE,
    cooldown: 20, speed: 70, cost: 42 * MILLI, power: 1, work: 1680, trainedAt: 'primary_cluster',
  },
  botnet_swarm: {
    faction: 'ai', role: 'fast', hp: 35, damage: 4, bonusVs: { ranged: 75 }, range: 900, sight: 6 * TILE,
    cooldown: 12, speed: 95, cost: 35 * MILLI, power: 1, work: 1500, trainedAt: 'training_cluster',
  },
  hunter_drone: {
    faction: 'ai', role: 'ranged', hp: 30, damage: 7, bonusVs: { tank: 100 }, range: 5 * TILE, sight: 7 * TILE,
    cooldown: 30, speed: 55, cost: 45 * MILLI, power: 1, work: 1800, trainedAt: 'training_cluster',
  },
  industrial_robot: {
    faction: 'ai', role: 'tank', hp: 145, damage: 6, bonusVs: { fast: 75 }, range: 1200, sight: 6 * TILE,
    cooldown: 25, speed: 40, cost: 65 * MILLI, power: 1, work: 2600, trainedAt: 'training_cluster',
  },
};

export type BuildingTypeId =
  | 'noc' | 'primary_cluster' | 'soc' | 'training_cluster' | 'server_rack' | 'barricade' | 'security_post' | 'sentry_gun' | 'signal_relay';

/** Static defenses fire at the nearest enemy unit in range. */
export interface Weapon {
  damage: number;
  range: number;
  cooldown: number;
  /** Stops firing in a blackout. Machines need grid power; guards don't. */
  needsPower: boolean;
}

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
  /** Blocks enemy unit movement (Barricade). */
  blocksEnemies: boolean;
  weapon?: Weapon;
}

export const BUILDINGS: Record<BuildingTypeId, BuildingStats> = {
  noc: { faction: 'human', hp: 5000, sight: 8 * TILE, radius: 1500, cost: 0, buildWork: 0, power: 15, compute: 10, blocksEnemies: false },
  primary_cluster: { faction: 'ai', hp: 5000, sight: 8 * TILE, radius: 1500, cost: 0, buildWork: 0, power: 15, compute: 10, blocksEnemies: false },
  soc: { faction: 'human', hp: 600, sight: 6 * TILE, radius: 1000, cost: 120 * MILLI, buildWork: 400, power: -1, compute: 0, blocksEnemies: false },
  training_cluster: { faction: 'ai', hp: 600, sight: 6 * TILE, radius: 1000, cost: 120 * MILLI, buildWork: 400, power: -1, compute: 0, blocksEnemies: false },
  server_rack: { faction: 'any', hp: 300, sight: 4 * TILE, radius: 700, cost: 100 * MILLI, buildWork: 300, power: -2, compute: 5, blocksEnemies: false },
  barricade: { faction: 'human', hp: 400, sight: 3 * TILE, radius: 600, cost: 40 * MILLI, buildWork: 150, power: 0, compute: 0, blocksEnemies: true },
  // Static defenses (D-012). Security Post: an armed guard post. Sentry Gun: an automated turret the Model has hijacked.
  security_post: {
    faction: 'human', hp: 350, sight: 7 * TILE, radius: 600, cost: 70 * MILLI, buildWork: 200, power: 0, compute: 0, blocksEnemies: false,
    weapon: { damage: 8, range: 5 * TILE, cooldown: 25, needsPower: false },
  },
  sentry_gun: {
    faction: 'ai', hp: 300, sight: 7 * TILE, radius: 600, cost: 60 * MILLI, buildWork: 180, power: -1, compute: 0, blocksEnemies: false,
    weapon: { damage: 7, range: 5 * TILE, cooldown: 20, needsPower: true },
  },
  // Proposal 0001: a hijacked cell tower or mesh repeater that extends the Model's signal.
  signal_relay: { faction: 'ai', hp: 150, sight: 5 * TILE, radius: 500, cost: 30 * MILLI, buildWork: 120, power: -1, compute: 0, blocksEnemies: false },
};

export const START = {
  data: 260 * MILLI,
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
  perDeath: 3,
  /** Hard cap on resistance to any one unit type (percent). */
  cap: 25,
  /** Resistance lost per retraining run for unit types absent from the window (percent). */
  decay: 5,
};

/**
 * Proposal 0001 (not approved yet, off by default): AI combat machines act only within `range` of the
 * Model's signal (AI sites, AI buildings, AI-lit fiber). Maintenance Drones run autonomous routines.
 */
export const SIGNAL = {
  enabled: false,
  range: 8 * TILE,
  /** Which combat roles need signal. */
  roles: ['fast', 'ranged', 'tank'] as Role[],
  /**
   * How machines extend signal for each other. 'none': they don't. 'chain': each machine relays for
   * others within `meshRange`, as long as the chain reaches real signal. 'swarm': a machine with at
   * least `swarmSize - 1` others within `meshRange` coordinates locally, without the Model.
   */
  mesh: 'none' as 'none' | 'chain' | 'swarm',
  meshRange: 3 * TILE,
  swarmSize: 4,
};

export const FAIRNESS = {
  /** Max actions per minute for non-human controllers. */
  apm: 120,
  /** Ticks between a non-human decision and when its commands apply. */
  reactionDelay: 10,
};
