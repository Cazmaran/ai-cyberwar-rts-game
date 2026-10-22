import { describe, expect, it } from 'vitest';
import { DUEL_MAP, isqrt, sectorCenter, sectorOf, stepToward, TILE } from '../src/sim/index.ts';

describe('integer math', () => {
  it('isqrt is exact', () => {
    for (const n of [0, 1, 2, 3, 4, 15, 16, 17, 999_999, 1_000_000, 4_000_000_000]) {
      const r = isqrt(n);
      expect(r * r <= n && (r + 1) * (r + 1) > n).toBe(true);
    }
  });

  it('stepToward moves at most speed and lands exactly on target', () => {
    const [x, y] = stepToward(0, 0, 3000, 4000, 1000);
    expect(isqrt(x * x + y * y)).toBeLessThanOrEqual(1000);
    expect(stepToward(0, 0, 300, 400, 1000)).toEqual([300, 400]);
  });
});

describe('duel map', () => {
  it('is point-symmetric: every site has a mirror of the same kind and rate', () => {
    for (const s of DUEL_MAP.sites) {
      const m = DUEL_MAP.sites.find((o) => o.x === DUEL_MAP.width - s.x && o.y === DUEL_MAP.height - s.y);
      expect(m, s.id).toBeDefined();
      expect(m!.kind).toBe(s.kind);
      expect(m!.rate ?? 0).toBe(s.rate ?? 0);
    }
  });

  it('links are mirrored with equal bandwidth', () => {
    const pos = new Map(DUEL_MAP.sites.map((s) => [s.id, [s.x, s.y] as const]));
    const key = (a: readonly number[], b: readonly number[]) => [a.join(','), b.join(',')].sort().join('|');
    const links = new Map(DUEL_MAP.links.map((l) => [key(pos.get(l.a)!, pos.get(l.b)!), l.bandwidth]));
    for (const l of DUEL_MAP.links) {
      const [ax, ay] = pos.get(l.a)!;
      const [bx, by] = pos.get(l.b)!;
      const mirrored = key([DUEL_MAP.width - ax, DUEL_MAP.height - ay], [DUEL_MAP.width - bx, DUEL_MAP.height - by]);
      expect(links.get(mirrored), `${l.a}-${l.b}`).toBe(l.bandwidth);
    }
  });

  // Booming must pay: income beyond the home sources comes from expansions away from the core (D-013).
  it('each side has expansion Data sources farther from its core than its home sources, linked to its network', () => {
    const core = DUEL_MAP.sites.find((s) => s.id === 'h_core')!;
    const d = (s: { x: number; y: number }) => (s.x - core.x) ** 2 + (s.y - core.y) ** 2;
    const home = DUEL_MAP.sites.filter((s) => s.id.startsWith('h_src'));
    const expansions = DUEL_MAP.sites.filter((s) => s.id.startsWith('h_exp'));
    expect(expansions.length).toBeGreaterThanOrEqual(2);
    for (const e of expansions) {
      expect(e.kind).toBe('data_source');
      expect(d(e)).toBeGreaterThan(Math.max(...home.map(d)));
      expect(e.x).toBeLessThan(DUEL_MAP.width / 2);
      expect(DUEL_MAP.links.some((l) => l.a === e.id || l.b === e.id)).toBe(true);
    }
  });

  it('sectors name the 3x3 grid', () => {
    expect(sectorOf(DUEL_MAP, 0, 0)).toBe('NW');
    expect(sectorOf(DUEL_MAP, 24 * TILE, 16 * TILE)).toBe('C');
    const [x, y] = sectorCenter(DUEL_MAP, 'SE');
    expect(sectorOf(DUEL_MAP, x, y)).toBe('SE');
  });
});
