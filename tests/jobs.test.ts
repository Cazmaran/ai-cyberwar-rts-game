import { describe, expect, it } from 'vitest';
import { ECONOMY, factionView, spawnBuilding, spawnUnit, TILE } from '../src/sim/index.ts';
import { linkIndex, newGame, run, workersOf } from './helpers.ts';

// Playtest: "it's frustrating to see engineers sitting there with no feedback". The view tells the UI
// (and LLMs) what each worker is doing, how far along it is, and whether it is actually working yet.
describe('worker jobs in the view', () => {
  it('a claim reports walking, then working with progress and seconds left', () => {
    const game = newGame();
    const [w] = workersOf(game, 'human');
    const unit = game.world.entities.get(w!)!;
    if (unit.kind !== 'unit') throw new Error('not a unit');
    unit.order = { type: 'claim', site: 'mid_src_n' };
    let job = factionView(game.world, 'human').units.find((u) => u.id === w)!.job!;
    expect(job).toMatchObject({ kind: 'claim', target: 'mid_src_n', working: false, progress: 0, contested: false });
    const site = game.world.sites.get('mid_src_n')!;
    unit.x = site.x; unit.y = site.y;
    run(game, 40);
    job = factionView(game.world, 'human').units.find((u) => u.id === w)!.job!;
    expect(job.working).toBe(true);
    expect(job.progress).toBe(Math.trunc((100 * 40) / ECONOMY.claimTicks));
    expect(job.seconds).toBe(Math.ceil((ECONOMY.claimTicks - 40) / 20));
  });

  it('a claim is flagged contested while an enemy worker claims the same site', () => {
    const game = newGame();
    const site = game.world.sites.get('mid_src_n')!;
    const h = spawnUnit(game.world, 'field_engineer', 'human', site.x, site.y);
    const a = spawnUnit(game.world, 'maintenance_drone', 'ai', site.x + 500, site.y);
    h.order = { type: 'claim', site: 'mid_src_n' };
    a.order = { type: 'claim', site: 'mid_src_n' };
    run(game, 5);
    expect(factionView(game.world, 'human').units.find((u) => u.id === h.id)!.job!.contested).toBe(true);
  });

  it('lighting fiber and building report their progress', () => {
    const game = newGame();
    const [w1, w2] = workersOf(game, 'human');
    const link = linkIndex(game, 'h_core', 'h_router');
    const u1 = game.world.entities.get(w1!)!;
    if (u1.kind !== 'unit') throw new Error('not a unit');
    u1.order = { type: 'lightLink', link };
    run(game, 30);
    const fiber = factionView(game.world, 'human').units.find((u) => u.id === w1)!.job!;
    expect(fiber).toMatchObject({ kind: 'link', target: String(link), working: true });
    expect(fiber.progress).toBeGreaterThan(0);

    const noc = [...game.world.entities.values()].find((e) => e.kind === 'building' && e.type === 'noc')!;
    const soc = spawnBuilding(game.world, 'soc', 'human', noc.x, noc.y + 3 * TILE);
    const u2 = game.world.entities.get(w2!)!;
    if (u2.kind !== 'unit') throw new Error('not a unit');
    u2.order = { type: 'build', building: soc.id };
    expect(factionView(game.world, 'human').units.find((u) => u.id === w2)!.job).toMatchObject({ kind: 'build', target: String(soc.id) });
  });

  it('idle workers and enemy units carry no job', () => {
    const v = factionView(newGame().world, 'human');
    expect(v.units.every((u) => u.job === null)).toBe(true);
  });
});
