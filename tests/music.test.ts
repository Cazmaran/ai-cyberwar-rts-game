import { describe, expect, it } from 'vitest';
import { createMood, fighting, MUSIC, updateMood } from '../src/render/music.ts';
import { buildings, factionView, spawnUnit, TILE } from '../src/sim/index.ts';
import { newGame } from './helpers.ts';

describe('music mood', () => {
  it('fighting: enemy combat units near our units or buildings, not enemy workers or far-off armies', () => {
    const game = newGame();
    const noc = buildings(game.world).find((b) => b.type === 'noc')!;
    expect(fighting(factionView(game.world, 'human'))).toBe(false);

    const drone = spawnUnit(game.world, 'maintenance_drone', 'ai', noc.x + 3 * TILE, noc.y);
    expect(fighting(factionView(game.world, 'human'))).toBe(false);
    game.world.entities.delete(drone.id);

    spawnUnit(game.world, 'botnet_swarm', 'ai', noc.x + 4 * TILE, noc.y);
    expect(fighting(factionView(game.world, 'human'))).toBe(true);
  });

  it('switches to combat at once, and back to calm only after a quiet spell', () => {
    const m = createMood();
    expect(updateMood(m, false, 0)).toBe(false);
    expect(updateMood(m, true, 1000)).toBe(true);
    expect(updateMood(m, false, 1000 + MUSIC.calmAfterMs - 1)).toBe(true);
    expect(updateMood(m, false, 1000 + MUSIC.calmAfterMs)).toBe(false);
  });
});
