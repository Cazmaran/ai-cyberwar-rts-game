import { describe, expect, it } from 'vitest';
import { createScriptedBot, STRATEGIES } from '../src/ai/scripted.ts';
import { createSession, tickSession } from '../src/harness/session.ts';
import { biggestGap, createStats, incomeGap, recordStats } from '../src/harness/stats.ts';

describe('match stats (post-match summary)', () => {
  it('records earnings, units trained and lost, and army value over time', () => {
    const s = createSession({ seed: 2, controllers: { human: createScriptedBot('human', STRATEGIES.rush!, 2), ai: createScriptedBot('ai', STRATEGIES.boom!, 2) } });
    const stats = createStats(100);
    while (s.game.world.tick < 4000 && s.game.world.winner === null) { tickSession(s); recordStats(stats, s.game.world); }
    for (const f of ['human', 'ai'] as const) {
      const t = stats.totals[f];
      expect(t.earned).toBeGreaterThan(0);
      expect(t.trained).toBeGreaterThan(0);
      expect(t.lost).toBeLessThanOrEqual(t.trained);
      expect(t.peakArmy).toBeGreaterThan(0);
    }
    expect(stats.samples.length).toBe(Math.trunc(s.game.world.tick / 100) + (s.game.world.winner ? 1 : 0));
  });

  it('finds when the opponent was furthest ahead', () => {
    const stats = createStats();
    const at = (tick: number, human: number, ai: number) => ({ tick, army: { human, ai }, income: { human: 0, ai: 0 }, sources: { human: 0, ai: 0 } });
    stats.samples.push(at(100, 200, 220), at(200, 100, 300), at(300, 50, 60));
    expect(biggestGap(stats, 'human')).toEqual({ tick: 200, ratio: 3, theirs: 300 });
    expect(biggestGap(stats, 'ai')).toBeNull();
    // With no army at all, report the opponent's army value instead of dividing by zero.
    stats.samples.push(at(400, 0, 1810));
    expect(biggestGap(stats, 'human')).toEqual({ tick: 400, ratio: null, theirs: 1810 });
  });

  it('finds when the opponent pulled ahead economically for at least a minute', () => {
    const stats = createStats(100);
    for (let t = 0; t <= 3000; t += 100) {
      const ahead = t >= 1400;
      stats.samples.push({ tick: t, army: { human: 0, ai: 0 }, income: { human: 6, ai: ahead ? 15 : 6 }, sources: { human: 2, ai: ahead ? 6 : 2 } });
    }
    expect(incomeGap(stats, 'human')).toEqual({ tick: 1400, yours: 6, theirs: 15, sources: [2, 6] });
  });
});
