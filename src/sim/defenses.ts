// Static defenses (Security Post, Sentry Gun): fire at the nearest enemy unit in range. They give a
// defender a home advantage, so an early rush can be held (D-012).
import { BUILDINGS } from './data.ts';
import { dist2, within } from './fixed.ts';
import { inBlackout } from './economy.ts';
import type { Building, Unit, World } from './world.ts';

export function updateDefenses(world: World): void {
  for (const b of world.entities.values()) {
    if (b.kind !== 'building' || !b.built) continue;
    const weapon = BUILDINGS[b.type].weapon;
    if (!weapon || (weapon.needsPower && inBlackout(world, b.x, b.y))) continue;
    if (b.cooldown > 0) { b.cooldown--; continue; }
    const t = target(world, b, weapon.range);
    if (!t) continue;
    t.hp -= weapon.damage;
    // Adaptation learns from unit weapons only; a defense kill teaches the Model nothing.
    t.lastHitBy = null;
    b.cooldown = weapon.cooldown;
  }
}

/** Keep shooting the current target while it is alive and in range; otherwise the nearest enemy unit in range. */
function target(world: World, b: Building, range: number): Unit | null {
  if (b.target !== null) {
    const t = world.entities.get(b.target);
    if (t?.kind === 'unit' && t.hp > 0 && within(b.x, b.y, t.x, t.y, range)) return t;
    b.target = null;
  }
  let best: Unit | null = null;
  let bestD = range * range;
  for (const e of world.entities.values()) {
    if (e.kind !== 'unit' || e.faction === b.faction || e.hp <= 0) continue;
    const d = dist2(b.x, b.y, e.x, e.y);
    if (d <= bestD) { best = e; bestD = d; }
  }
  b.target = best ? best.id : null;
  return best;
}
