import { describe, expect, it } from 'vitest';
import { BRUTAL, createScriptedBot, OPPONENTS, STRATEGIES } from '../src/ai/scripted.ts';
import { runMatch } from '../src/harness/match.ts';

describe('brutal opponent', () => {
  it('is selectable as an opponent but stays out of the balance strategies', () => {
    expect(OPPONENTS.brutal).toBe(BRUTAL);
    expect(Object.values(STRATEGIES)).not.toContain(BRUTAL);
  });

  // Same commands, APM cap and reaction delay as every bot: it wins on economy and play, not cheats.
  it('beats every bot strategy in most matches', () => {
    for (const human of Object.values(STRATEGIES)) {
      let wins = 0;
      for (let seed = 1; seed <= 4; seed++) {
        const r = runMatch({ seed, human: createScriptedBot('human', human, seed), ai: createScriptedBot('ai', BRUTAL, seed + 7919) });
        if (r.winner === 'ai') wins++;
      }
      expect(wins, `brutal vs human ${human.name}`).toBeGreaterThanOrEqual(3);
    }
  }, 60_000);
});
