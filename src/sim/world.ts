import { createRng, type Rng } from './rng.ts';

/** Simulation ticks per second. Rendering runs independently of this. */
export const TICK_RATE = 20;

export interface World {
  readonly seed: number;
  tick: number;
  rng: Rng;
}

export function createWorld(seed: number): World {
  return { seed, tick: 0, rng: createRng(seed) };
}

/** Advance the simulation by exactly one fixed tick. Pure game logic only: no DOM, no rendering, no wall-clock time. */
export function step(world: World): void {
  world.tick++;
  // Placeholder: consume randomness so determinism tests exercise the RNG.
  world.rng.next();
}

/** Cheap fingerprint of world state; identical for identical seeds and inputs. */
export function hashWorld(world: World): string {
  return `${world.tick}:${world.rng.state().toString(16)}`;
}
