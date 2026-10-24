// Low-poly unit meshes built in code, one silhouette per role: engineer = capsule with a tool pack,
// fast = flat arrowhead, ranged = diamond drone on a stalk, tank = chunky hull with turret. Scene units
// are tiles; each shape faces +x (the heading is applied per instance).
import {
  BoxGeometry, BufferGeometry, CapsuleGeometry, ConeGeometry, CylinderGeometry, OctahedronGeometry,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Role } from '../../sim/index.ts';

function merge(parts: BufferGeometry[]): BufferGeometry {
  const flat = parts.map((g) => (g.index ? g.toNonIndexed() : g));
  const out = mergeGeometries(flat);
  if (!out) throw new Error('unit geometry merge failed');
  out.computeVertexNormals();
  return out;
}

function worker(): BufferGeometry {
  const body = new CapsuleGeometry(0.22, 0.24, 3, 8).translate(0, 0.46, 0);
  const pack = new BoxGeometry(0.16, 0.24, 0.3).translate(-0.24, 0.5, 0);
  return merge([body, pack]);
}

function fast(): BufferGeometry {
  // Three-sided cone lying down, pointing forward: reads as an arrowhead from above.
  const head = new ConeGeometry(0.42, 1.0, 3).rotateZ(-Math.PI / 2).scale(1, 0.45, 1).translate(0.05, 0.28, 0);
  return merge([head]);
}

function ranged(): BufferGeometry {
  const base = new CylinderGeometry(0.26, 0.3, 0.1, 6).translate(0, 0.05, 0);
  const stalk = new CylinderGeometry(0.05, 0.05, 0.75, 5).translate(0, 0.45, 0);
  const gem = new OctahedronGeometry(0.36).scale(1, 1.25, 1).translate(0, 1.05, 0);
  return merge([base, stalk, gem]);
}

function tank(): BufferGeometry {
  const hull = new BoxGeometry(0.95, 0.38, 0.8).translate(0, 0.24, 0);
  const turret = new BoxGeometry(0.45, 0.26, 0.45).translate(-0.05, 0.56, 0);
  const barrel = new CylinderGeometry(0.06, 0.06, 0.55, 6).rotateZ(Math.PI / 2).translate(0.42, 0.58, 0);
  return merge([hull, turret, barrel]);
}

export const UNIT_GEOMETRY: Record<Role, () => BufferGeometry> = { worker, fast, ranged, tank };

/** Height of the top of each shape, for placing health bars. */
export const UNIT_HEIGHT: Record<Role, number> = { worker: 0.9, fast: 0.5, ranged: 1.55, tank: 0.75 };
