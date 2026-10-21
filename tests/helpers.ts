import { advance, createGame, issue, type Command, type Faction, type Game } from '../src/sim/index.ts';

export function newGame(seed = 1): Game {
  return createGame(seed, 'duel');
}

export function run(game: Game, ticks: number): void {
  for (let i = 0; i < ticks; i++) advance(game);
}

/** Issue a command and apply it immediately (one step). Returns the rejection reason, or null. */
export function command(game: Game, faction: Faction, cmd: Command): string | null {
  const before = game.rejected.length;
  issue(game, faction, cmd);
  advance(game);
  return game.rejected.length > before ? game.rejected[game.rejected.length - 1]!.reason : null;
}

export function workersOf(game: Game, faction: Faction): number[] {
  const out: number[] = [];
  for (const e of game.world.entities.values()) {
    if (e.kind === 'unit' && e.faction === faction && (e.type === 'field_engineer' || e.type === 'crawler')) out.push(e.id);
  }
  return out;
}

export function linkIndex(game: Game, a: string, b: string): number {
  const l = game.world.links.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a));
  if (!l) throw new Error(`no link ${a}-${b}`);
  return l.index;
}
