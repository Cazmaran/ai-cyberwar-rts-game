import { describe, expect, it } from 'vitest';
import { createScriptedBot, STRATEGIES } from '../src/ai/scripted.ts';
import { runMatch } from '../src/harness/match.ts';
import { digestView, factionView, spawnBuilding, spawnUnit, TILE } from '../src/sim/index.ts';
import { newGame } from './helpers.ts';

// Phase 2 (M2.1, issue #6): the compact state an LLM General reads each turn.
describe('state digest for the LLM General', () => {
  const midGame = () => runMatch({
    seed: 3, maxTicks: 4 * 60 * 20,
    human: createScriptedBot('human', STRATEGIES.boom!, 3), ai: createScriptedBot('ai', STRATEGIES.boom!, 3),
  }).game.world;

  it('is deterministic: the same view gives the same JSON string', () => {
    const w = midGame();
    expect(JSON.stringify(digestView(factionView(w, 'ai')))).toBe(JSON.stringify(digestView(factionView(w, 'ai'))));
  });

  it('stays small in a busy mid-game state', () => {
    const json = JSON.stringify(digestView(factionView(midGame(), 'ai')));
    expect(json.length).toBeLessThan(1600);
  });

  it('never leaks units hidden by fog of war', () => {
    const game = newGame();
    // A human army far from anything the AI can see.
    for (let i = 0; i < 5; i++) spawnUnit(game.world, 'armored_vehicle', 'human', 4 * TILE, (4 + i) * TILE);
    const d = digestView(factionView(game.world, 'ai'));
    expect(JSON.stringify(d)).not.toContain('armored_vehicle');
    expect(d.threats).toEqual([]);
  });

  it('reports economy, visible enemies by sector, and a threat level where enemies are near our assets', () => {
    const game = newGame();
    const core = game.world.sites.get('a_core')!;
    for (let i = 0; i < 4; i++) spawnUnit(game.world, 'armored_vehicle', 'human', core.x - 4 * TILE, core.y + i * TILE);
    const d = digestView(factionView(game.world, 'ai'));
    expect(d.you).toBe('ai');
    expect(d.economy).toMatchObject({ data: 260, power: { used: expect.any(Number), cap: expect.any(Number), full: false } });
    const east = d.sectors.find((s) => s.sector === 'E')!;
    expect(east.enemy).toMatchObject({ armored_vehicle: 4 });
    expect(d.threats[0]).toMatchObject({ sector: 'E', level: 'high' });
    // Sites carry their owner as the AI sees them; unseen ones say so.
    expect(d.sectors.flatMap((s) => s.sites).some((x) => x.endsWith('=unseen'))).toBe(true);
  });

  it('says where both cores are, our army value, and the worker total', () => {
    const game = newGame();
    const core = game.world.sites.get('a_core')!;
    spawnUnit(game.world, 'industrial_robot', 'ai', core.x, core.y + 2 * TILE);
    const d = digestView(factionView(game.world, 'ai'));
    expect(d.cores).toEqual({ ours: 'E', enemy: 'W' });
    expect(d.army).toBe(65);
    expect(d.workers.total).toBe(factionView(game.world, 'ai').units.filter((u) => u.role === 'worker').length);
    expect(digestView(factionView(game.world, 'human')).cores).toEqual({ ours: 'W', enemy: 'E' });
  });

  // Replay seed 88632: towers weren't counted, so the General saw no threat and sent units in one by one.
  it('counts visible enemy static defenses as enemy strength and threat', () => {
    const game = newGame();
    const [x, y] = [24 * TILE, 16 * TILE];
    spawnBuilding(game.world, 'security_post', 'human', x - 2 * TILE, y).built = true;
    spawnUnit(game.world, 'botnet_swarm', 'ai', x + 2 * TILE, y);
    const d = digestView(factionView(game.world, 'ai'));
    expect(d.sectors.find((s) => s.sector === 'C')!.enemyStrength).toBe(70);
    expect(d.threats.find((t) => t.sector === 'C')).toMatchObject({ enemy: 70, ours: 35, level: 'high' });
  });
});
