// Headless match runner. Usage: npm run sim -- --matches 10 --minutes 20 --seed 1
import { parseArgs } from 'node:util';
import { createWorld, hashWorld, step, TICK_RATE } from '../src/sim/world.ts';

const { values } = parseArgs({
  options: {
    matches: { type: 'string', default: '1' },
    minutes: { type: 'string', default: '20' },
    seed: { type: 'string', default: '1' },
  },
});

const matches = Number(values.matches);
const ticks = Number(values.minutes) * 60 * TICK_RATE;
const baseSeed = Number(values.seed);

const start = performance.now();
for (let i = 0; i < matches; i++) {
  const world = createWorld(baseSeed + i);
  for (let t = 0; t < ticks; t++) step(world);
  console.log(`match ${i + 1}: seed ${world.seed} -> ${hashWorld(world)}`);
}
console.log(`${matches} match(es), ${ticks} ticks each, ${(performance.now() - start).toFixed(0)} ms`);
