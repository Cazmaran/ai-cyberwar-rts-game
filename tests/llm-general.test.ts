import { describe, expect, it } from 'vitest';
import { createGeneral, directed, type Brain } from '../src/ai/llm/general.ts';
import { createScriptedBot, STRATEGIES } from '../src/ai/scripted.ts';
import { runMatch } from '../src/harness/match.ts';
import type { Controller } from '../src/ai/controller.ts';

// Phase 2 (M2.3): LLM turns steer a scripted operational layer; bad or missing turns fall back to it.
const boom = STRATEGIES.boom!;
const match = (ai: Controller, minutes = 6) => runMatch({
  seed: 5, maxTicks: minutes * 60 * 20, human: createScriptedBot('human', boom, 5), ai,
}).game;
const turnOf = (...orders: unknown[]) => JSON.stringify({ orders });

describe('LLM General', () => {
  it.each<[string, Brain, string]>([
    ['late', () => null, 'late'],
    ['invalid', () => '{"orders":[{"tool":"launch_nukes"}]}', 'invalid'],
    ['garbage', () => 'I attack now!', 'invalid'],
    ['crashing', () => { throw new Error('connection refused'); }, 'error'],
  ])('a %s brain falls back to plain scripted play, command for command', (_, brain, why) => {
    const general = createGeneral('ai', brain, boom, { seed: 5 });
    const withGeneral = match(general);
    const scripted = match(createScriptedBot('ai', boom, 5));
    expect(withGeneral.log).toEqual(scripted.log);
    expect(general.log.length).toBeGreaterThan(10);
    expect(general.log.every((t) => t.fallback === why)).toBe(true);
  });

  it('applies every ordered command despite the APM cap, ahead of scripted orders', () => {
    const brain: Brain = ({ tick }) => tick === 0
      ? turnOf({ tool: 'train', args: { unit: 'maintenance_drone', count: 1 } }, { tool: 'expand', args: {} }, { tool: 'taunt', args: { message: 'hello, meat' } })
      : turnOf({ tool: 'wait', args: {} });
    const general = createGeneral('ai', brain, boom, { seed: 5 });
    const game = match(general, 1);
    const ai = game.log.filter((c) => c.faction === 'ai').map((c) => c.command.type);
    expect(ai.slice(0, 2)).toEqual(['train', 'expand']);
    expect(general.log[0]).toMatchObject({ tick: 0, fallback: null, errors: [], chat: ['hello, meat'] });
  });

  it('keeps valid orders when some are invalid, and logs the rejects', () => {
    const general = createGeneral('ai', () => turnOf({ tool: 'expand', args: {} }, { tool: 'nuke' }), boom, { seed: 5 });
    match(general, 1);
    expect(general.log[0]).toMatchObject({ fallback: null, calls: [{ tool: 'expand', args: {} }] });
    expect(general.log[0]!.errors).toEqual(['order 2: unknown tool "nuke"']);
  });

  it('the directive steers the operational layer: an all-zero army mix trains no army, and attacks are left to the General', () => {
    const brain: Brain = () => turnOf({ tool: 'set_army_mix', args: { fast: 0, ranged: 0, tank: 0 } });
    const game = match(createGeneral('ai', brain, boom, { seed: 5 }), 8);
    const trained = game.log.filter((c) => c.faction === 'ai' && c.command.type === 'train').map((c) => c.command.type === 'train' && c.command.unit);
    expect(trained.length).toBeGreaterThan(0);
    expect(trained.every((u) => u === 'maintenance_drone')).toBe(true);
    expect(directed(boom, {}).attackValue).toBe(Infinity);
    expect(directed(boom, { workers: 3, mix: { tank: 1 } })).toMatchObject({ workers: 3, racks: boom.racks, mix: { tank: 1 }, counterBuild: false });
  });

  it('is deterministic for a deterministic brain', () => {
    const brain: Brain = ({ tick, digest }) => turnOf(
      { tool: 'set_build_plan', args: { workers: 6, racks: 1, defenses: 2 } },
      ...(digest.threats.length > 0 ? [{ tool: 'defend_sector', args: { sector: digest.threats[0]!.sector } }] : []),
      ...(tick >= 3 * 60 * 20 ? [{ tool: 'attack_sector', args: { sector: 'W' } }] : []),
    );
    const a = match(createGeneral('ai', brain, boom, { seed: 5 }));
    const b = match(createGeneral('ai', brain, boom, { seed: 5 }));
    expect(a.log).toEqual(b.log);
    expect(a.log.some((c) => c.faction === 'ai' && c.command.type === 'attackSector')).toBe(true);
  });
});
