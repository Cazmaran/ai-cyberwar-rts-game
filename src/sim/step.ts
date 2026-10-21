import { updateAdaptation } from './abilities.ts';
import { updateEconomy } from './economy.ts';
import { updateProduction } from './production.ts';
import { updateUnits } from './units.ts';
import type { World } from './world.ts';

/** Advance the simulation by exactly one fixed tick. Pure game logic only: no DOM, no rendering, no wall-clock time. */
export function step(world: World): void {
  if (world.winner !== null) { world.tick++; return; }
  updateAdaptation(world);
  updateEconomy(world);
  updateProduction(world);
  updateUnits(world);
  world.tick++;
}
