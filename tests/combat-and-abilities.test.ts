import { describe, expect, it } from 'vitest';
import { ADAPTATION, PULL_THE_PLUG } from '../src/sim/data.ts';
import { applyCommand, hashWorld, spawnBuilding, spawnUnit, TILE, units } from '../src/sim/index.ts';
import { command, newGame, run } from './helpers.ts';

describe('combat', () => {
  it('units fight and the loser is removed', () => {
    const game = newGame();
    const a = spawnUnit(game.world, 'counter_drone_team', 'human', 20 * TILE, 5 * TILE);
    const b = spawnUnit(game.world, 'maintenance_drone', 'ai', 21 * TILE, 5 * TILE);
    run(game, 200);
    expect(game.world.entities.has(b.id)).toBe(false);
    expect(game.world.entities.has(a.id)).toBe(true);
  });

  it('an enemy Barricade blocks AI movement until breached', () => {
    const game = newGame();
    const wall = spawnBuilding(game.world, 'barricade', 'human', 20 * TILE, 5 * TILE);
    wall.built = true;
    const bot = spawnUnit(game.world, 'botnet_swarm', 'ai', 22 * TILE, 5 * TILE);
    command(game, 'ai', { type: 'move', units: [bot.id], x: 15 * TILE, y: 5 * TILE });
    run(game, 100);
    expect(bot.x).toBeGreaterThan(20 * TILE);
    expect(wall.hp).toBeLessThan(400);
  });

  it('destroying a core ends the match', () => {
    const game = newGame();
    const core = [...game.world.entities.values()].find((e) => e.kind === 'building' && e.faction === 'ai')!;
    core.hp = 1;
    const u = spawnUnit(game.world, 'red_team', 'human', core.x - 3 * TILE, core.y);
    command(game, 'human', { type: 'attack', units: [u.id], target: core.id });
    run(game, 50);
    expect(game.world.winner).toBe('human');
  });
});

describe('Pull the Plug', () => {
  it('freezes AI units in the zone; human units keep working; then goes on cooldown', () => {
    const game = newGame();
    const bot = spawnUnit(game.world, 'botnet_swarm', 'ai', 30 * TILE, 10 * TILE);
    const eng = spawnUnit(game.world, 'field_engineer', 'human', 30 * TILE, 12 * TILE);
    command(game, 'ai', { type: 'move', units: [bot.id], x: 40 * TILE, y: 10 * TILE });
    command(game, 'human', { type: 'move', units: [eng.id], x: 40 * TILE, y: 12 * TILE });
    const botX = bot.x;
    expect(command(game, 'human', { type: 'pullThePlug', x: bot.x, y: bot.y })).toBeNull();
    run(game, 20);
    expect(bot.x).toBe(botX);
    expect(eng.x).toBeGreaterThan(30 * TILE);
    expect(command(game, 'human', { type: 'pullThePlug', x: bot.x, y: bot.y })).toMatch(/cooldown/);
    run(game, PULL_THE_PLUG.duration);
    expect(bot.x).toBeGreaterThan(botX);
  });

  it('only humans can pull the plug', () => {
    const game = newGame();
    expect(command(game, 'ai', { type: 'pullThePlug', x: TILE, y: TILE })).toMatch(/only humans/);
  });
});

describe('Adaptation', () => {
  function killAiUnits(game: ReturnType<typeof newGame>, n: number, by: 'red_team' | 'counter_drone_team') {
    for (let i = 0; i < n; i++) {
      const u = spawnUnit(game.world, 'botnet_swarm', 'ai', 40 * TILE, 5 * TILE);
      u.lastHitBy = by;
      u.hp = 0;
    }
  }

  it('after retraining, new AI units resist what killed their predecessors, up to the cap', () => {
    const game = newGame();
    const old = spawnUnit(game.world, 'botnet_swarm', 'ai', 40 * TILE, 6 * TILE);
    killAiUnits(game, 10, 'red_team');
    run(game, ADAPTATION.retrainDuration + 2);
    expect(game.world.factions.ai.resist.red_team).toBe(ADAPTATION.cap);
    const fresh = spawnUnit(game.world, 'botnet_swarm', 'ai', 40 * TILE, 6 * TILE);
    expect(fresh.resist.red_team).toBe(ADAPTATION.cap);
    expect(old.resist.red_team ?? 0).toBe(0);
  });

  it('resistance decays when that threat stops appearing', () => {
    const game = newGame();
    killAiUnits(game, 2, 'red_team');
    run(game, ADAPTATION.retrainDuration + 2);
    const first = game.world.factions.ai.resist.red_team!;
    expect(first).toBe(2 * ADAPTATION.perDeath);
    killAiUnits(game, 1, 'counter_drone_team');
    run(game, ADAPTATION.retrainTicks + ADAPTATION.retrainDuration + 2);
    expect(game.world.factions.ai.resist.red_team).toBe(first - ADAPTATION.decay);
    expect(game.world.factions.ai.resist.counter_drone_team).toBe(ADAPTATION.perDeath);
  });

  it('retraining costs compute while it runs', () => {
    const game = newGame();
    killAiUnits(game, 1, 'red_team');
    run(game, 3);
    expect(game.world.factions.ai.compute).toBeLessThan(game.world.factions.human.compute);
  });
});

describe('commands', () => {
  it('invalid commands are rejected and change nothing', () => {
    const game = newGame();
    const enemy = units(game.world).find((u) => u.faction === 'ai')!;
    const before = hashWorld(game.world);
    expect(applyCommand(game.world, 'human', { type: 'move', units: [enemy.id], x: TILE, y: TILE })).toBe('no valid units');
    expect(applyCommand(game.world, 'human', { type: 'move', units: [], x: -5, y: 0 })).toBe('position out of bounds');
    expect(applyCommand(game.world, 'human', { type: 'build', units: [], building: 'training_cluster', x: TILE, y: TILE })).toMatch(/cannot build/);
    expect(applyCommand(game.world, 'human', { type: 'attackSector', sector: 'ZZ' as never })).toBe('invalid sector');
    expect(hashWorld(game.world)).toBe(before);
  });

  it('high-level orders expand into unit orders for every controller', () => {
    const game = newGame();
    const a = spawnUnit(game.world, 'counter_drone_team', 'human', 6 * TILE, 20 * TILE);
    expect(command(game, 'human', { type: 'attackSector', sector: 'E' })).toBeNull();
    expect(a.order.type).toBe('attackMove');
    expect(command(game, 'ai', { type: 'expand' })).toBeNull();
    expect(units(game.world).some((u) => u.faction === 'ai' && u.order.type === 'claim')).toBe(true);
  });
});

describe('fairness of resolution order', () => {
  it('identical units spawned in either order trade blows simultaneously', () => {
    const game = newGame();
    const a = spawnUnit(game.world, 'red_team', 'human', 20 * TILE, 5 * TILE);
    const b = spawnUnit(game.world, 'red_team', 'ai', 23 * TILE, 5 * TILE);
    a.hp = 10;
    b.hp = 10;
    run(game, 5);
    // Both fired on the same tick: both dead, not just the later-spawned one.
    expect(game.world.entities.has(a.id)).toBe(false);
    expect(game.world.entities.has(b.id)).toBe(false);
  });
});
