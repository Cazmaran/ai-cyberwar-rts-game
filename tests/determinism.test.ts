import { describe, expect, it } from 'vitest';
import { hashWorld, runReplay, toReplay, TILE } from '../src/sim/index.ts';
import { command, newGame, run, workersOf } from './helpers.ts';

function scriptedMatch(seed: number) {
  const game = newGame(seed);
  const [w1, w2, w3] = workersOf(game, 'human');
  const [c1, c2] = workersOf(game, 'ai');
  command(game, 'human', { type: 'claim', units: [w1!], site: 'h_src_n' });
  command(game, 'human', { type: 'build', units: [w2!, w3!], building: 'soc', x: 10 * TILE, y: 20 * TILE });
  command(game, 'ai', { type: 'claim', units: [c1!], site: 'a_src_n' });
  command(game, 'ai', { type: 'expand' });
  run(game, 400);
  command(game, 'ai', { type: 'move', units: [c2!], x: 24 * TILE, y: 16 * TILE });
  run(game, 1600);
  return game;
}

describe('simulation determinism', () => {
  it('same seed and commands produce identical state', () => {
    expect(hashWorld(scriptedMatch(42).world)).toBe(hashWorld(scriptedMatch(42).world));
  });

  it('replay of the command log reproduces the final state exactly', () => {
    const game = scriptedMatch(7);
    const replayed = runReplay(JSON.parse(JSON.stringify(toReplay(game))));
    expect(hashWorld(replayed.world)).toBe(hashWorld(game.world));
  });

  it('replay refuses a different data version', () => {
    const rep = toReplay(scriptedMatch(1));
    expect(() => runReplay({ ...rep, dataVersion: rep.dataVersion + 1 })).toThrow(/data version/);
  });

  it('game state holds integers only (no floats)', () => {
    const game = scriptedMatch(3);
    const check = (v: unknown, path: string): void => {
      if (typeof v === 'number') expect(Number.isInteger(v), path).toBe(true);
      else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) check(x, `${path}.${k}`);
    };
    check([...game.world.entities.values()], 'entities');
    check(game.world.factions, 'factions');
    check([...game.world.sites.values()], 'sites');
  });
});
