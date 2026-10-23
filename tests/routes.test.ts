import { describe, expect, it } from 'vitest';
import { factionView, sourceIssue } from '../src/sim/index.ts';
import { linkIndex, newGame, run } from './helpers.ts';

// Playtest: income stuck at 6 Data/s with a claimed center source that never fed the base. A source you
// own that produces nothing now says why.
describe('dead Data sources', () => {
  it('explains why an owned source produces nothing: no fiber, no route home, or a blocked router', () => {
    const game = newGame();
    const w = game.world;
    const src = w.sites.get('h_src_n')!;
    src.owner = 'human';
    run(game, 1);
    expect(sourceIssue(w, src, 'human')).toBe('no_fiber');

    w.links[linkIndex(game, 'h_router', 'h_src_n')]!.owner = 'human';
    run(game, 1);
    expect(sourceIssue(w, src, 'human')).toBe('no_route');

    w.links[linkIndex(game, 'h_core', 'h_router')]!.owner = 'human';
    w.sites.get('h_router')!.owner = 'ai';
    run(game, 1);
    expect(sourceIssue(w, src, 'human')).toBe('blocked');

    w.sites.get('h_router')!.owner = 'human';
    run(game, 1);
    expect(src.flow).toBe(src.rate);
    expect(sourceIssue(w, src, 'human')).toBeNull();
  });

  it('a source starved by a full link reports bandwidth, and the view carries the issue', () => {
    const game = newGame();
    const w = game.world;
    const src = w.sites.get('h_src_n')!;
    src.owner = 'human';
    w.sites.get('h_router')!.owner = 'human';
    w.links[linkIndex(game, 'h_router', 'h_src_n')]!.owner = 'human';
    const trunk = w.links[linkIndex(game, 'h_core', 'h_router')]!;
    trunk.owner = 'human';
    trunk.bandwidth = 50;
    run(game, 1);
    expect(sourceIssue(w, src, 'human')).toBe('bandwidth');
    expect(factionView(w, 'human').sites.find((s) => s.id === 'h_src_n')!.issue).toBe('bandwidth');
    expect(factionView(w, 'ai').sites.find((s) => s.id === 'h_src_n')!.issue).toBeNull();
  });
});
