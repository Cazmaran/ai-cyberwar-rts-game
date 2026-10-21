// Run a full match between two controllers, headless. Used by `npm run sim`, balance runs and tests.
import type { Controller } from '../ai/controller.ts';
import { TICK_RATE, type Faction, type Game } from '../sim/index.ts';
import { createSession, tickSession } from './session.ts';

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
  const session = createSession({ ...opts, controllers: { human: opts.human, ai: opts.ai } });
  const maxTicks = opts.maxTicks ?? 20 * 60 * TICK_RATE;
  const { world } = session.game;
  while (world.tick < maxTicks && world.winner === null) tickSession(session);
  return { winner: world.winner, ticks: world.tick, game: session.game };
}
