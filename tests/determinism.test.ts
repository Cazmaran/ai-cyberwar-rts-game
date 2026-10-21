import { describe, expect, it } from 'vitest';
import { createWorld, hashWorld, step } from '../src/sim/world.ts';

function run(seed: number, ticks: number): string {
  const world = createWorld(seed);
  for (let i = 0; i < ticks; i++) step(world);
  return hashWorld(world);
}

describe('simulation determinism', () => {
  it('same seed produces identical state', () => {
    expect(run(42, 5000)).toBe(run(42, 5000));
  });

  it('different seeds diverge', () => {
    expect(run(1, 100)).not.toBe(run(2, 100));
  });
});
