// Draws the world as the human player sees it (fog of war applies). Greybox: shapes encode role,
// color encodes faction (blue/orange is colorblind-safe), so units read without relying on color alone.
import type { Graphics } from 'pixi.js';
import {
  BUILDINGS, PULL_THE_PLUG, type Faction, type FactionView, type Role, type World,
} from '../sim/index.ts';

export const COLORS = {
  human: 0x4aa3ff,
  ai: 0xff8a3d,
  neutral: 0x8a94a6,
  unseen: 0x3a4250,
  darkFiber: 0x2c333d,
  selection: 0xffffff,
  hpGood: 0x55d27a,
  hpBad: 0xe5534b,
  blackout: 0x000000,
  ground: 0x161b22,
} as const;

const factionColor = (f: Faction | null | 'unknown') =>
  f === 'human' ? COLORS.human : f === 'ai' ? COLORS.ai : f === 'unknown' ? COLORS.unseen : COLORS.neutral;

export function drawWorld(g: Graphics, world: World, view: FactionView, selected: Set<number>): void {
  g.clear();
  const W = world.map.width * 1000;
  const H = world.map.height * 1000;
  g.rect(0, 0, W, H).fill(COLORS.ground);

  // Links: thickness = bandwidth; color = operator (dark fiber is dim).
  const siteById = new Map(view.sites.map((s) => [s.id, s]));
  for (const l of world.links) {
    const a = siteById.get(l.a)!;
    const b = siteById.get(l.b)!;
    const seen = a.visible || b.visible;
    const color = l.owner === null || !seen ? COLORS.darkFiber : factionColor(seen ? l.owner : 'unknown');
    g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 40 + l.bandwidth / 3, color, alpha: 0.9 });
  }

  // Sites.
  for (const s of view.sites) {
    if (s.kind === 'core') continue;
    const c = factionColor(s.owner);
    if (s.kind === 'data_source') {
      g.circle(s.x, s.y, 650).fill({ color: c, alpha: 0.25 }).stroke({ width: 80, color: c });
      g.circle(s.x, s.y, 200).fill(c);
    } else if (s.kind === 'router') {
      g.poly([s.x, s.y - 700, s.x + 700, s.y, s.x, s.y + 700, s.x - 700, s.y]).fill({ color: c, alpha: 0.2 }).stroke({ width: 90, color: c });
    } else {
      g.rect(s.x - 550, s.y - 550, 1100, 1100).fill({ color: c, alpha: 0.2 }).stroke({ width: 90, color: c });
      g.poly([s.x + 100, s.y - 450, s.x - 250, s.y + 50, s.x, s.y + 50, s.x - 100, s.y + 450, s.x + 250, s.y - 50, s.x, s.y - 50]).fill(c);
    }
  }

  // Buildings (own + visible enemy).
  for (const b of [...view.buildings, ...view.enemyBuildings]) {
    const faction = view.buildings.includes(b) ? view.faction : view.faction === 'human' ? 'ai' : 'human';
    const r = BUILDINGS[b.type].radius;
    const c = factionColor(faction);
    const alpha = b.built ? 1 : 0.35;
    if (b.type === 'firewall') g.rect(b.x - r / 3, b.y - r, (2 * r) / 3, 2 * r).fill({ color: c, alpha });
    else g.rect(b.x - r, b.y - r, 2 * r, 2 * r).fill({ color: c, alpha: alpha * 0.5 }).stroke({ width: 100, color: c, alpha });
    if (selected.has(b.id)) g.rect(b.x - r - 200, b.y - r - 200, 2 * r + 400, 2 * r + 400).stroke({ width: 70, color: COLORS.selection });
    hpBar(g, b.x, b.y - r - 350, 2 * r, b.hp, b.maxHp);
    if (!b.built) hpBar(g, b.x, b.y + r + 250, 2 * r, b.hp, b.maxHp, 0x9fb3c8);
  }

  // Units.
  for (const u of [...view.units, ...view.enemyUnits]) {
    const mine = view.units.includes(u);
    const faction = mine ? view.faction : view.faction === 'human' ? 'ai' : 'human';
    unitShape(g, u.role, u.x, u.y, factionColor(faction));
    if (selected.has(u.id)) g.circle(u.x, u.y, 650).stroke({ width: 60, color: COLORS.selection });
    if (u.hp < u.maxHp) hpBar(g, u.x, u.y - 650, 900, u.hp, u.maxHp);
  }

  // Blackouts (Pull the Plug).
  for (const b of world.blackouts) {
    if (b.until <= world.tick) continue;
    g.circle(b.x, b.y, PULL_THE_PLUG.radius).fill({ color: COLORS.blackout, alpha: 0.45 }).stroke({ width: 80, color: 0xffffff, alpha: 0.4 });
  }
}

function unitShape(g: Graphics, role: Role, x: number, y: number, c: number): void {
  switch (role) {
    case 'worker': g.circle(x, y, 300).fill(c); break;
    case 'fast': g.poly([x, y - 500, x + 430, y + 300, x - 430, y + 300]).fill(c); break;
    case 'ranged': g.poly([x, y - 500, x + 380, y, x, y + 500, x - 380, y]).fill(c); break;
    case 'tank': g.rect(x - 420, y - 420, 840, 840).fill(c); break;
  }
  g.circle(x, y, role === 'worker' ? 300 : 520).stroke({ width: 40, color: 0x0b0e12, alpha: 0.8 });
}

function hpBar(g: Graphics, x: number, y: number, w: number, hp: number, max: number, color?: number): void {
  const f = Math.max(0, Math.min(1, hp / max));
  g.rect(x - w / 2, y, w, 140).fill(0x0b0e12);
  g.rect(x - w / 2, y, w * f, 140).fill(color ?? (f > 0.4 ? COLORS.hpGood : COLORS.hpBad));
}

