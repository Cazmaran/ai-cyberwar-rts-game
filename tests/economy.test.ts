import { describe, expect, it } from 'vitest';
import { ECONOMY, UNITS } from '../src/sim/data.ts';
import { updateEconomy } from '../src/sim/economy.ts';
import { spawnUnit, TILE } from '../src/sim/index.ts';
import { command, linkIndex, newGame, run, workersOf } from './helpers.ts';

function ownHomeNetwork(game: ReturnType<typeof newGame>) {
  const w = game.world;
  w.sites.get('h_src_n')!.owner = 'human';
  w.sites.get('h_src_s')!.owner = 'human';
  for (const [a, b] of [['h_core', 'h_router'], ['h_router', 'h_src_n'], ['h_router', 'h_src_s']] as const) {
    w.links[linkIndex(game, a, b)]!.owner = 'human';
  }
}

describe('data flow over links', () => {
  it('no income until a source is claimed and linked home', () => {
    const game = newGame();
    updateEconomy(game.world);
    expect(game.world.factions.human.income).toBe(0);
    ownHomeNetwork(game);
    updateEconomy(game.world);
    expect(game.world.factions.human.income).toBe(240);
  });

  it('a shared link is a bandwidth bottleneck', () => {
    const game = newGame();
    ownHomeNetwork(game);
    game.world.links[linkIndex(game, 'h_core', 'h_router')]!.bandwidth = 150;
    updateEconomy(game.world);
    expect(game.world.factions.human.income).toBe(150);
  });

  it('an enemy-held router stops forwarding; a neutral one forwards for everyone', () => {
    const game = newGame();
    ownHomeNetwork(game);
    game.world.sites.get('h_router')!.owner = 'ai';
    updateEconomy(game.world);
    expect(game.world.factions.human.income).toBe(0);
    game.world.sites.get('h_router')!.owner = null;
    updateEconomy(game.world);
    expect(game.world.factions.human.income).toBe(240);
  });

  it('workers claim a source and light links through commands', () => {
    const game = newGame();
    const [w1, w2] = workersOf(game, 'human');
    command(game, 'human', { type: 'claim', units: [w1!], site: 'h_src_n' });
    command(game, 'human', { type: 'lightLink', units: [w2!], link: linkIndex(game, 'h_core', 'h_router') });
    run(game, 400);
    expect(game.world.sites.get('h_src_n')!.owner).toBe('human');
    command(game, 'human', { type: 'lightLink', units: [w1!], link: linkIndex(game, 'h_router', 'h_src_n') });
    run(game, 300);
    expect(game.world.factions.human.income).toBe(120);
  });
});

describe('power and compute', () => {
  it('core supplies base power and compute; substations add power', () => {
    const game = newGame();
    updateEconomy(game.world);
    const h = game.world.factions.human;
    expect(h.powerCap).toBe(15);
    expect(h.compute).toBe(10);
    game.world.sites.get('h_sub')!.owner = 'human';
    updateEconomy(game.world);
    expect(h.powerCap).toBe(15 + ECONOMY.substationPower);
  });

  it('training costs data, takes work/compute ticks, and waits for power headroom', () => {
    const game = newGame();
    const core = [...game.world.entities.values()].find((e) => e.kind === 'building' && e.faction === 'human')!;
    const before = game.world.factions.human.data;
    expect(command(game, 'human', { type: 'train', building: core.id, unit: 'field_engineer' })).toBeNull();
    expect(game.world.factions.human.data).toBe(before - UNITS.field_engineer.cost);
    run(game, UNITS.field_engineer.work / 10 + 1);
    expect(workersOf(game, 'human')).toHaveLength(4);

    // Fill the power cap (15): 4 workers + 11 more units = 15 used.
    for (let i = 0; i < 11; i++) spawnUnit(game.world, 'field_engineer', 'human', 5 * TILE, 5 * TILE);
    command(game, 'human', { type: 'train', building: core.id, unit: 'field_engineer' });
    run(game, UNITS.field_engineer.work / 10 + 20);
    expect(workersOf(game, 'human')).toHaveLength(15);
    game.world.sites.get('h_sub')!.owner = 'human';
    run(game, 2);
    expect(workersOf(game, 'human')).toHaveLength(16);
  });
});

describe('contested claims', () => {
  it('no one makes progress while both sides claim the same site', () => {
    const game = newGame();
    const h = spawnUnit(game.world, 'field_engineer', 'human', 24 * TILE, 15 * TILE);
    const a = spawnUnit(game.world, 'maintenance_drone', 'ai', 24 * TILE, 17 * TILE);
    command(game, 'human', { type: 'claim', units: [h.id], site: 'mid_router' });
    command(game, 'ai', { type: 'claim', units: [a.id], site: 'mid_router' });
    run(game, 300);
    expect(game.world.sites.get('mid_router')!.owner).toBeNull();
    command(game, 'ai', { type: 'stop', units: [a.id] });
    run(game, 120);
    expect(game.world.sites.get('mid_router')!.owner).toBe('human');
  });
});
