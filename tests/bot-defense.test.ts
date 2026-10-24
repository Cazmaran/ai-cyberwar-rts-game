import { describe, expect, it } from 'vitest';
import { createScriptedBot, TRAINING } from '../src/ai/scripted.ts';
import { buildings, factionView, issue, spawnBuilding, spawnUnit, TILE } from '../src/sim/index.ts';
import { newGame, run } from './helpers.ts';

describe('scripted bot defense', () => {
  // Replay seed37884: Red Teams parked 9-11 tiles from the AI core. The training AI (no micro) sent its
  // defender to attack-move to its own core, where it saw nothing in range, went idle, and got the same
  // order again every second for over a minute.
  it('sends defenders at the threat once, instead of re-ordering them to the core every decision', () => {
    const game = newGame();
    const core = buildings(game.world).find((b) => b.type === 'primary_cluster')!;
    const robot = spawnUnit(game.world, 'industrial_robot', 'ai', core.x - 2 * TILE, core.y);
    for (let i = 0; i < 3; i++) spawnUnit(game.world, 'red_team', 'human', core.x - 10 * TILE, core.y + (i - 1) * TILE);
    spawnBuilding(game.world, 'server_rack', 'ai', core.x - 7 * TILE, core.y); // keeps the threat in sight
    const bot = createScriptedBot('ai', TRAINING, 1);

    let orders = 0;
    for (let d = 0; d < 15; d++) {
      for (const cmd of bot.decide(factionView(game.world, 'ai'))) {
        if ((cmd.type === 'attack' || cmd.type === 'attackMove') && cmd.units.includes(robot.id)) orders++;
        issue(game, 'ai', cmd);
      }
      run(game, 20);
    }
    expect(orders).toBe(1);
  });
});
