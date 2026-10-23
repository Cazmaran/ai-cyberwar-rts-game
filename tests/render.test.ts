import { describe, expect, it } from 'vitest';
import { strength, verdict } from '../src/render/effects.ts';
import { visibleTiles } from '../src/render/fog.ts';
import { selectSameType } from '../src/render/input.ts';
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

describe('double-click selection', () => {
  it('selects every own unit of the clicked type inside the visible area, and nothing else', () => {
    const game = newGame();
    const a = spawnUnit(game.world, 'red_team', 'human', 20 * TILE, 10 * TILE);
    const b = spawnUnit(game.world, 'red_team', 'human', 22 * TILE, 12 * TILE);
    spawnUnit(game.world, 'red_team', 'human', 40 * TILE, 30 * TILE); // off screen
    spawnUnit(game.world, 'counter_drone_team', 'human', 21 * TILE, 11 * TILE); // other type
    const v = factionView(game.world, 'human');
    expect(selectSameType(v, a.id, [15 * TILE, 5 * TILE], [30 * TILE, 20 * TILE]).sort()).toEqual([a.id, b.id].sort());
    expect(selectSameType(v, -1, [0, 0], [48 * TILE, 32 * TILE])).toEqual([]);
  });
});
