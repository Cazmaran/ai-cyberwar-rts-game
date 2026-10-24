// Map sites and fiber links. Data sources: glowing disc with a pillar; routers: floating diamond over a
// diamond pad; substations: low box with a lightning bolt. Links: flat ribbons on the ground, width by
// bandwidth, colored by operator (dark fiber dim). Both are fixed per map, so meshes are made once.
import {
  BoxGeometry, CylinderGeometry, ExtrudeGeometry, Group, Mesh, MeshBasicMaterial, OctahedronGeometry, PlaneGeometry,
  Shape, type Material, type Scene,
} from 'three';
import { TILE, type FactionView, type World } from '../../sim/index.ts';
import { COLORS } from '../draw.ts';
import { bodyMaterial, ownerColor, trimMaterial, type Owner } from './palette.ts';

const flatMat = new Map<string, MeshBasicMaterial>();
function flat(color: number, opacity: number): MeshBasicMaterial {
  const key = `${color}:${opacity}`;
  let m = flatMat.get(key);
  if (!m) { m = new MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }); flatMat.set(key, m); }
  return m;
}

function bolt(): ExtrudeGeometry {
  const s = new Shape();
  const pts: [number, number][] = [[0.1, 0.45], [-0.25, -0.05], [0, -0.05], [-0.1, -0.45], [0.25, 0.05], [0, 0.05]];
  s.moveTo(pts[0]![0], pts[0]![1]);
  for (const [x, y] of pts.slice(1)) s.lineTo(x, y);
  s.closePath();
  return new ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: false }).rotateX(-Math.PI / 2);
}

const GEO = {
  disc: new CylinderGeometry(0.65, 0.65, 0.04, 32),
  pillar: new CylinderGeometry(0.14, 0.2, 1.3, 8),
  pad: new BoxGeometry(1, 0.04, 1),
  gem: new OctahedronGeometry(0.45),
  station: new BoxGeometry(1.1, 0.45, 1.1),
  bolt: bolt(),
  ribbon: new PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
};

interface SiteEntry { group: Group; glow: Mesh[]; solid: Mesh[]; pad: Mesh | null; owner: Owner | undefined; spin: Mesh | null }

export interface SiteLayer { update(world: World, view: FactionView, now: number): void }

export function createSiteLayer(scene: Scene): SiteLayer {
  const sites = new Map<string, SiteEntry>();
  const links: { mesh: Mesh; key: string }[] = [];

  function makeSite(kind: string, x: number, y: number): SiteEntry {
    const group = new Group();
    group.position.set(x / TILE, 0, y / TILE);
    const e: SiteEntry = { group, glow: [], solid: [], pad: null, owner: undefined, spin: null };
    const add = (geo: typeof GEO[keyof typeof GEO], py: number, list: Mesh[] | null) => {
      const m = new Mesh(geo, bodyMaterial(null));
      m.position.y = py;
      m.castShadow = true;
      m.receiveShadow = true;
      group.add(m);
      list?.push(m);
      return m;
    };
    if (kind === 'data_source') {
      e.pad = add(GEO.disc, 0.02, null);
      add(GEO.pillar, 0.65, e.glow);
    } else if (kind === 'router') {
      e.pad = add(GEO.pad, 0.02, null);
      e.pad.rotation.y = Math.PI / 4;
      e.pad.scale.set(1.0, 1, 1.0);
      e.spin = add(GEO.gem, 1.0, e.glow);
      e.spin.scale.set(1, 1.3, 1);
    } else {
      add(GEO.station, 0.225, e.solid);
      add(GEO.bolt, 0.46, e.glow);
    }
    if (e.pad) { e.pad.castShadow = false; e.pad.renderOrder = 1; }
    scene.add(group);
    return e;
  }

  return {
    update(world, view, now) {
      const byId = new Map(view.sites.map((s) => [s.id, s]));
      for (const s of view.sites) {
        if (s.kind === 'core') continue;
        let e = sites.get(s.id);
        if (!e) { e = makeSite(s.kind, s.x, s.y); sites.set(s.id, e); }
        if (e.owner !== s.owner) {
          e.owner = s.owner;
          for (const m of e.glow) m.material = trimMaterial(s.owner) as Material;
          for (const m of e.solid) m.material = bodyMaterial(s.owner) as Material;
          if (e.pad) e.pad.material = flat(ownerColor(s.owner), 0.3);
        }
        if (e.spin) { e.spin.rotation.y = now / 1500; e.spin.position.y = 1.0 + Math.sin(now / 700) * 0.08; }
      }
      // Links: built once, recolored when the owner (or what we know of it) changes.
      for (const l of world.links) {
        const a = byId.get(l.a);
        const b = byId.get(l.b);
        if (!a || !b) continue;
        let entry = links[l.index];
        if (!entry) {
          const mesh = new Mesh(GEO.ribbon, flat(COLORS.darkFiber, 0.9));
          const dx = (b.x - a.x) / TILE;
          const dz = (b.y - a.y) / TILE;
          mesh.position.set((a.x + b.x) / 2 / TILE, 0.012, (a.y + b.y) / 2 / TILE);
          mesh.rotation.y = -Math.atan2(dz, dx);
          mesh.scale.set(Math.hypot(dx, dz), 1, (40 + l.bandwidth / 3) / TILE * 1.4);
          mesh.receiveShadow = true;
          mesh.renderOrder = 1;
          scene.add(mesh);
          entry = { mesh, key: '' };
          links[l.index] = entry;
        }
        const seen = a.visible || b.visible;
        const color = l.owner === null || !seen ? COLORS.darkFiber : ownerColor(l.owner);
        const key = `${color}`;
        if (entry.key !== key) {
          entry.key = key;
          entry.mesh.material = flat(color, color === COLORS.darkFiber ? 0.8 : 0.75);
        }
      }
    },
  };
}
