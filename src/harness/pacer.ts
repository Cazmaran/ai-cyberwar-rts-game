// Fair-play limits for non-human controllers (Tenet 2/4): actions-per-minute cap and reaction delay.
import { FAIRNESS, TICK_RATE } from '../sim/index.ts';

/** Token bucket in milli-actions so the math stays integer. */
export interface Pacer {
  apm: number;
  tokens: number;
  lastTick: number;
}

const ACTION = 1000;
const MAX_BANKED = 5 * ACTION;

export function createPacer(apm = FAIRNESS.apm): Pacer {
  return { apm, tokens: ACTION, lastTick: 0 };
}

/** How many actions the controller may take now. Call `spend` for each one used. */
export function available(p: Pacer, tick: number): number {
  const gained = Math.trunc(((tick - p.lastTick) * p.apm * ACTION) / (60 * TICK_RATE));
  p.tokens = Math.min(MAX_BANKED, p.tokens + gained);
  p.lastTick = tick;
  return Math.trunc(p.tokens / ACTION);
}

export function spend(p: Pacer): void {
  p.tokens -= ACTION;
}
