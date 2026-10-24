// The LLM General (Phase 2, M2.3): three tiers in one controller. Every `turnInterval` ticks the brain
// (an LLM, or a stub in tests) reads the digest and gives orders; a scripted bot is the operational
// layer between turns, steered by the General's standing directive. A late or fully invalid turn means
// plain scripted behavior until the next turn. Every turn is logged.
// Latency (M2.3b): a reply never applies on the tick it was asked for. Synchronous brains draw a latency
// in ticks from `latency` (seeded); async brains apply when their reply arrives, and the measured ticks
// are logged so headless runs can replay the same distribution.
import { createRng, digestView, TICK_RATE, type Command, type Digest, type Faction, type FactionView } from '../../sim/index.ts';
import type { Controller } from '../controller.ts';
import { createScriptedBot, type Strategy } from '../scripted.ts';
import { planTurn, type Directive } from './plan.ts';
import { parseTurn, type ToolCall } from './tools.ts';

/**
 * The model's raw reply for one turn (JSON text or object), or null for no reply. May return a Promise
 * (a real LLM call); headless matches never wait on promises, so they use synchronous brains plus `latency`.
 */
export type Brain = (turn: { tick: number; digest: Digest }) => unknown;

export interface TurnLog {
  /** Tick the turn was requested (the digest's tick). */
  tick: number;
  /** Ticks from request until the reply applied; null when no reply came in time. */
  latency: number | null;
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

export interface GeneralOptions {
  seed?: number;
  turnInterval?: number;
  /** Latency samples in ticks for a synchronous brain; pass `measuredLatencies()` of real games. */
  latency?: number[];
  /** Ticks to wait for a reply before the turn counts as late. */
  timeout?: number;
  name?: string;
}

/** Default ticks between LLM turns: 20 s, inside the roadmap's 15-30 s strategy cadence. */
export const TURN_INTERVAL = 20 * TICK_RATE;
/** Default latency of a synchronous brain: 2 s. */
export const DEFAULT_LATENCY = 2 * TICK_RATE;
/** Default wait for a reply: 10 s. (Gate 2 asks for p95 under 3 s.) */
export const TURN_TIMEOUT = 10 * TICK_RATE;

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

/** Ticks each answered turn took from request to apply, for replaying real latency in headless runs. */
export function measuredLatencies(log: TurnLog[]): number[] {
  return log.flatMap((t) => (t.latency === null ? [] : [t.latency]));
}

interface Pending {
  tick: number;
  /** Tick the reply applies; null while an async reply is still out. */
  readyAt: number | null;
  /** An async reply has arrived but no decision has seen it yet. */
  arrived: boolean;
  reply: unknown;
  crashed: string | null;
}

export function createGeneral(faction: Faction, brain: Brain, base: Strategy, opts: GeneralOptions = {}): General {
  const ops = createScriptedBot(faction, base, opts.seed);
  // Own stream, so latency draws never shift the scripted bot's choices.
  const rng = createRng((opts.seed ?? 1) ^ 0x5eed1a7e);
  const interval = opts.turnInterval ?? TURN_INTERVAL;
  const latency = opts.latency ?? [DEFAULT_LATENCY];
  const timeout = opts.timeout ?? TURN_TIMEOUT;
  const log: TurnLog[] = [];
  let directive: Directive = {};
  let nextTurn = 0;
  let pending: Pending | null = null;
  /** LLM commands waiting to go out, one per decision so the APM cap never drops them. */
  let outbox: Command[] = [];

  function request(view: FactionView): Pending {
    const p: Pending = { tick: view.tick, readyAt: null, arrived: false, reply: null, crashed: null };
    try {
      const reply = brain({ tick: view.tick, digest: digestView(view) });
      if (reply instanceof Promise) {
        reply.then((r) => { p.reply = r; }, (e) => { p.crashed = String(e); }).finally(() => { p.arrived = true; });
      } else {
        p.reply = reply;
        // No reply at all is known at once; an answer takes its (simulated) time.
        p.readyAt = reply === null || reply === undefined ? view.tick : view.tick + latency[rng.int(0, latency.length - 1)]!;
      }
    } catch (e) {
      p.crashed = String(e);
      p.readyAt = view.tick;
    }
    return p;
  }

  function resolve(view: FactionView, p: Pending, timedOut: boolean): void {
    const answered = !timedOut && !p.crashed && p.reply !== null && p.reply !== undefined;
    const entry: TurnLog = {
      tick: p.tick, latency: answered ? view.tick - p.tick : null, reply: p.reply, calls: [], errors: [], fallback: null, chat: [],
    };
    if (p.crashed && !timedOut) {
      entry.fallback = 'error';
      entry.errors.push(p.crashed);
    } else if (!answered) {
      entry.fallback = 'late';
    } else {
      const { calls, errors } = parseTurn(faction, p.reply);
      entry.calls = calls;
      entry.errors = errors;
      if (calls.length === 0 && errors.length > 0) entry.fallback = 'invalid';
    }
    if (entry.fallback) {
      outbox = [];
      ops.strategy = base;
    } else {
      // Planned against the state when the reply lands, so stale orders are checked against reality.
      const plan = planTurn(view, entry.calls);
      entry.errors.push(...plan.errors);
      entry.chat = plan.chat;
      directive = { ...directive, ...plan.directive };
      outbox = plan.commands;
      ops.strategy = directed(base, directive);
    }
    log.push(entry);
  }

  return {
    name: opts.name ?? `general(${base.name})`,
    log,
    decide(view: FactionView): Command[] {
      if (!pending && view.tick >= nextTurn) {
        nextTurn = view.tick + interval;
        pending = request(view);
      }
      if (pending) {
        if (pending.arrived && pending.readyAt === null) pending.readyAt = view.tick;
        if (pending.readyAt !== null && view.tick >= pending.readyAt && pending.readyAt - pending.tick <= timeout) {
          resolve(view, pending, false);
          pending = null;
        } else if (view.tick - pending.tick >= timeout) {
          resolve(view, pending, true);
          pending = null;
        }
      }
      const next = outbox.shift();
      const scripted = ops.decide(view);
      return next ? [next, ...scripted] : scripted;
    },
  };
}
