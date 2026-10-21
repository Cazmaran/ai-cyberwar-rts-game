import { describe, expect, it } from 'vitest';
import { createScriptedBot, STRATEGIES } from '../src/ai/scripted.ts';
import { runMatch } from '../src/harness/match.ts';
import { hashWorld, runReplay, TICK_RATE, toReplay } from '../src/sim/index.ts';

const bots = (seed: number) => ({
  human: createScriptedBot('human', STRATEGIES.boom!, seed),
  ai: createScriptedBot('ai', STRATEGIES.rush!, seed),
});

describe('match harness', () => {
  it('bot matches are deterministic and replay exactly', () => {
    const a = runMatch({ seed: 5, maxTicks: 4000, ...bots(5) });
    const b = runMatch({ seed: 5, maxTicks: 4000, ...bots(5) });
    expect(hashWorld(a.game.world)).toBe(hashWorld(b.game.world));
    expect(hashWorld(runReplay(toReplay(a.game)).world)).toBe(hashWorld(a.game.world));
  });

  it('enforces the APM cap for non-human controllers', () => {
    const apm = 60;
    const r = runMatch({ seed: 2, maxTicks: 6000, apm, ...bots(2) });
    const minute = 60 * TICK_RATE;
    for (const faction of ['human', 'ai'] as const) {
      const perMinute = new Map<number, number>();
      for (const c of r.game.log.concat(r.game.rejected.map((x) => x.cmd))) {
        if (c.faction !== faction) continue;
        const m = Math.trunc(c.tick / minute);
        perMinute.set(m, (perMinute.get(m) ?? 0) + 1);
      }
      expect(perMinute.size).toBeGreaterThan(0);
      // Up to 5 banked actions may spill into a minute on top of the steady rate.
      for (const n of perMinute.values()) expect(n).toBeLessThanOrEqual(apm + 5);
    }
  });

  it('applies commands a reaction delay after the decision', () => {
    const r = runMatch({ seed: 3, maxTicks: 3000, decisionInterval: 10, reactionDelay: 3, ...bots(3) });
    expect(r.game.log.length).toBeGreaterThan(0);
    for (const c of r.game.log) expect(c.tick % 10).toBe(3);
  });
});
