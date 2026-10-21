// Run a full match between two controllers, headless. Used by `npm run sim`, balance runs and tests.
import type { Controller } from '../ai/controller.ts';
import { advance, createGame, factionView, FAIRNESS, issue, TICK_RATE, type Faction, type Game } from '../sim/index.ts';
import { available, createPacer, spend } from './pacer.ts';

export interface MatchOptions {
  seed: number;
  mapId?: string;
  human: Controller;
  ai: Controller;
  /** Default 20 minutes. */
  maxTicks?: number;
  /** Ticks between controller decisions. */
  decisionInterval?: number;
  /** Override the fair-play limits (e.g. for experiments); defaults come from data.ts. */
  apm?: number;
  reactionDelay?: number;
}

export interface MatchResult {
  winner: Faction | null;
  ticks: number;
  game: Game;
}

export function runMatch(opts: MatchOptions): MatchResult {
  const game = createGame(opts.seed, opts.mapId ?? 'duel');
  const maxTicks = opts.maxTicks ?? 20 * 60 * TICK_RATE;
  const interval = opts.decisionInterval ?? 10;
  const delay = opts.reactionDelay ?? FAIRNESS.reactionDelay;
  const players = [
    { faction: 'human' as const, controller: opts.human, pacer: createPacer(opts.apm) },
    { faction: 'ai' as const, controller: opts.ai, pacer: createPacer(opts.apm) },
  ];
  while (game.world.tick < maxTicks && game.world.winner === null) {
    if (game.world.tick % interval === 0) {
      for (const p of players) {
        let budget = available(p.pacer, game.world.tick);
        if (budget === 0) continue;
        for (const cmd of p.controller.decide(factionView(game.world, p.faction))) {
          if (budget-- === 0) break;
          spend(p.pacer);
          issue(game, p.faction, cmd, delay);
        }
      }
    }
    advance(game);
  }
  return { winner: game.world.winner, ticks: game.world.tick, game };
}
