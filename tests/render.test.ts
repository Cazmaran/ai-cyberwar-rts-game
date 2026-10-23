import { describe, expect, it } from 'vitest';
import { strength, verdict } from '../src/render/effects.ts';
import { visibleTiles } from '../src/render/fog.ts';
import { factionView, spawnUnit, TILE } from '../src/sim/index.ts';
import { newGame } from './helpers.ts';

describe('readability helpers', () => {
  it('fog: tiles near your units are visible, the enemy base is not, and a scout reveals ground', () => {
    const game = newGame();
    let v = factionView(game.world, 'human');
    let seen = visibleTiles(v);
    const at = (tx: number, ty: number) => seen[ty * v.mapWidth + tx];
    expect(at(6, 16)).toBe(1); // NOC
    expect(at(42, 16)).toBe(0); // AI core
    spawnUnit(game.world, 'counter_drone_team', 'human', 42 * TILE, 16 * TILE);
    v = factionView(game.world, 'human');
    seen = visibleTiles(v);
    expect(at(42, 16)).toBe(1);
  });

  it('strength scales Data value by health, and the verdict needs a clear margin', () => {
    const game = newGame();
    const a = spawnUnit(game.world, 'armored_vehicle', 'human', 20 * TILE, 16 * TILE);
    let ours = factionView(game.world, 'human').units.filter((u) => u.id === a.id);
    expect(strength(ours)).toBe(100);
    a.hp = Math.trunc(a.hp / 2);
    ours = factionView(game.world, 'human').units.filter((u) => u.id === a.id);
    expect(strength(ours)).toBe(50);
    expect(verdict(100, 70)).toMatch(/stronger/);
    expect(verdict(100, 90)).toMatch(/evenly/);
    expect(verdict(60, 100)).toMatch(/they are stronger/);
  });
});
