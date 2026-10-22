import { describe, expect, it } from 'vitest';
import { describeView, factionView, spawnUnit, TILE } from '../src/sim/index.ts';
import { newGame } from './helpers.ts';

describe('faction view (fog of war)', () => {
  it('hides enemies outside sight and reveals them when in sight', () => {
    const game = newGame();
    expect(factionView(game.world, 'human').enemyUnits).toHaveLength(0);
    spawnUnit(game.world, 'botnet_swarm', 'ai', 9 * TILE, 16 * TILE);
    expect(factionView(game.world, 'human').enemyUnits).toHaveLength(1);
  });

  it('hides ownership of unseen sites', () => {
    const v = factionView(newGame().world, 'human');
    expect(v.sites.find((s) => s.id === 'a_src_n')!.owner).toBe('unknown');
    expect(v.sites.find((s) => s.id === 'h_router')!.owner).toBeNull();
  });

  it('text view summarizes by sector', () => {
    const text = describeView(factionView(newGame().world, 'human'));
    expect(text).toMatch(/^\[human\] t=0:00 data=260/);
    expect(text).toContain('pull_the_plug: READY');
    expect(text).toMatch(/W: .*ours: 3 field_engineer/);
    const ai = describeView(factionView(newGame().world, 'ai'));
    expect(ai).toContain('adaptation: none');
  });
});
