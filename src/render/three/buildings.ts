// Buildings as small pooled groups, one per building id (created once when first seen, removed when gone).
// Heights encode type: cores tallest, production wide and mid, racks striped, defenses with a turret
// and a range ring on the ground, relays a thin mast. Unbuilt buildings are ghosts.
import {
  BoxGeometry, CylinderGeometry, Group, Mesh, MeshBasicMaterial, RingGeometry, SphereGeometry, type Material, type Scene,
} from 'three';
import { BUILDINGS, TILE, type BuildingTypeId, type BuildingView, type Faction, type FactionView } from '../../sim/index.ts';
import { bodyMaterial, enemyOf, ownerColor, trimMaterial } from './palette.ts';

interface Part { geo: BoxGeometry | CylinderGeometry | SphereGeometry; trim: boolean; y: number; x?: number; z?: number }

const box = (w: number, h: number, d: number) => new BoxGeometry(w, h, d);
const cyl = (rt: number, rb: number, h: number, s = 8) => new CylinderGeometry(rt, rb, h, s);

/** Parts per type, sizes in tiles, y = center height. Geometries are shared by every building of a type. */
function partsFor(type: BuildingTypeId): Part[] {
  const r = BUILDINGS[type].radius / TILE;
  switch (type) {
    case 'noc': case 'primary_cluster': return [
      { geo: box(r * 2, 0.5, r * 2), trim: false, y: 0.25 },
      { geo: box(r * 1.3, 2.6, r * 1.3), trim: false, y: 1.8 },
      { geo: box(r * 1.34, 0.12, r * 1.34), trim: true, y: 1.2 },
      { geo: box(r * 1.34, 0.12, r * 1.34), trim: true, y: 2.2 },
      { geo: cyl(0.12, 0.12, 0.9, 6), trim: true, y: 3.55 },
    ];
    case 'soc': case 'training_cluster': return [
      { geo: box(r * 2, 0.9, r * 1.6), trim: false, y: 0.45 },
      { geo: box(r * 1.2, 0.35, r * 1.0), trim: false, y: 1.07 },
      { geo: box(r * 2.04, 0.1, r * 1.64), trim: true, y: 0.7 },
    ];
    case 'server_rack': return [
      { geo: box(r * 1.6, 1.4, r * 1.6), trim: false, y: 0.7 },
      { geo: box(r * 1.64, 0.07, r * 1.64), trim: true, y: 0.45 },
      { geo: box(r * 1.64, 0.07, r * 1.64), trim: true, y: 0.8 },
      { geo: box(r * 1.64, 0.07, r * 1.64), trim: true, y: 1.15 },
    ];
    case 'barricade': return [
      { geo: box((r * 2) / 3, 0.6, r * 2), trim: false, y: 0.3 },
      { geo: box((r * 2) / 3 + 0.04, 0.08, r * 2 + 0.04), trim: true, y: 0.62 },
    ];
    case 'security_post': case 'sentry_gun': return [
      { geo: cyl(r * 0.8, r, 0.5, 8), trim: false, y: 0.25 },
      { geo: cyl(r * 0.45, r * 0.45, 0.35, 8), trim: true, y: 0.68 },
      { geo: box(0.7, 0.1, 0.1), trim: false, y: 0.7, x: 0.35 },
    ];
    case 'signal_relay': return [
      { geo: cyl(r * 0.6, r * 0.8, 0.2, 6), trim: false, y: 0.1 },
      { geo: cyl(0.05, 0.07, 1.8, 5), trim: false, y: 1.0 },
      { geo: new SphereGeometry(0.16, 8, 6), trim: true, y: 1.95 },
    ];
  }
}

/** Height of the top of each type, for bars. */
export const buildingHeight = (type: BuildingTypeId): number =>
  type === 'noc' || type === 'primary_cluster' ? 4.0 : type === 'signal_relay' ? 2.1 : type === 'server_rack' ? 1.4 : 1.2;

interface Entry { group: Group; bodies: Mesh[]; trims: Mesh[]; ring: Mesh | null; built: boolean; seen: boolean }

export interface BuildingLayer { update(view: FactionView): void }

export function createBuildingLayer(scene: Scene): BuildingLayer {
  const shapes = new Map<BuildingTypeId, Part[]>();
  const ringGeo = new RingGeometry(0.985, 1, 96).rotateX(-Math.PI / 2);
  const ringMat = new Map<Faction, MeshBasicMaterial>();
  for (const f of ['human', 'ai'] as const) {
    ringMat.set(f, new MeshBasicMaterial({ color: ownerColor(f), transparent: true, opacity: 0.35, depthWrite: false }));
  }
  const pool = new Map<number, Entry>();

  function create(b: BuildingView, f: Faction): Entry {
    let parts = shapes.get(b.type);
    if (!parts) { parts = partsFor(b.type); shapes.set(b.type, parts); }
    const group = new Group();
    const bodies: Mesh[] = [];
    const trims: Mesh[] = [];
    for (const p of parts) {
      const m = new Mesh(p.geo, p.trim ? trimMaterial(f, !b.built) : bodyMaterial(f, !b.built));
      m.position.set(p.x ?? 0, p.y, p.z ?? 0);
      m.castShadow = true;
      m.receiveShadow = true;
      (p.trim ? trims : bodies).push(m);
      group.add(m);
    }
    let ring: Mesh | null = null;
    const weapon = BUILDINGS[b.type].weapon;
    if (weapon) {
      ring = new Mesh(ringGeo, ringMat.get(f)!);
      ring.scale.setScalar(weapon.range / TILE);
      ring.position.y = 0.03;
      ring.renderOrder = 2;
      group.add(ring);
    }
    group.position.set(b.x / TILE, 0, b.y / TILE);
    // Enemy turrets face west, ours east, so the barrel points at the front.
    if (weapon) group.rotation.y = f === 'human' ? 0 : Math.PI;
    scene.add(group);
    return { group, bodies, trims, ring, built: b.built, seen: true };
  }

  function sync(b: BuildingView, f: Faction): void {
    let e = pool.get(b.id);
    if (!e) { e = create(b, f); pool.set(b.id, e); }
    e.seen = true;
    if (e.built !== b.built) {
      e.built = b.built;
      for (const m of e.bodies) m.material = bodyMaterial(f, !b.built) as Material;
      for (const m of e.trims) m.material = trimMaterial(f, !b.built) as Material;
    }
    if (e.ring) e.ring.visible = b.built;
  }

  return {
    update(view) {
      for (const e of pool.values()) e.seen = false;
      for (const b of view.buildings) sync(b, view.faction);
      for (const b of view.enemyBuildings) sync(b, enemyOf(view.faction));
      for (const [id, e] of pool) {
        if (e.seen) continue;
        // Shared geometries and materials stay alive; only the group goes.
        scene.remove(e.group);
        pool.delete(id);
      }
    },
  };
}
