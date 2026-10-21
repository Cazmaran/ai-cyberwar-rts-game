// Faction signatures: Pull the Plug (humans) and Adaptation (AI). See docs/PILLARS.md.
import { ADAPTATION, PULL_THE_PLUG, type UnitTypeId } from './data.ts';
import type { World } from './world.ts';

/** Humans cut power to a zone. Returns an error message, or null on success. */
export function pullThePlug(world: World, x: number, y: number): string | null {
  const fs = world.factions.human;
  if (world.tick < fs.plugReadyAt) return 'Pull the Plug is on cooldown';
  world.blackouts.push({ x, y, until: world.tick + PULL_THE_PLUG.duration });
  fs.plugReadyAt = world.tick + PULL_THE_PLUG.cooldown;
  return null;
}

/**
 * AI retrains on the data from its recent losses. Retraining costs Compute while it runs; when it
 * finishes, units spawned afterwards resist the unit types that killed their predecessors.
 * Resistance is capped and decays for threats that stop appearing, so counters always matter.
 */
export function updateAdaptation(world: World): void {
  const fs = world.factions.ai;
  if (fs.retrainingUntil > 0 && world.tick === fs.retrainingUntil) finishRetraining(world);
  if (world.tick < fs.retrainingUntil || world.tick < fs.nextRetrainAt) return;
  if (fs.recentDeaths.length === 0) return;
  fs.retrainingUntil = world.tick + ADAPTATION.retrainDuration;
}

function finishRetraining(world: World): void {
  const fs = world.factions.ai;
  const counts = new Map<UnitTypeId, number>();
  for (const t of fs.recentDeaths) counts.set(t, (counts.get(t) ?? 0) + 1);
  for (const t of Object.keys(fs.resist) as UnitTypeId[]) {
    if (!counts.has(t)) fs.resist[t] = Math.max(0, (fs.resist[t] ?? 0) - ADAPTATION.decay);
  }
  for (const [t, n] of counts) {
    fs.resist[t] = Math.min(ADAPTATION.cap, (fs.resist[t] ?? 0) + n * ADAPTATION.perDeath);
  }
  fs.recentDeaths = [];
  fs.nextRetrainAt = world.tick + ADAPTATION.retrainTicks;
}
