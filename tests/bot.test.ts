import { describe, expect, it } from 'vitest';
import { createScriptedBot, STRATEGIES } from '../src/ai/scripted.ts';
import { runMatch } from '../src/harness/match.ts';
import { advance, applyCommand, buildings, factionView, FAIRNESS, spawnUnit, TILE, type Command } from '../src/sim/index.ts';
import { newGame } from './helpers.ts';

const rushMirror = () => runMatch({
  seed: 1, maxTicks: 1200,
  human: createScriptedBot('human', STRATEGIES.rush!, 1), ai: createScriptedBot('ai', STRATEGIES.rush!, 7919),
});
const orders = (cmds: Command[]) => cmds.filter((c) => c.type === 'attack' || c.type === 'attackMove');

describe('scripted bot', () => {
  // At the APM cap a bot gets about one action per decision. Re-issuing the same defense order every
  // decision starved production and worker jobs, so defenders lost every early fight (balance journal).
  it('does not re-issue defense orders to units already fighting the threat', () => {
    const game = newGame();
    const noc = buildings(game.world).find((b) => b.type === 'noc')!;
    for (let i = 0; i < 3; i++) spawnUnit(game.world, 'counter_drone_team', 'human', noc.x + 2 * TILE, noc.y + i * TILE);
    for (let i = 0; i < 3; i++) spawnUnit(game.world, 'botnet_swarm', 'ai', noc.x + 8 * TILE, noc.y + i * 3 * TILE);
    const bot = createScriptedBot('human', STRATEGIES.boom!, 1);

    const first = orders(bot.decide(factionView(game.world, 'human')));
    expect(first).toHaveLength(1);
    applyCommand(game.world, 'human', first[0]!);
    advance(game);

    expect(orders(bot.decide(factionView(game.world, 'human')))).toHaveLength(0);
  });

  // The bot sees the world a reaction delay late, so its last order is not visible yet at the next decision.
  it('does not repeat a command while the previous one is still pending', () => {
    const r = rushMirror();
    for (const faction of ['human', 'ai'] as const) {
      const cmds = r.game.log.concat(r.game.rejected.map((x) => x.cmd)).filter((c) => c.faction === faction);
      const repeats = cmds.filter((c, i) => cmds.slice(0, i).some((p) =>
        c.tick - p.tick <= FAIRNESS.reactionDelay && JSON.stringify(p.command) === JSON.stringify(c.command)));
      expect(repeats).toEqual([]);
    }
  });

  it('does not spend Data it has already committed (no rejected orders in the opening)', () => {
    const r = rushMirror();
    expect(r.game.rejected.filter((x) => x.cmd.tick < 60 * 20)).toEqual([]);
  });
});
