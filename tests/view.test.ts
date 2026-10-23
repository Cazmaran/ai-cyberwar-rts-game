import { describe, expect, it } from 'vitest';
import { buildCard } from '../src/render/card.ts';
import { describeView, factionView, powerHeadroom, spawnBuilding, spawnUnit, TILE, training } from '../src/sim/index.ts';
import { newGame } from './helpers.ts';

describe('faction view (fog of war)', () => {
  it('hides enemies outside sight and reveals them when in sight', () => {
    const game = newGame();
    expect(factionView(game.world, 'human').enemyUnits).toHaveLength(0);
    spawnUnit(game.world, 'botnet_swarm', 'ai', 9 * TILE, 16 * TILE);
    expect(factionView(game.world, 'human').enemyUnits).toHaveLength(1);
  });

  it('hides ownership of unseen sites', () => {
    const v = factionView(newGame().world, 'human');
    expect(v.sites.find((s) => s.id === 'a_src_n')!.owner).toBe('unknown');
    expect(v.sites.find((s) => s.id === 'h_router')!.owner).toBeNull();
  });

  it('text view summarizes by sector', () => {
    const text = describeView(factionView(newGame().world, 'human'));
    expect(text).toMatch(/^\[human\] t=0:00 data=260/);
    expect(text).toContain('pull_the_plug: READY');
    expect(text).toMatch(/W: .*ours: 3 field_engineer/);
    const ai = describeView(factionView(newGame().world, 'ai'));
    expect(ai).toContain('adaptation: none');
  });
});

describe('power cap visibility', () => {
  it('reports headroom after queued units and flags FULL in the text view', () => {
    const game = newGame();
    const fs = game.world.factions.human;
    const noc = [...game.world.entities.values()].find((e) => e.kind === 'building' && e.type === 'noc')!;
    let v = factionView(game.world, 'human');
    expect(powerHeadroom(v)).toBe(v.powerCap - v.powerUsed);
    fs.powerUsed = fs.powerCap - 1;
    if (noc.kind === 'building') noc.queue.push('field_engineer');
    v = factionView(game.world, 'human');
    expect(powerHeadroom(v)).toBe(0);
    expect(describeView(v)).toMatch(/power=\d+\/\d+ FULL/);
  });

  it('the Train button explains a full Power cap instead of taking Data', () => {
    const game = newGame();
    const fs = game.world.factions.human;
    fs.powerUsed = fs.powerCap;
    const v = factionView(game.world, 'human');
    const ui = { selected: new Set<number>(), mode: { type: 'none' as const } };
    const btn = buildCard(v, ui as never, { setMode: () => {}, select: () => {} }).find((b) => b.id === 'train:field_engineer')!;
    expect(btn.disabled).toMatch(/Power full/);
  });
});

describe('training countdown', () => {
  it('reports seconds to the next unit from progress and Compute, and flags units waiting for Power', () => {
    const game = newGame();
    const noc = [...game.world.entities.values()].find((e) => e.kind === 'building' && e.type === 'noc')!;
    if (noc.kind !== 'building') throw new Error('no noc');
    noc.queue.push('field_engineer', 'field_engineer');
    noc.progress = 1000;
    let v = factionView(game.world, 'human');
    const b = v.buildings.find((x) => x.id === noc.id)!;
    // field_engineer work 2000, progress 1000, NOC compute 10 per tick -> 100 ticks = 5 s.
    expect(training(v, b)).toEqual({ unit: 'field_engineer', seconds: 5, queued: 1, waitingForPower: false });
    expect(describeView(v)).toMatch(/our noc .*training field_engineer 5s/);
    noc.progress = 2000;
    game.world.factions.human.powerUsed = game.world.factions.human.powerCap;
    v = factionView(game.world, 'human');
    expect(training(v, v.buildings.find((x) => x.id === noc.id)!)?.waitingForPower).toBe(true);
  });
});

describe('explaining the economy', () => {
  it('sites expose their Data rate, and the SOC tip says a second SOC does not train faster', () => {
    const game = newGame();
    const v = factionView(game.world, 'human');
    expect(v.sites.find((s) => s.id === 'mid_src_n')!.rate).toBe(200);
    const ui = { selected: new Set<number>(), mode: { type: 'none' as const } };
    const engineer = v.units.find((u) => u.role === 'worker')!;
    ui.selected.add(engineer.id);
    const soc = () => buildCard(factionView(game.world, 'human'), ui as never, { setMode: () => {}, select: () => {} }).find((b) => b.id === 'build:soc')!;
    expect(soc().tip).not.toMatch(/already have/);
    const noc = [...game.world.entities.values()].find((e) => e.kind === 'building' && e.type === 'noc')!;
    spawnBuilding(game.world, 'soc', 'human', noc.x, noc.y + 5 * TILE).built = true;
    expect(soc().tip).toMatch(/already have a SOC/);
  });
});
