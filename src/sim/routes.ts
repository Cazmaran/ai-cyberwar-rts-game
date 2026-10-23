// Why a Data source you own isn't feeding your core (playtest: a claimed center source that never paid).
// Used by the view, so the UI and LLM controllers can both see dead or throttled sources.
import type { Faction } from './data.ts';
import type { Site, World } from './world.ts';

export type SourceIssue =
  /** No lit fiber touches the source. */
  | 'no_fiber'
  /** Lit fiber leaves the source but doesn't reach your core. */
  | 'no_route'
  /** A route exists, but a router on it is held by the enemy, which won't forward your traffic. */
  | 'blocked'
  /** Data flows, but less than the source produces: a link on the way is full. */
  | 'bandwidth';

/** Plain-language reason, for tooltips, panels and the text view. */
export function issueText(issue: SourceIssue, flow: number, rate: number): string {
  switch (issue) {
    case 'no_fiber': return 'not feeding your base: no fiber connected. Light the link from it toward your base.';
    case 'no_route': return 'not feeding your base: its fiber doesn’t reach your NOC yet. Connect the missing link.';
    case 'blocked': return 'not feeding your base: an AI-held router is on the route and won’t forward your traffic. Retake it or connect around it.';
    case 'bandwidth': return `only ${((flow * 20) / 1000).toFixed(1)} of ${((rate * 20) / 1000).toFixed(1)} Data/s arrives: a fiber link on the way is full.`;
  }
}

export function sourceIssue(world: World, s: Site, faction: Faction): SourceIssue | null {
  if (s.kind !== 'data_source' || s.owner !== faction || s.flow >= s.rate) return null;
  if (s.flow > 0) return 'bandwidth';
  const lit = world.links.filter((l) => l.owner === faction);
  if (!lit.some((l) => l.a === s.id || l.b === s.id)) return 'no_fiber';
  // With every router passable, can lit fiber reach the core? Then the obstacle is an enemy router (or
  // links that are full); otherwise a link is missing.
  if (reaches(world, faction, s.id, true)) return reaches(world, faction, s.id, false) ? 'bandwidth' : 'blocked';
  return 'no_route';
}

/** Breadth-first search over the faction's lit links from a source to its core. */
function reaches(world: World, faction: Faction, from: string, anyRouter: boolean): boolean {
  const seen = new Set([from]);
  const queue = [from];
  while (queue.length > 0) {
    const node = queue.shift()!;
    for (const l of world.links) {
      if (l.owner !== faction || (l.a !== node && l.b !== node)) continue;
      const next = l.a === node ? l.b : l.a;
      if (seen.has(next)) continue;
      const site = world.sites.get(next);
      if (!site) continue;
      if (site.kind === 'core') { if (site.owner === faction) return true; continue; }
      const passable = site.kind === 'router' && (anyRouter || site.owner === null || site.owner === faction);
      if (!passable) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return false;
}
