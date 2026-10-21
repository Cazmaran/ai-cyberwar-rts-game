// Balance report (Tenet 4). Usage: npm run balance -- [--seeds 10] [--budget 300] [--gate]
// --gate: exit non-zero if any Gate 1 balance criterion fails.
import { parseArgs } from 'node:util';
import { STRATEGIES } from '../src/ai/scripted.ts';
import { COMBAT_UNITS, counterChecks, dominantUnits, duelMatrix, skillTest, tournament } from '../src/harness/balance.ts';
import { MILLI } from '../src/sim/index.ts';

const { values } = parseArgs({
  options: {
    seeds: { type: 'string', default: '10' },
    budget: { type: 'string', default: '300' },
    gate: { type: 'boolean', default: false },
  },
});
const seeds = Number(values.seeds);
const budget = Number(values.budget) * MILLI;
const failures: string[] = [];

console.log(`\n== Duel matrix: row unit win % vs column unit, ${values.budget} Data each side, ${seeds} seeds ==`);
const m = duelMatrix(budget, seeds);
const short = (t: string) => t.slice(0, 9).padStart(9);
console.log(' '.repeat(18) + COMBAT_UNITS.map(short).join(' '));
for (const [a, row] of m) console.log(a.padEnd(18) + [...row.values()].map((p) => String(p).padStart(9)).join(' '));
const dominant = dominantUnits(m);
if (dominant.length) failures.push(`dominant units (beat everything): ${dominant.join(', ')}`);

console.log('\n== Counters (must win >= 70%) ==');
for (const c of counterChecks(budget, seeds)) {
  console.log(`${c.ok ? 'ok  ' : 'FAIL'} ${c.attacker} vs ${c.target}: ${c.winPct}%`);
  if (!c.ok) failures.push(`${c.attacker} should beat ${c.target} (${c.winPct}%)`);
}

console.log('\n== Strategy tournament: human win % (rows human strategy, cols AI strategy) ==');
const cells = tournament(Math.max(2, Math.trunc(seeds / 2)));
const names = Object.keys(STRATEGIES);
console.log(' '.repeat(8) + names.map((n) => n.padStart(14)).join(''));
for (const h of names) {
  console.log(h.padEnd(8) + names.map((a) => {
    const c = cells.find((x) => x.human === h && x.ai === a)!;
    return `${c.humanWinPct}% ${c.avgMinutes}m`.padStart(14);
  }).join(''));
}
// No strategy (on either side) may win more than 65% across all opponents.
for (const n of names) {
  const asHuman = cells.filter((c) => c.human === n).reduce((s, c) => s + c.humanWinPct, 0) / names.length;
  const asAi = cells.filter((c) => c.ai === n).reduce((s, c) => s + (100 - c.humanWinPct), 0) / names.length;
  for (const [side, p] of [['human', asHuman], ['ai', asAi]] as const) {
    if (p > 65) failures.push(`${side} ${n} wins ${Math.round(p)}% overall (max 65%)`);
  }
}

console.log('\n== Skill test: focus-fire micro vs attack-move only, same strategy (must win >= 70%) ==');
for (const s of Object.values(STRATEGIES)) {
  const p = skillTest(s, Math.max(2, Math.trunc(seeds / 2)));
  console.log(`${p >= 70 ? 'ok  ' : 'FAIL'} ${s.name}: skilled side wins ${p}%`);
  if (p < 70) failures.push(`skill test ${s.name}: ${p}%`);
}

console.log(failures.length ? `\nGATE FAILURES (${failures.length}):\n- ${failures.join('\n- ')}` : '\nAll balance gate criteria pass.');
if (values.gate && failures.length) process.exit(1);
