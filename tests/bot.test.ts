import { describe, expect, it } from 'vitest';
import { createScriptedBot, STRATEGIES, TRAINING } from '../src/ai/scripted.ts';
import { runMatch } from '../src/harness/match.ts';
import { advance, applyCommand, buildings, factionView, FAIRNESS, spawnUnit, TILE, type Command } from '../src/sim/index.ts';
import { newGame } from './helpers.ts';

const rushMirror = () => runMatch({
  seed: 1, maxTicks: 1200,
  human: createScriptedBot('human', STRATEGIES.rush!, 1), ai: createScriptedBot('ai', STRATEGIES.rush!, 7919),
});
const orders = (cmds: Command[]) => cmds.filter((c) => c.type === 'attack' || c.type === 'attackMove');

describe('scripted bot', () => {
  // D-018 pressure test: raiders picked off workers at outlying sites while the army waited at home,
  // because bots only defended within 12 tiles of the core.
  it('defends a worker raided far from the core; the training bot does not', () => {
    const raid = () => {
      const game = newGame();
      const noc = buildings(game.world).find((b) => b.type === 'noc')!;
      spawnUnit(game.world, 'red_team', 'human', noc.x + 2 * TILE, noc.y);
      spawnUnit(game.world, 'field_engineer', 'human', noc.x + 14 * TILE, noc.y - 8 * TILE);
      const raider = spawnUnit(game.world, 'botnet_swarm', 'ai', noc.x + 15 * TILE, noc.y - 8 * TILE);
      return { view: factionView(game.world, 'human'), raider };
    };
    const { view, raider } = raid();
    expect(orders(createScriptedBot('human', STRATEGIES.boom!, 1).decide(view))).toEqual([expect.objectContaining({ target: raider.id })]);
    expect(orders(createScriptedBot('human', TRAINING, 1).decide(raid().view))).toEqual([]);
  });

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

  // Bots used to attack at N units. Human units cost more, so humans waited far longer than the AI.
  it('attacks once the army is worth the threshold in Data, whatever the unit count', () => {
    const game = newGame();
    const noc = buildings(game.world).find((b) => b.type === 'noc')!;
    // 9 Armored Vehicles: 900 Data, far fewer units than the old 14-unit boom threshold.
    for (let i = 0; i < 9; i++) spawnUnit(game.world, 'armored_vehicle', 'human', noc.x + 3 * TILE, noc.y + (i - 4) * TILE);
    const bot = createScriptedBot('human', STRATEGIES.boom!, 1);
    const cmds = bot.decide(factionView(game.world, 'human'));
    expect(cmds.some((c) => c.type === 'attackMove' && c.units.length === 9)).toBe(true);
  });

  // Replay seed78297: with every drone dead and a human army on its half, the AI sat on 500 Data and never
  // trained a worker again, so its economy could not recover.
  it('under pressure, a bot still rebuilds a minimal workforce', () => {
    const game = newGame();
    for (const e of [...game.world.entities.values()]) {
      if (e.kind === 'unit' && e.faction === 'ai') game.world.entities.delete(e.id);
    }
    const core = buildings(game.world).find((b) => b.type === 'primary_cluster')!;
    for (let i = 0; i < 4; i++) spawnUnit(game.world, 'counter_drone_team', 'human', core.x - 8 * TILE, core.y + i * TILE);
    game.world.factions.ai.data = 500 * 1000;
    const bot = createScriptedBot('ai', STRATEGIES.boom!, 1);
    const cmds = bot.decide(factionView(game.world, 'ai'));
    expect(cmds.some((c) => c.type === 'train' && c.unit === 'maintenance_drone')).toBe(true);
  });
});
