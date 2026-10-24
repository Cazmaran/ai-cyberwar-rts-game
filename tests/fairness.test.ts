import { describe, expect, it } from 'vitest';
import { duel } from '../src/harness/balance.ts';
import { MILLI, type UnitTypeId } from '../src/sim/index.ts';

// D-018 mirror fairness: the sim itself must not favor a side. Identical units in mirrored positions
// should split their fights. (Bug found 2026-10-24: units processed later saw enemies that had just
// stepped into range, or knew which enemies had already died this tick. Over 200 seeds the AI side,
// processed later, won up to 62% of identical fights. Adaptation is off here: it is a real AI advantage.)
describe('side fairness', () => {
  it.each<UnitTypeId>(['red_team', 'counter_drone_team', 'industrial_robot', 'hunter_drone', 'botnet_swarm', 'armored_vehicle'])(
    'identical %s armies split their fights', (type) => {
      const { winPct } = duel(type, type, 300 * MILLI, 200, false);
      expect(winPct).toBeGreaterThanOrEqual(40);
      expect(winPct).toBeLessThanOrEqual(60);
    }, 60000);
});
