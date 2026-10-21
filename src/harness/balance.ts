// Balance measurements (Tenet 4): equal-cost duels, strategy tournament, skill test.
import { createScriptedBot, STRATEGIES, type Strategy } from '../ai/scripted.ts';
import {
  advance, applyCommand, createGame, createRng, spawnUnit, TILE, UNITS, units, type Faction, type Role, type UnitTypeId,
} from '../sim/index.ts';
import { runMatch } from './match.ts';

export const COMBAT_UNITS = (Object.keys(UNITS) as UnitTypeId[]).filter((t) => UNITS[t].role !== 'worker');

/** What each role is supposed to beat. */
export const BEATS: Record<Exclude<Role, 'worker'>, Exclude<Role, 'worker'>> = { fast: 'ranged', ranged: 'tank', tank: 'fast' };

export interface DuelResult {
  /** Share of seeds won by side A (0..100). Draws count half. */
  winPct: number;
}

/** Equal-Data armies of type A and type B meet in open ground away from both bases. */
export function duel(a: UnitTypeId, b: UnitTypeId, budget: number, seeds: number): DuelResult {
  let score = 0;
  for (let seed = 1; seed <= seeds; seed++) {
    const game = createGame(seed);
    const rng = createRng(seed * 31);
    const spawn = (type: UnitTypeId, faction: Faction, x: number) => {
      const n = Math.max(1, Math.trunc(budget / UNITS[type].cost));
      const ids: number[] = [];
      for (let i = 0; i < n; i++) {
        ids.push(spawnUnit(game.world, type, faction, (x + rng.int(-1, 1)) * TILE, (6 + (i % 5)) * TILE + rng.int(0, 500)).id);
      }
      return ids;
    };
    const ia = spawn(a, 'human', 20);
    const ib = spawn(b, 'ai', 28);
    applyCommand(game.world, 'human', { type: 'attackMove', units: ia, x: 28 * TILE, y: 8 * TILE });
    applyCommand(game.world, 'ai', { type: 'attackMove', units: ib, x: 20 * TILE, y: 8 * TILE });
    const alive = (ids: number[]) => ids.filter((id) => game.world.entities.has(id));
    for (let t = 0; t < 3000 && alive(ia).length > 0 && alive(ib).length > 0; t++) advance(game);
    const la = alive(ia).length;
    const lb = alive(ib).length;
    if (la > 0 && lb === 0) score += 2;
    else if (la === lb || (la > 0 && lb > 0)) score += 1;
  }
  return { winPct: Math.round((100 * score) / (2 * seeds)) };
}

export interface CounterCheck { attacker: UnitTypeId; target: UnitTypeId; winPct: number; ok: boolean }

/** Every combat unit against every combat unit it is supposed to beat (both factions). */
export function counterChecks(budget: number, seeds: number, threshold = 70): CounterCheck[] {
  const out: CounterCheck[] = [];
  for (const a of COMBAT_UNITS) {
    for (const b of COMBAT_UNITS) {
      if (BEATS[UNITS[a].role as Exclude<Role, 'worker'>] !== UNITS[b].role) continue;
      const { winPct } = duel(a, b, budget, seeds);
      out.push({ attacker: a, target: b, winPct, ok: winPct >= threshold });
    }
  }
  return out;
}

/** Full A-vs-B win matrix. */
export function duelMatrix(budget: number, seeds: number): Map<UnitTypeId, Map<UnitTypeId, number>> {
  const m = new Map<UnitTypeId, Map<UnitTypeId, number>>();
  for (const a of COMBAT_UNITS) {
    const row = new Map<UnitTypeId, number>();
    for (const b of COMBAT_UNITS) row.set(b, a === b ? 50 : duel(a, b, budget, seeds).winPct);
    m.set(a, row);
  }
  return m;
}

/** Units that win (>50%) against every other unit: must be empty. */
export function dominantUnits(m: Map<UnitTypeId, Map<UnitTypeId, number>>): UnitTypeId[] {
  return [...m].filter(([a, row]) => [...row].every(([b, p]) => a === b || p > 50)).map(([a]) => a);
}

export interface TournamentCell { human: string; ai: string; humanWinPct: number; avgMinutes: number }

export function tournament(seeds: number, minutes = 20, strategies: Strategy[] = Object.values(STRATEGIES)): TournamentCell[] {
  const out: TournamentCell[] = [];
  for (const h of strategies) {
    for (const a of strategies) {
      let score = 0;
      let ticks = 0;
      for (let seed = 1; seed <= seeds; seed++) {
        const r = runMatch({
          seed, maxTicks: minutes * 60 * 20,
          human: createScriptedBot('human', h, seed), ai: createScriptedBot('ai', a, seed * 7919),
        });
        score += r.winner === 'human' ? 2 : r.winner === null ? 1 : 0;
        ticks += r.ticks;
      }
      out.push({ human: h.name, ai: a.name, humanWinPct: Math.round((100 * score) / (2 * seeds)), avgMinutes: Math.round(ticks / seeds / 120) / 10 });
    }
  }
  return out;
}

/**
 * Same strategy on both sides; the skilled side focus-fires and counter-builds, the sloppy side only
 * attack-moves with a fixed mix. Returns the skilled side's win %.
 */
export function skillTest(strategy: Strategy, seeds: number, minutes = 20, skill: Partial<Strategy> = { focusFire: true, counterBuild: true }): number {
  let score = 0;
  for (let seed = 1; seed <= seeds; seed++) {
    for (const skilled of ['human', 'ai'] as const) {
      const pro = createScriptedBot(skilled, { ...strategy, focusFire: false, counterBuild: false, ...skill }, seed);
      const other: Faction = skilled === 'human' ? 'ai' : 'human';
      const sloppy = createScriptedBot(other, { ...strategy, focusFire: false, counterBuild: false }, seed);
      const r = runMatch({ seed, maxTicks: minutes * 60 * 20, human: skilled === 'human' ? pro : sloppy, ai: skilled === 'ai' ? pro : sloppy });
      score += r.winner === skilled ? 2 : r.winner === null ? 1 : 0;
    }
  }
  return Math.round((100 * score) / (4 * seeds));
}

export function countUnits(game: ReturnType<typeof createGame>, faction: Faction): number {
  return units(game.world).filter((u) => u.faction === faction).length;
}
