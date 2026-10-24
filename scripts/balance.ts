// Balance report (Tenet 4). Usage: npm run balance -- [--seeds 10] [--budget 300] [--gate]
// --gate: exit non-zero if any Gate 1 balance criterion fails.
import { parseArgs } from 'node:util';
import { STRATEGIES } from '../src/ai/scripted.ts';
import { COMBAT_UNITS, counterChecks, dominantUnits, duelMatrix, pressureTest, skillTest, tournament } from '../src/harness/balance.ts';
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
// Bot-vs-bot results are warnings, not gate failures: the owner's playtests judge skill and strategy (D-015).
const warnings: string[] = [];

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
const cells = tournament(seeds);
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
    if (p > 65) warnings.push(`${side} ${n} wins ${Math.round(p)}% overall (target max 65%)`);
  }
}

// D-018: mirrors must be fair to both sides, or a General gets wins it didn't earn.
for (const n of names) {
  const p = cells.find((c) => c.human === n && c.ai === n)!.humanWinPct;
  if (p < 40 || p > 60) warnings.push(`${n} mirror: human wins ${p}% (target 40-60%)`);
}

console.log('\n== Pressure test: attack-every-turn control vs each scripted strategy (control target max 60%) ==');
for (const r of pressureTest(seeds)) {
  console.log(`${r.controlWinPct <= 60 ? 'ok  ' : 'weak'} ${r.side} ${r.strategy}: control wins ${r.controlWinPct}%`);
  if (r.controlWinPct > 60) warnings.push(`${r.side} ${r.strategy} loses to the control: ${r.controlWinPct}% (target max 60%)`);
}

console.log('\n== Skill test: focus-fire micro vs attack-move only, identical builds (target >= 70%) ==');
for (const s of Object.values(STRATEGIES)) {
  const p = skillTest(s, seeds);
  console.log(`${p >= 70 ? 'ok  ' : 'low '} ${s.name}: skilled side wins ${p}%`);
  if (p < 70) warnings.push(`skill test ${s.name}: ${p}% (target 70%)`);
}

if (warnings.length) console.log(`\nWARNINGS (${warnings.length}), bot proxies for the owner's playtests:\n- ${warnings.join('\n- ')}`);
console.log(failures.length ? `\nGATE FAILURES (${failures.length}):\n- ${failures.join('\n- ')}` : '\nAll hard balance criteria pass (duel matrix and counters).');
if (values.gate && failures.length) process.exit(1);
