// The LLM General (Phase 2, M2.3): three tiers in one controller. Every `turnInterval` ticks the brain
// (an LLM, or a stub in tests) reads the digest and gives orders; a scripted bot is the operational
// layer between turns, steered by the General's standing directive. A late or fully invalid turn means
// plain scripted behavior until the next turn. Every turn is logged.
import { digestView, TICK_RATE, type Command, type Digest, type Faction, type FactionView } from '../../sim/index.ts';
import type { Controller } from '../controller.ts';
import { createScriptedBot, type Strategy } from '../scripted.ts';
import { planTurn, type Directive } from './plan.ts';
import { parseTurn, type ToolCall } from './tools.ts';

/** The model's raw reply for one turn (JSON text or object), or null when no reply arrived in time. */
export type Brain = (turn: { tick: number; digest: Digest }) => unknown;

export interface TurnLog {
  tick: number;
  reply: unknown;
  calls: ToolCall[];
  /** Schema errors and orders that could not be carried out. */
  errors: string[];
  /** Why this cycle runs on plain scripted behavior, if it does. */
  fallback: 'late' | 'invalid' | 'error' | null;
  chat: string[];
}

export interface General extends Controller {
  readonly log: TurnLog[];
}

/** Default ticks between LLM turns: 20 s, inside the roadmap's 15-30 s strategy cadence. */
export const TURN_INTERVAL = 20 * TICK_RATE;

/** The scripted strategy while the General is in command: its directive applied, attacks left to the General. */
export function directed(base: Strategy, d: Directive): Strategy {
  return {
    ...base,
    workers: d.workers ?? base.workers,
    racks: d.racks ?? base.racks,
    defenses: d.defenses ?? base.defenses,
    barricades: d.barricades ?? base.barricades,
    // An explicit mix is followed as given, not shifted by scouting.
    ...(d.mix ? { mix: d.mix, counterBuild: false } : {}),
    attackValue: Infinity,
  };
}

export function createGeneral(
  faction: Faction, brain: Brain, base: Strategy, opts: { seed?: number; turnInterval?: number; name?: string } = {},
): General {
  const ops = createScriptedBot(faction, base, opts.seed);
  const interval = opts.turnInterval ?? TURN_INTERVAL;
  const log: TurnLog[] = [];
  let directive: Directive = {};
  let nextTurn = 0;
  /** LLM commands waiting to go out, one per decision so the APM cap never drops them. */
  let outbox: Command[] = [];

  return {
    name: opts.name ?? `general(${base.name})`,
    log,
    decide(view: FactionView): Command[] {
      if (view.tick >= nextTurn) {
        nextTurn = view.tick + interval;
        let reply: unknown = null;
        let crashed: string | null = null;
        try {
          reply = brain({ tick: view.tick, digest: digestView(view) });
        } catch (e) {
          crashed = String(e);
        }
        const entry: TurnLog = { tick: view.tick, reply, calls: [], errors: [], fallback: null, chat: [] };
        if (crashed) {
          entry.fallback = 'error';
          entry.errors.push(crashed);
        } else if (reply === null || reply === undefined) {
          entry.fallback = 'late';
        } else {
          const { calls, errors } = parseTurn(faction, reply);
          entry.calls = calls;
          entry.errors = errors;
          if (calls.length === 0 && errors.length > 0) entry.fallback = 'invalid';
        }
        if (entry.fallback) {
          outbox = [];
          ops.strategy = base;
        } else {
          const plan = planTurn(view, entry.calls);
          entry.errors.push(...plan.errors);
          entry.chat = plan.chat;
          directive = { ...directive, ...plan.directive };
          outbox = plan.commands;
          ops.strategy = directed(base, directive);
        }
        log.push(entry);
      }
      const next = outbox.shift();
      const scripted = ops.decide(view);
      return next ? [next, ...scripted] : scripted;
    },
  };
}
