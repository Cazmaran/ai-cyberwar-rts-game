// Headless match runner. Usage: npm run sim -- --matches 10 --minutes 20 --seed 1 [--max-ms 10000]
// --max-ms: performance budget per match; exits non-zero if any match is slower (used by CI).
import { parseArgs } from 'node:util';
import { createWorld, hashWorld, step, TICK_RATE } from '../src/sim/world.ts';

const { values } = parseArgs({
  options: {
    matches: { type: 'string', default: '1' },
    minutes: { type: 'string', default: '20' },
    seed: { type: 'string', default: '1' },
    'max-ms': { type: 'string' },
  },
});

const matches = Number(values.matches);
const ticks = Number(values.minutes) * 60 * TICK_RATE;
const baseSeed = Number(values.seed);
const maxMs = values['max-ms'] === undefined ? Infinity : Number(values['max-ms']);

const start = performance.now();
let slowest = 0;
for (let i = 0; i < matches; i++) {
  const matchStart = performance.now();
  const world = createWorld(baseSeed + i);
  for (let t = 0; t < ticks; t++) step(world);
  const ms = performance.now() - matchStart;
  slowest = Math.max(slowest, ms);
  console.log(`match ${i + 1}: seed ${world.seed} -> ${hashWorld(world)} (${ms.toFixed(0)} ms)`);
}
console.log(`${matches} match(es), ${ticks} ticks each, ${(performance.now() - start).toFixed(0)} ms`);

if (slowest > maxMs) {
  console.error(`FAIL: slowest match took ${slowest.toFixed(0)} ms, budget is ${maxMs} ms`);
  process.exit(1);
}
