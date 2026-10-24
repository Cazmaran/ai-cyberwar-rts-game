import { describe, expect, it } from 'vitest';
import { createScriptedBot, TRAINING } from '../src/ai/scripted.ts';
import { buildings, factionView, spawnBuilding, spawnUnit, TICK_RATE, TILE, type Command } from '../src/sim/index.ts';
import { newGame } from './helpers.ts';

/** AI owns everything on its half except a_router_fwd, which the human holds: the only site left to claim. */
function setup() {
  const game = newGame();
  for (const s of game.world.sites.values()) if (s.kind !== 'core') s.owner = s.id === 'a_router_fwd' ? 'human' : 'ai';
  for (const l of game.world.links) l.owner = 'ai';
  const core = buildings(game.world).find((b) => b.type === 'primary_cluster')!;
  spawnBuilding(game.world, 'training_cluster', 'ai', core.x + 2 * TILE, core.y + 4 * TILE);
  const fwd = game.world.sites.get('a_router_fwd')!;
  spawnUnit(game.world, 'maintenance_drone', 'ai', fwd.x + 3 * TILE, fwd.y); // keeps the router in sight
  const guards = Array.from({ length: 3 }, (_, i) => spawnUnit(game.world, 'red_team', 'human', fwd.x - TILE, fwd.y + (i - 1) * TILE));
  return { game, guards };
}
const claims = (cmds: Command[]) => cmds.filter((c) => c.type === 'claim' && c.site === 'a_router_fwd');

describe('scripted bot and guarded sites', () => {
  // Replay seed10390: after the human took a_router_fwd and parked an army on it, the AI sent a fresh
  // drone to retake it every ~25 s for six minutes. About 15 drones died; the AI ran on 0-1 workers.
  it('does not send workers to claim a site enemy combat units are guarding', () => {
    const { game } = setup();
    const bot = createScriptedBot('ai', TRAINING, 1);
    expect(claims(bot.decide(factionView(game.world, 'ai')))).toEqual([]);
  });

  it('remembers a guarded site for a while after the guards drop out of sight', () => {
    const { game, guards } = setup();
    const bot = createScriptedBot('ai', TRAINING, 1);
    bot.decide(factionView(game.world, 'ai'));
    for (const g of guards) game.world.entities.delete(g.id);

    game.world.tick += 20 * TICK_RATE;
    expect(claims(bot.decide(factionView(game.world, 'ai')))).toEqual([]);
    game.world.tick += 60 * TICK_RATE;
    expect(claims(bot.decide(factionView(game.world, 'ai')))).toHaveLength(1);
  });
});
