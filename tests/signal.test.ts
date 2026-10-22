import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { inSignal, SIGNAL, spawnBuilding, spawnUnit, TILE } from '../src/sim/index.ts';
import { newGame, run } from './helpers.ts';

// Proposal 0001 (signal range): hijacked machines need a control link to the Model. Off by default.
describe('signal range (proposal, behind SIGNAL.enabled)', () => {
  beforeEach(() => { SIGNAL.enabled = true; });
  afterEach(() => { SIGNAL.enabled = false; });

  it('AI-owned sites, AI buildings and AI-lit fiber give signal; neutral ground does not', () => {
    const game = newGame();
    const core = game.world.sites.get('a_core')!;
    expect(inSignal(game.world, core.x, core.y)).toBe(true);
    expect(inSignal(game.world, 24 * TILE, 16 * TILE)).toBe(false);
    game.world.sites.get('mid_router')!.owner = 'ai';
    run(game, 1); // coverage is computed once per tick
    expect(inSignal(game.world, 24 * TILE, 16 * TILE)).toBe(true);
    const relay = spawnBuilding(game.world, 'signal_relay', 'ai', 12 * TILE, 4 * TILE);
    expect(inSignal(game.world, 12 * TILE, 4 * TILE)).toBe(false); // not built yet
    relay.built = true;
    run(game, 1);
    expect(inSignal(game.world, 12 * TILE, 4 * TILE)).toBe(true);
    // 7 tiles north of the a_router - mid_router fiber, farther than 8 tiles from either end.
    game.world.sites.get('mid_router')!.owner = null;
    run(game, 1);
    const link = game.world.links.find((l) => l.a === 'a_router' && l.b === 'mid_router')!;
    expect(inSignal(game.world, 30 * TILE, 9 * TILE)).toBe(false);
    link.owner = 'ai';
    run(game, 1);
    expect(inSignal(game.world, 30 * TILE, 9 * TILE)).toBe(true);
  });

  it('AI combat units stop at the edge of signal instead of leaving it', () => {
    const game = newGame();
    const core = game.world.sites.get('a_core')!;
    const u = spawnUnit(game.world, 'botnet_swarm', 'ai', core.x, core.y);
    u.order = { type: 'move', x: 6 * TILE, y: 16 * TILE };
    run(game, 600);
    expect(inSignal(game.world, u.x, u.y)).toBe(true);
    expect(u.x).toBeGreaterThan(core.x - SIGNAL.range - TILE);
  });

  it('an AI combat unit that loses signal returns toward it (lost-link failsafe)', () => {
    const game = newGame();
    const u = spawnUnit(game.world, 'botnet_swarm', 'ai', 20 * TILE, 16 * TILE);
    expect(inSignal(game.world, u.x, u.y)).toBe(false);
    run(game, 400);
    expect(inSignal(game.world, u.x, u.y)).toBe(true);
  });

  it('Maintenance Drones run autonomous routines and ignore signal range', () => {
    const game = newGame();
    const core = game.world.sites.get('a_core')!;
    const d = spawnUnit(game.world, 'maintenance_drone', 'ai', core.x, core.y);
    d.order = { type: 'move', x: 6 * TILE, y: 16 * TILE };
    run(game, 900);
    expect(inSignal(game.world, d.x, d.y)).toBe(false);
  });

  it('has no effect while disabled', () => {
    SIGNAL.enabled = false;
    const game = newGame();
    const u = spawnUnit(game.world, 'botnet_swarm', 'ai', 20 * TILE, 16 * TILE);
    u.order = { type: 'move', x: 16 * TILE, y: 16 * TILE };
    run(game, 200);
    expect(u.x).toBe(16 * TILE);
  });
});
