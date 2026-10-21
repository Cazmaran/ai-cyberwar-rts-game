// Production: buildings train queued units using their share of faction Compute, limited by the Power cap.
import { TILE } from './fixed.ts';
import { UNITS, FACTIONS } from './data.ts';
import { inBlackout } from './economy.ts';
import { buildings, spawnUnit, type Building, type World } from './world.ts';

export function updateProduction(world: World): void {
  for (const faction of FACTIONS) {
    const fs = world.factions[faction];
    const producing = buildings(world).filter(
      (b) => b.faction === faction && b.built && b.queue.length > 0 && !inBlackout(world, b.x, b.y),
    );
    if (producing.length === 0) continue;
    const share = Math.max(1, Math.trunc(fs.compute / producing.length));
    for (const b of producing) advance(world, b, share);
  }
}

function advance(world: World, b: Building, share: number): void {
  const type = b.queue[0]!;
  const stats = UNITS[type];
  const fs = world.factions[b.faction];
  if (b.progress < stats.work) b.progress = Math.min(stats.work, b.progress + share);
  if (b.progress < stats.work) return;
  // Finished: wait for power headroom before the unit comes online.
  if (fs.powerUsed + stats.power > fs.powerCap) return;
  b.queue.shift();
  b.progress = 0;
  fs.powerUsed += stats.power;
  const u = spawnUnit(world, type, b.faction, b.x, b.y + 2 * TILE);
  u.order = { type: 'move', x: b.rallyX, y: b.rallyY };
}
