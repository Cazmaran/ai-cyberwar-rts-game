// Full headless matches: an LLM General (local Ollama model) plays the AI side against a scripted human bot.
// The sim waits while the model thinks; its measured latency still costs game ticks (lockstep).
// Prints per-match results and the Gate 2 numbers: win rate, invalid-command rate, p95 latency.
// Usage: npm run llm-match -- --model qwen3:8b [--matches 3] [--seed 1] [--human boom] [--base boom] [--minutes 20] [--no-think] [--chat] [--control]
import { parseArgs } from 'node:util';
import { createLlmBrain, createOllamaClient } from '../src/ai/llm/client.ts';
import { createGeneral, type Brain, type TurnLog } from '../src/ai/llm/general.ts';
import { turnStats } from '../src/ai/llm/stats.ts';
import { createScriptedBot, STRATEGIES } from '../src/ai/scripted.ts';
import { runMatchAsync } from '../src/harness/match.ts';
import { TICK_RATE } from '../src/sim/index.ts';

const { values } = parseArgs({
  options: {
    model: { type: 'string', default: 'qwen3:8b' },
    url: { type: 'string', default: process.env.OLLAMA_URL ?? 'http://localhost:11434' },
    matches: { type: 'string', default: '3' },
    seed: { type: 'string', default: '1' },
    human: { type: 'string', default: 'boom' },
    base: { type: 'string', default: 'boom' },
    minutes: { type: 'string', default: '20' },
    'no-think': { type: 'boolean', default: false },
    chat: { type: 'boolean', default: false },
    control: { type: 'boolean', default: false },
  },
});
const human = STRATEGIES[values.human];
const base = STRATEGIES[values.base];
if (!human || !base) {
  console.error(`unknown strategy; choose from: ${Object.keys(STRATEGIES).join(', ')}`);
  process.exit(2);
}

const client = createOllamaClient({ model: values.model, url: values.url, ...(values['no-think'] ? { think: false } : {}) });
/** --control: same harness, no model. Attacks the enemy core every turn, to show what the LLM adds beyond aggression. */
const attackOnly: Brain = ({ digest }) => JSON.stringify({ orders: [{ tool: 'attack_sector', args: { sector: digest.cores.enemy ?? 'C' } }] });
const wins = { human: 0, ai: 0, draw: 0 };
const logs: TurnLog[] = [];
console.log(`${values.control ? 'control (attack every turn)' : client.name} (base ${base.name}) vs scripted ${human.name}`);
for (let i = 0; i < Number(values.matches); i++) {
  const seed = Number(values.seed) + i;
  const general = createGeneral('ai', values.control ? attackOnly : createLlmBrain(client, 'ai'), base, { seed, lockstep: true });
  const start = performance.now();
  const r = await runMatchAsync({
    seed, maxTicks: Number(values.minutes) * 60 * TICK_RATE, human: createScriptedBot('human', human, seed), ai: general,
  });
  wins[r.winner ?? 'draw']++;
  logs.push(...general.log);
  const s = turnStats(general.log);
  console.log(`match ${i + 1}: seed ${seed} winner=${r.winner ?? 'draw'} after ${(r.ticks / TICK_RATE / 60).toFixed(1)} min | `
    + `${s.turns} turns, invalid ${s.invalidPct}%, fallbacks late ${s.fallbacks.late} / invalid ${s.fallbacks.invalid} / error ${s.fallbacks.error}, `
    + `p95 ${s.p95 ?? '-'} s | ${Math.round((performance.now() - start) / 1000)} s wall`);
  if (values.chat) for (const t of general.log) for (const m of t.chat) console.log(`  [${Math.trunc(t.tick / TICK_RATE)}s] ${m}`);
}
const s = turnStats(logs);
const n = Number(values.matches);
console.log(`General ${Math.round((wins.ai * 100) / n)}% | scripted ${Math.round((wins.human * 100) / n)}% | draw ${Math.round((wins.draw * 100) / n)}%`);
console.log(`invalid-command rate ${s.invalidPct}% (${s.rejected}/${s.orders}) | latency p50 ${s.p50 ?? '-'} s, p95 ${s.p95 ?? '-'} s | Gate 2: win >=55%, invalid <2%, p95 <3 s`);
