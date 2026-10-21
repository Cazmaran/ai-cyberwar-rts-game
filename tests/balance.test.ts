import { describe, expect, it } from 'vitest';
import { counterChecks } from '../src/harness/balance.ts';
import { MILLI } from '../src/sim/index.ts';

describe('balance: counters (Tenet 4)', () => {
  it('every unit beats the role it counters at equal cost', () => {
    const failed = counterChecks(300 * MILLI, 4).filter((c) => !c.ok);
    expect(failed).toEqual([]);
  });
});
