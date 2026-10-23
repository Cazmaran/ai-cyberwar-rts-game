import { describe, expect, it } from 'vitest';
import { buildCard } from '../src/render/card.ts';
import { describeView, factionView, powerHeadroom, spawnUnit, TILE } from '../src/sim/index.ts';
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
