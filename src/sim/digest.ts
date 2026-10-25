// State digest for an LLM General (Phase 2, M2.1): a compact, deterministic JSON summary of one
// faction's view, grouped by named sector, with pre-computed threat levels. Built only from FactionView,
// so fog of war holds. Integers only; key order is fixed so turn-to-turn diffs stay readable.
import { MILLI } from './fixed.ts';
import { SECTORS, type SectorId } from './sectors.ts';
import { powerHeadroom, training, type BuildingView, type FactionView, type UnitView } from './view.ts';
import { BUILDINGS, UNITS, type Faction, type UnitTypeId } from './data.ts';
import { TICK_RATE } from './world.ts';

export type ThreatLevel = 'low' | 'medium' | 'high';

export interface SectorDigest {
  sector: SectorId;
  /** Unit counts by type (combat and workers). */
  ours?: Partial<Record<UnitTypeId, number>>;
  enemy?: Partial<Record<UnitTypeId, number>>;
  /** Own buildings, and enemy buildings in sight ("enemy:<type>"). */
  buildings?: string[];
  /** Visible enemy strength here: combat units plus static defenses, at Data value (same scale as `army`). */
  enemyStrength?: number;
  /** "site_id=ours|enemy|neutral|unseen", plus "(issue)" when an own Data source isn't feeding home. */
  sites: string[];
}

export interface Threat { sector: SectorId; enemy: number; ours: number; level: ThreatLevel }

export interface Digest {
  t: string;
  you: Faction;
  /** Sectors of both cores (public map knowledge): where home is and what to attack. */
  cores: { ours: SectorId | null; enemy: SectorId | null };
  economy: {
    data: number;
    /** Data per minute arriving at the core. */
    incomePerMin: number;
    power: { used: number; cap: number; full: boolean };
    compute: number;
  };
  /** Humans: seconds until Pull the Plug is ready (0 = ready). */
  plugReadyIn?: number;
  /** AI: resistance percent by attacker type, and whether retraining is running. */
  adaptation?: { resist: Partial<Record<UnitTypeId, number>>; retraining: boolean };
  /** Data value of our combat units (same scale as threat strengths). */
  army: number;
  /** Total workers, then counts by what they are doing. */
  workers: Record<string, number>;
  /** "building: unit Ns (+queued)" for each building that is training. */
  production: string[];
  sectors: SectorDigest[];
  /** Sectors where visible enemies are near our units, buildings or sites; strongest first. */
  threats: Threat[];
}

/** Army strength: Data value of combat units. */
const strength = (us: UnitView[]) => us.filter((u) => u.role !== 'worker').reduce((s, u) => s + Math.trunc(UNITS[u.type].cost / MILLI), 0);
/**
 * Static defenses (buildings with a weapon) at Data value. Without this, towers were invisible to the
 * General's threat math and it sent units into them one at a time (replay seed 88632).
 */
const defenseStrength = (bs: BuildingView[]) => bs.filter((b) => b.built && BUILDINGS[b.type].weapon).reduce((s, b) => s + Math.trunc(BUILDINGS[b.type].cost / MILLI), 0);

function counts(us: UnitView[]): Partial<Record<UnitTypeId, number>> | undefined {
  if (us.length === 0) return undefined;
  const out: Partial<Record<UnitTypeId, number>> = {};
  for (const t of [...new Set(us.map((u) => u.type))].sort()) out[t] = us.filter((u) => u.type === t).length;
  return out;
}

export function digestView(v: FactionView): Digest {
  const secs = Math.trunc(v.tick / TICK_RATE);
  const sectors: SectorDigest[] = [];
  const threats: Threat[] = [];
  for (const sector of SECTORS) {
    const ours = v.units.filter((u) => u.sector === sector);
    const enemy = v.enemyUnits.filter((u) => u.sector === sector);
    const buildings = [
      ...v.buildings.filter((b) => b.sector === sector).map((b) => b.type + (b.built ? '' : '(building)')),
      ...v.enemyBuildings.filter((b) => b.sector === sector).map((b) => `enemy:${b.type}`),
    ];
    const sites = v.sites.filter((s) => s.sector === sector && s.kind !== 'core').map((s) => {
      const owner = s.owner === v.faction ? 'ours' : s.owner === null ? 'neutral' : s.owner === 'unknown' ? 'unseen' : 'enemy';
      return `${s.id}=${owner}${s.issue ? `(${s.issue})` : ''}`;
    });
    if (ours.length + enemy.length + buildings.length + sites.length === 0) continue;
    const entry: SectorDigest = { sector, sites };
    const o = counts(ours);
    const e = counts(enemy);
    if (o) entry.ours = o;
    if (e) entry.enemy = e;
    if (buildings.length) entry.buildings = buildings;
    const enemyStrength = strength(enemy) + defenseStrength(v.enemyBuildings.filter((b) => b.sector === sector));
    if (enemyStrength > 0) entry.enemyStrength = enemyStrength;
    sectors.push(entry);

    // Threat: visible enemy combat units and defenses where we have something to lose.
    const assets = ours.length > 0 || v.buildings.some((b) => b.sector === sector) || sites.some((x) => x.includes('=ours'));
    if (enemyStrength > 0 && assets) {
      const ourStrength = strength(ours) + defenseStrength(v.buildings.filter((b) => b.sector === sector));
      const level: ThreatLevel = enemyStrength * 2 >= ourStrength * 3 ? 'high' : enemyStrength * 10 >= ourStrength * 7 ? 'medium' : 'low';
      threats.push({ sector, enemy: enemyStrength, ours: ourStrength, level });
    }
  }
  threats.sort((a, b) => b.enemy - a.enemy || SECTORS.indexOf(a.sector) - SECTORS.indexOf(b.sector));

  const workers: Record<string, number> = { total: v.units.filter((u) => u.role === 'worker').length };
  const core = v.buildings.find((b) => b.type === 'noc' || b.type === 'primary_cluster');
  const enemyCore = v.sites.find((s) => s.kind === 'core' && !(core && s.x === core.x && s.y === core.y));
  for (const u of v.units) {
    if (u.role !== 'worker') continue;
    const k = !u.job ? 'idle' : !u.job.working ? 'walking' : u.job.contested ? 'contested' : u.job.kind;
    workers[k] = (workers[k] ?? 0) + 1;
  }
  const production = v.buildings.flatMap((b) => {
    const t = training(v, b);
    return t ? [`${b.type}: ${t.unit} ${t.waitingForPower ? 'waiting for power' : `${t.seconds}s`}${t.queued ? ` (+${t.queued})` : ''}`] : [];
  });

  const d: Digest = {
    t: `${Math.trunc(secs / 60)}:${String(secs % 60).padStart(2, '0')}`,
    you: v.faction,
    cores: { ours: core?.sector ?? null, enemy: enemyCore?.sector ?? null },
    economy: {
      data: Math.trunc(v.data / MILLI),
      incomePerMin: Math.trunc((v.income * TICK_RATE * 60) / MILLI),
      power: { used: v.powerUsed, cap: v.powerCap, full: powerHeadroom(v) === 0 },
      compute: v.compute,
    },
    army: strength(v.units),
    workers,
    production,
    sectors,
    threats,
  };
  if (v.plugReadyIn !== null) d.plugReadyIn = Math.ceil(v.plugReadyIn / TICK_RATE);
  if (v.resist) d.adaptation = { resist: Object.fromEntries(Object.entries(v.resist).filter(([, p]) => (p ?? 0) > 0)), retraining: v.retraining };
  return d;
}
