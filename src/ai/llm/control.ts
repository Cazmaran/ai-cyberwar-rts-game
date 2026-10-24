// The Gate 2 control (D-018): a General with no model that orders an attack on the enemy core every turn.
// Its base runs on the same scripted operational layer, so it shows what plain aggression wins.
// An LLM General must clearly beat it; scripted bots must hold it off.
import type { Faction } from '../../sim/index.ts';
import type { Controller } from '../controller.ts';
import type { Strategy } from '../scripted.ts';
import { createGeneral, type Brain } from './general.ts';

export const attackEveryTurn: Brain = ({ digest }) =>
  JSON.stringify({ orders: [{ tool: 'attack_sector', args: { sector: digest.cores.enemy ?? 'C' } }] });

export function createControl(faction: Faction, base: Strategy, seed: number): Controller {
  return createGeneral(faction, attackEveryTurn, base, { seed, name: `control(${base.name})` });
}
