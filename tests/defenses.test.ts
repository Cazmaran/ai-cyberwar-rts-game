import { describe, expect, it } from 'vitest';
import { applyCommand, BUILDINGS, buildings, spawnBuilding, spawnUnit, TILE, type BuildingTypeId, type Faction } from '../src/sim/index.ts';
import { newGame, run } from './helpers.ts';

/** A finished defense at the map center and one enemy unit `tiles` east of it. */
function setup(type: BuildingTypeId, faction: Faction, tiles: number, built = true) {
  const game = newGame();
  const d = spawnBuilding(game.world, type, faction, 24 * TILE, 16 * TILE);
  d.built = built;
  const enemy = faction === 'human' ? 'ai' : 'human';
  const target = spawnUnit(game.world, enemy === 'ai' ? 'industrial_robot' : 'armored_vehicle', enemy, (24 + tiles) * TILE, 16 * TILE);
  target.order = { type: 'move', x: target.x, y: target.y };
  return { game, d, target };
}

describe('static defenses', () => {
  for (const [type, faction] of [['security_post', 'human'], ['sentry_gun', 'ai']] as const) {
    it(`${type} fires at an enemy unit in range`, () => {
      const { game, target } = setup(type, faction, 4);
      const hp = target.hp;
      run(game, 2);
      expect(target.hp).toBe(hp - BUILDINGS[type].weapon!.damage);
    });

    it(`${type} ignores enemies out of range and does nothing while unbuilt`, () => {
      const far = setup(type, faction, 8);
      const farHp = far.target.hp;
      run(far.game, 40);
      expect(far.target.hp).toBe(farHp);

      const unbuilt = setup(type, faction, 4, false);
      const hp = unbuilt.target.hp;
      run(unbuilt.game, 40);
      expect(unbuilt.target.hp).toBe(hp);
    });
  }

  it('Pull the Plug silences a Sentry Gun but not a Security Post (guards need no grid power)', () => {
    for (const [type, faction, silenced] of [['sentry_gun', 'ai', true], ['security_post', 'human', false]] as const) {
      const { game, target } = setup(type, faction, 4);
      expect(applyCommand(game.world, 'human', { type: 'pullThePlug', x: 24 * TILE, y: 16 * TILE })).toBeNull();
      const hp = target.hp;
      run(game, 40);
      expect(target.hp === hp).toBe(silenced);
    }
  });

  it('only the owning faction can build its defense', () => {
    const game = newGame();
    const worker = [...game.world.entities.values()].find((e) => e.kind === 'unit' && e.faction === 'ai')!;
    expect(applyCommand(game.world, 'ai', { type: 'build', units: [worker.id], building: 'security_post', x: 40 * TILE, y: 20 * TILE }))
      .toBe('faction cannot build that');
    expect(buildings(game.world).some((b) => b.type === 'security_post')).toBe(false);
  });
});
