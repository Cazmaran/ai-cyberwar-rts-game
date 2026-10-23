// Match statistics for the post-match summary: what each side earned, trained, lost and fielded over
// time. Reads the full world (the match is over when it is shown, so fog no longer applies). No DOM.
import { buildings, FACTIONS, TICK_RATE, UNITS, units, type Faction, type World } from '../sim/index.ts';

export interface Sample {
  tick: number;
  /** Data value of combat units alive. */
  army: Record<Faction, number>;
  /** Data per second arriving at the core. */
  income: Record<Faction, number>;
  /** Data sources owned. */
  sources: Record<Faction, number>;
}

export interface Totals {
  /** Data earned (whole units). */
  earned: number;
  /** Combat units trained and lost. */
  trained: number;
  lost: number;
  peakArmy: number;
  /** Seconds with a finished production building, nothing in training, and Data for a unit (real slack). */
  idleSeconds: number;
  /** Seconds with a finished production building and nothing in training, but not enough Data for any unit. */
  starvedSeconds: number;
}

export interface MatchStats {
  every: number;
  samples: Sample[];
  totals: Record<Faction, Totals>;
  /** Combat units seen so far, to count new and lost ones. */
  known: Map<number, Faction>;
  earnedMilli: Record<Faction, number>;
  idleTicks: Record<Faction, number>;
  starvedTicks: Record<Faction, number>;
}

const PRODUCTION = new Set(['soc', 'training_cluster']);
/** Cheapest unit each faction's production buildings can train (milli-Data). */
const CHEAPEST = Object.fromEntries(FACTIONS.map((f) => [f, Math.min(...Object.values(UNITS)
  .filter((u) => u.faction === f && PRODUCTION.has(u.trainedAt)).map((u) => u.cost))])) as Record<Faction, number>;

export function createStats(every = 5 * TICK_RATE): MatchStats {
  const totals = () => ({ earned: 0, trained: 0, lost: 0, peakArmy: 0, idleSeconds: 0, starvedSeconds: 0 });
  return {
    every, samples: [], known: new Map(),
    totals: { human: totals(), ai: totals() },
    earnedMilli: { human: 0, ai: 0 }, idleTicks: { human: 0, ai: 0 }, starvedTicks: { human: 0, ai: 0 },
  };
}

/** Call once per tick, after the world advances. */
export function recordStats(s: MatchStats, world: World): void {
  const army: Record<Faction, number> = { human: 0, ai: 0 };
  const alive = new Set<number>();
  for (const u of units(world)) {
    if (UNITS[u.type].role === 'worker') continue;
    alive.add(u.id);
    army[u.faction] += UNITS[u.type].cost / 1000;
    if (!s.known.has(u.id)) { s.known.set(u.id, u.faction); s.totals[u.faction].trained++; }
  }
  for (const [id, f] of s.known) {
    if (!alive.has(id)) { s.known.delete(id); s.totals[f].lost++; }
  }
  for (const f of FACTIONS) {
    const t = s.totals[f];
    s.earnedMilli[f] += world.factions[f].income;
    t.earned = Math.trunc(s.earnedMilli[f] / 1000);
    t.peakArmy = Math.max(t.peakArmy, army[f]);
    const prod = buildings(world).filter((b) => b.faction === f && b.built && PRODUCTION.has(b.type));
    if (prod.length > 0 && prod.every((b) => b.queue.length === 0)) {
      if (world.factions[f].data >= CHEAPEST[f]) s.idleTicks[f]++;
      else s.starvedTicks[f]++;
    }
    t.idleSeconds = Math.trunc(s.idleTicks[f] / TICK_RATE);
    t.starvedSeconds = Math.trunc(s.starvedTicks[f] / TICK_RATE);
  }
  if (world.tick % s.every === 0 || world.winner !== null) {
    const income = (f: Faction) => (world.factions[f].income * TICK_RATE) / 1000;
    const sources = (f: Faction) => [...world.sites.values()].filter((x) => x.kind === 'data_source' && x.owner === f).length;
    s.samples.push({ tick: world.tick, army, income: { human: income('human'), ai: income('ai') }, sources: { human: sources('human'), ai: sources('ai') } });
  }
}

/**
 * The moment the opponent's army was furthest ahead of yours, if it ever was. When you had no army at
 * all, `ratio` is null and the gap is the opponent's army value.
 */
export function biggestGap(s: MatchStats, you: Faction): { tick: number; ratio: number | null; theirs: number } | null {
  const them: Faction = you === 'human' ? 'ai' : 'human';
  let best: { tick: number; ratio: number | null; theirs: number; score: number } | null = null;
  for (const x of s.samples) {
    if (x.army[them] < 100) continue;
    const ratio = x.army[you] > 0 ? x.army[them] / x.army[you] : null;
    if (ratio !== null && ratio < 1.5) continue;
    // Rank by how far behind you were; having no army at all ranks by the size of theirs.
    const score = ratio ?? 1000 + x.army[them];
    if (!best || score > best.score) best = { tick: x.tick, ratio, theirs: x.army[them], score };
  }
  return best && { tick: best.tick, ratio: best.ratio, theirs: best.theirs };
}

/** The first moment the opponent's income stayed at least 1.5x yours for a minute or more, if it did. */
export function incomeGap(s: MatchStats, you: Faction): { tick: number; yours: number; theirs: number; sources: [number, number] } | null {
  const them: Faction = you === 'human' ? 'ai' : 'human';
  const minute = 60 * TICK_RATE;
  for (let i = 0; i < s.samples.length; i++) {
    const a = s.samples[i]!;
    const behind = (x: Sample) => x.income[them] >= 1.5 * Math.max(1, x.income[you]);
    if (!behind(a)) continue;
    const run = s.samples.filter((x) => x.tick >= a.tick && x.tick <= a.tick + minute);
    if (run.length > 1 && run.at(-1)!.tick - a.tick >= minute && run.every(behind)) {
      return { tick: a.tick, yours: a.income[you], theirs: a.income[them], sources: [a.sources[you], a.sources[them]] };
    }
  }
  return null;
}

/**
 * The turning point: the earliest moment from which one side earned more than the other for the rest of
 * the match (at least a minute of it). Null if the lead kept changing hands to the end.
 */
export function economicLead(s: MatchStats): { leader: Faction; tick: number } | null {
  const last = s.samples.at(-1);
  if (!last) return null;
  const ahead = (x: Sample): Faction | null => x.income.human > x.income.ai ? 'human' : x.income.ai > x.income.human ? 'ai' : null;
  const leader = ahead(last);
  if (!leader) return null;
  let i = s.samples.length - 1;
  while (i > 0 && ahead(s.samples[i - 1]!) === leader) i--;
  const tick = s.samples[i]!.tick;
  return last.tick - tick >= 60 * TICK_RATE ? { leader, tick } : null;
}
