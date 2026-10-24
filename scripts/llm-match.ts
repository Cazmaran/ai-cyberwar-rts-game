// Full headless matches: an LLM General (local Ollama model) plays the AI side against scripted human bots.
// The sim waits while the model thinks; its measured latency still costs game ticks (lockstep).
// Prints per-match results and the Gate 2 numbers (D-018): win rate, gap to the attack-every-turn
// control on the same seeds, invalid-command rate, p95 latency.
// Usage: npm run llm-match -- --model qwen3:8b [--matches 30] [--seed 1] [--human all|boom|rush|turtle] [--base boom]
//   [--minutes 20] [--no-think] [--chat] [--with-control] [--control]
// --with-control: also play the control on the same seeds and report the gap. --control: control only, no model.
import { parseArgs } from 'node:util';
import { createLlmBrain, createOllamaClient } from '../src/ai/llm/client.ts';
import { createControl } from '../src/ai/llm/control.ts';
import { createGeneral, type TurnLog } from '../src/ai/llm/general.ts';
import { turnStats } from '../src/ai/llm/stats.ts';
import type { Controller } from '../src/ai/controller.ts';
import { createScriptedBot, STRATEGIES } from '../src/ai/scripted.ts';
import { runMatchAsync } from '../src/harness/match.ts';
import { TICK_RATE } from '../src/sim/index.ts';

const { values } = parseArgs({
  options: {
    model: { type: 'string', default: 'qwen3:8b' },
    url: { type: 'string', default: process.env.OLLAMA_URL ?? 'http://localhost:11434' },
    matches: { type: 'string', default: '3' },
    seed: { type: 'string', default: '1' },
    human: { type: 'string', default: 'all' },
    base: { type: 'string', default: 'boom' },
    minutes: { type: 'string', default: '20' },
    'no-think': { type: 'boolean', default: false },
    chat: { type: 'boolean', default: false },
    'with-control': { type: 'boolean', default: false },
    control: { type: 'boolean', default: false },
  },
});
const opponents = values.human === 'all' ? Object.values(STRATEGIES) : [STRATEGIES[values.human]];
const base = STRATEGIES[values.base];
if (!base || opponents.some((o) => !o)) {
  console.error(`unknown strategy; choose from: all, ${Object.keys(STRATEGIES).join(', ')}`);
  process.exit(2);
}

const client = createOllamaClient({ model: values.model, url: values.url, ...(values['no-think'] ? { think: false } : {}) });
const n = Number(values.matches);
const maxTicks = Number(values.minutes) * 60 * TICK_RATE;
const pct = (x: number, of: number) => Math.round((x * 100) / of);

/** Plays `n` seeds against one opponent; returns AI wins. */
async function play(label: string, make: (seed: number) => Controller, human: typeof base, verbose: boolean): Promise<number> {
  let wins = 0;
  for (let i = 0; i < n; i++) {
    const seed = Number(values.seed) + i;
    const ai = make(seed);
    const start = performance.now();
    const r = await runMatchAsync({ seed, maxTicks, human: createScriptedBot('human', human!, seed), ai });
    if (r.winner === 'ai') wins++;
    if (verbose && 'log' in ai) {
      const log = ai.log as TurnLog[];
      logs.push(...log);
      const s = turnStats(log);
      console.log(`  ${label} seed ${seed}: winner=${r.winner ?? 'draw'} after ${(r.ticks / TICK_RATE / 60).toFixed(1)} min | ${s.turns} turns, `
        + `invalid ${s.invalidPct}%, fallbacks ${s.fallbacks.late}/${s.fallbacks.invalid}/${s.fallbacks.error} (late/invalid/error), p95 ${s.p95 ?? '-'} s | `
        + `${Math.round((performance.now() - start) / 1000)} s wall`);
      if (values.chat) for (const t of log) for (const m of t.chat) console.log(`    [${Math.trunc(t.tick / TICK_RATE)}s] ${m}`);
    }
  }
  return wins;
}

const logs: TurnLog[] = [];
const model = (seed: number) => createGeneral('ai', createLlmBrain(client, 'ai'), base, { seed, lockstep: true });
const control = (seed: number) => createControl('ai', base, seed);
const runModel = !values.control;
const runControl = values.control || values['with-control'];
let modelWins = 0;
let controlWins = 0;
console.log(`${runModel ? client.name : 'control'} (base ${base.name}) vs scripted ${opponents.map((o) => o!.name).join(', ')}, ${n} seeds each`);
for (const human of opponents) {
  const m = runModel ? await play(human!.name, model, human, true) : 0;
  const c = runControl ? await play(human!.name, control, human, false) : 0;
  modelWins += m;
  controlWins += c;
  console.log(`vs ${human!.name}: ${runModel ? `General ${pct(m, n)}%` : ''}${runModel && runControl ? ' | ' : ''}${runControl ? `control ${pct(c, n)}%` : ''}`);
}
const total = n * opponents.length;
const s = turnStats(logs);
if (runModel) {
  console.log(`General ${pct(modelWins, total)}% overall | invalid-command rate ${s.invalidPct}% (${s.rejected}/${s.orders}) | latency p50 ${s.p50 ?? '-'} s, p95 ${s.p95 ?? '-'} s`);
}
if (runControl) console.log(`control ${pct(controlWins, total)}% overall`);
if (runModel && runControl) {
  const gap = pct(modelWins, total) - pct(controlWins, total);
  console.log(`Gate 2 (D-018): gap to control ${gap} points (need >= 15, >= 30 seeds per opponent), invalid < 2%, p95 < 3 s`);
}
