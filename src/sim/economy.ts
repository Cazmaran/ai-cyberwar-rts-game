// Economy: Power (cap), Compute (production speed), Data (streams home over links, limited by bandwidth).
import { ADAPTATION, BUILDINGS, ECONOMY, FACTIONS, PULL_THE_PLUG, UNITS, type Faction } from './data.ts';
import { pct, within } from './fixed.ts';
import { buildings, units, type World } from './world.ts';

/** True if a point is inside an active blackout zone (Pull the Plug). */
export function inBlackout(world: World, x: number, y: number): boolean {
  return world.blackouts.some((b) => b.until > world.tick && within(x, y, b.x, b.y, PULL_THE_PLUG.radius));
}

export function updateEconomy(world: World): void {
  world.blackouts = world.blackouts.filter((b) => b.until > world.tick);
  for (const faction of FACTIONS) {
    const fs = world.factions[faction];
    let powerCap = 0;
    let powerUsed = 0;
    let compute = 0;
    for (const b of buildings(world)) {
      if (b.faction !== faction || !b.built || inBlackout(world, b.x, b.y)) continue;
      const stats = BUILDINGS[b.type];
      if (stats.power > 0) powerCap += stats.power;
      else powerUsed -= stats.power;
      compute += stats.compute;
    }
    for (const s of world.sites.values()) {
      if (s.kind === 'substation' && s.owner === faction) powerCap += ECONOMY.substationPower;
    }
    for (const u of units(world)) if (u.faction === faction) powerUsed += UNITS[u.type].power;
    if (world.tick < fs.retrainingUntil) compute -= pct(compute, ADAPTATION.retrainComputeCost);
    fs.powerCap = powerCap;
    fs.powerUsed = powerUsed;
    fs.compute = compute;
    fs.income = 0;
  }
  flowData(world);
}

/**
 * Route each owned data source's output to its faction's core along the widest available path.
 * Sources are routed in map order; each consumes link capacity, so shared links become chokepoints.
 * A link carries traffic only for the faction operating it. A router forwards traffic for its owner,
 * or for everyone while neutral.
 */
function flowData(world: World): void {
  const remaining = world.links.map((l) => l.bandwidth);
  for (const src of world.sites.values()) src.flow = 0;
  for (const src of world.sites.values()) {
    if (src.kind !== 'data_source' || src.owner === null) continue;
    const faction = src.owner;
    const route = widestPath(world, faction, src.id, remaining);
    if (!route) continue;
    const flow = Math.min(src.rate, route.bottleneck);
    if (flow <= 0) continue;
    for (const li of route.links) remaining[li] = (remaining[li] ?? 0) - flow;
    src.flow = flow;
    world.factions[faction].data += flow;
    world.factions[faction].income += flow;
  }
}

function canForward(world: World, faction: Faction, siteId: string, isTarget: boolean): boolean {
  const s = world.sites.get(siteId);
  if (!s) return false;
  if (isTarget) return s.kind === 'core' && s.owner === faction;
  return s.kind === 'router' && (s.owner === null || s.owner === faction);
}

function widestPath(
  world: World, faction: Faction, from: string, remaining: number[],
): { bottleneck: number; links: number[] } | null {
  const best = new Map<string, number>([[from, Number.MAX_SAFE_INTEGER]]);
  const via = new Map<string, number>();
  const done = new Set<string>();
  for (;;) {
    let node: string | null = null;
    let width = 0;
    for (const [id, w] of best) {
      if (!done.has(id) && w > width) { node = id; width = w; }
    }
    if (node === null) return null;
    const site = world.sites.get(node);
    if (site?.kind === 'core') {
      if (site.owner !== faction) return null;
      const links: number[] = [];
      let cur = node;
      while (cur !== from) {
        const li = via.get(cur)!;
        links.push(li);
        const l = world.links[li]!;
        cur = l.a === cur ? l.b : l.a;
      }
      return { bottleneck: width, links };
    }
    done.add(node);
    for (const l of world.links) {
      if (l.owner !== faction || (l.a !== node && l.b !== node)) continue;
      const next = l.a === node ? l.b : l.a;
      if (done.has(next)) continue;
      const nextSite = world.sites.get(next);
      if (!canForward(world, faction, next, nextSite?.kind === 'core')) continue;
      const w = Math.min(width, remaining[l.index] ?? 0);
      if (w > (best.get(next) ?? 0)) { best.set(next, w); via.set(next, l.index); }
    }
  }
}
