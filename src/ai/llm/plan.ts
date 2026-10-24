// Turns validated LLM tool calls into sim commands (Phase 2, M2.2). Works only from the faction's view,
// so the General sees and does exactly what any other controller could. Pure and deterministic.
import {
  MAX_QUEUE, sectorCenter, UNITS, type Command, type FactionView, type Role, type SectorId, type UnitTypeId,
} from '../../sim/index.ts';
import type { ToolCall } from './tools.ts';

/** Standing orders for the scripted operational layer between LLM turns (wired up in M2.3). */
export interface Directive {
  workers?: number;
  racks?: number;
  defenses?: number;
  barricades?: number;
  mix?: Partial<Record<Exclude<Role, 'worker'>, number>>;
}

export interface Plan {
  commands: Command[];
  directive: Directive;
  /** Messages for the chat panel. Never parsed into commands. */
  chat: string[];
  /** Valid calls that could not be carried out in this state (e.g. not enough Data). */
  errors: string[];
}

const CORES = new Set(['noc', 'primary_cluster']);

export function planTurn(view: FactionView, calls: ToolCall[]): Plan {
  const plan: Plan = { commands: [], directive: {}, chat: [], errors: [] };
  let data = view.data;
  /** Units queued this turn per building, so several train calls share queue space. */
  const queued = new Map<number, number>();

  for (const call of calls) {
    const a = call.args;
    const fail = (why: string) => plan.errors.push(`${call.tool}: ${why}`);
    switch (call.tool) {
      case 'attack_sector':
        plan.commands.push({ type: 'attackSector', sector: a.sector as SectorId });
        break;
      case 'defend_sector':
        plan.commands.push({ type: 'defendSector', sector: a.sector as SectorId });
        break;
      case 'retreat': {
        const core = view.buildings.find((b) => CORES.has(b.type));
        if (!core) { fail('no core'); break; }
        plan.commands.push({ type: 'defendSector', sector: core.sector });
        break;
      }
      case 'expand':
        plan.commands.push({ type: 'expand' });
        break;
      case 'train': {
        const unit = a.unit as UnitTypeId;
        const cost = UNITS[unit].cost;
        const at = view.buildings.filter((b) => b.built && b.type === UNITS[unit].trainedAt);
        let n = 0;
        for (let i = 0; i < (a.count as number); i++) {
          if (data < cost) break;
          const load = (id: number, q: number) => q + (queued.get(id) ?? 0);
          const b = at.filter((x) => load(x.id, x.queue.length) < MAX_QUEUE)
            .sort((x, y) => load(x.id, x.queue.length) - load(y.id, y.queue.length) || x.id - y.id)[0];
          if (!b) break;
          plan.commands.push({ type: 'train', building: b.id, unit });
          queued.set(b.id, (queued.get(b.id) ?? 0) + 1);
          data -= cost;
          n++;
        }
        if (n === 0) fail(at.length === 0 ? `no building trains ${unit}` : data < cost ? 'not enough data' : 'queues full');
        break;
      }
      case 'set_build_plan':
        plan.directive.workers = a.workers as number;
        plan.directive.racks = a.racks as number;
        plan.directive.defenses = a.defenses as number;
        if (a.barricades !== undefined) plan.directive.barricades = a.barricades as number;
        break;
      case 'set_army_mix':
        plan.directive.mix = { fast: a.fast as number, ranged: a.ranged as number, tank: a.tank as number };
        break;
      case 'set_rally': {
        const [x, y] = sectorCenter({ width: view.mapWidth, height: view.mapHeight }, a.sector as SectorId);
        const producers = view.buildings.filter((b) => !CORES.has(b.type) && Object.values(UNITS).some((u) => u.trainedAt === b.type));
        if (producers.length === 0) { fail('no production building'); break; }
        for (const b of producers) plan.commands.push({ type: 'setRally', building: b.id, x, y });
        break;
      }
      case 'pull_the_plug': {
        if (view.plugReadyIn !== 0) { fail('not ready'); break; }
        const targets = view.enemyUnits.filter((u) => u.sector === a.sector);
        if (targets.length === 0) { fail(`no visible enemies in ${a.sector}`); break; }
        const x = Math.trunc(targets.reduce((s, u) => s + u.x, 0) / targets.length);
        const y = Math.trunc(targets.reduce((s, u) => s + u.y, 0) / targets.length);
        plan.commands.push({ type: 'pullThePlug', x, y });
        break;
      }
      case 'taunt':
        plan.chat.push(a.message as string);
        break;
      case 'wait':
        break;
      default:
        fail('unknown tool');
    }
  }
  return plan;
}
