// RTS camera for the Three.js view: a perspective camera tilted ~57° looking north at a ground target.
// The projection center is shifted (setViewOffset) to the middle of the map viewport, so the target
// sits right of the guide panel and above the command card. Scene units are tiles (1 = TILE world units).
import { PerspectiveCamera, Vector3 } from 'three';
import { TILE } from '../../sim/index.ts';
import { viewport } from '../renderer.ts';

const PITCH = (57 * Math.PI) / 180;
const MIN_DISTANCE = 7;
const MAX_DISTANCE = 160;

export interface RtsCamera {
  readonly camera: PerspectiveCamera;
  resize(width: number, height: number): void;
  toWorld(sx: number, sy: number): [number, number];
  toScreen(x: number, y: number): [number, number];
  pan(dx: number, dy: number): void;
  zoomAt(sx: number, sy: number, factor: number): void;
  fit(): void;
}

export function createRtsCamera(mapWidth: number, mapHeight: number): RtsCamera {
  const camera = new PerspectiveCamera(40, 1, 0.5, 600);
  const target = new Vector3(mapWidth / 2, 0, mapHeight / 2);
  let distance = 60;
  let width = 1;
  let height = 1;
  const v = new Vector3();
  const dir = new Vector3();

  function update(): void {
    target.x = Math.min(mapWidth + 6, Math.max(-6, target.x));
    target.z = Math.min(mapHeight + 6, Math.max(-6, target.z));
    camera.position.set(target.x, distance * Math.sin(PITCH), target.z + distance * Math.cos(PITCH));
    camera.lookAt(target);
    camera.updateMatrixWorld();
  }

  /** Ground point (scene units) under a screen pixel, or null above the horizon. */
  function ground(sx: number, sy: number): Vector3 | null {
    v.set((sx / width) * 2 - 1, -(sy / height) * 2 + 1, 0.5).unproject(camera);
    dir.copy(v).sub(camera.position);
    if (dir.y > -1e-6) return null;
    const t = -camera.position.y / dir.y;
    return new Vector3(camera.position.x + dir.x * t, 0, camera.position.z + dir.z * t);
  }

  function toScreen(x: number, y: number): [number, number] {
    v.set(x / TILE, 0, y / TILE).project(camera);
    return [((v.x + 1) / 2) * width, ((1 - v.y) / 2) * height];
  }

  const self: RtsCamera = {
    camera,
    resize(w, h) {
      width = Math.max(1, w);
      height = Math.max(1, h);
      const vp = viewport(width, height);
      camera.aspect = width / height;
      // Shift the image so the camera's center ray lands in the middle of the map viewport.
      camera.setViewOffset(width, height, width / 2 - (vp.left + vp.width / 2), height / 2 - (vp.top + vp.height / 2), width, height);
      camera.updateProjectionMatrix();
      update();
    },
    toWorld(sx, sy) {
      const p = ground(sx, sy);
      if (!p) return [Math.round(target.x * TILE), Math.round(target.z * TILE)];
      return [Math.round(p.x * TILE), Math.round(p.z * TILE)];
    },
    toScreen,
    pan(dx, dy) {
      const vp = viewport(width, height);
      const cx = vp.left + vp.width / 2;
      const cy = vp.top + vp.height / 2;
      const a = ground(cx, cy);
      // Translate so the ground under the viewport center lands exactly at center + d.
      const b = ground(cx + dx, cy + dy);
      if (!a || !b) return;
      target.x -= b.x - a.x;
      target.z -= b.z - a.z;
      update();
    },
    zoomAt(sx, sy, factor) {
      const before = ground(sx, sy);
      distance = Math.min(MAX_DISTANCE, Math.max(MIN_DISTANCE, distance / factor));
      update();
      const after = ground(sx, sy);
      if (!before || !after) return;
      target.x += before.x - after.x;
      target.z += before.z - after.z;
      update();
    },
    fit() {
      const vp = viewport(width, height);
      const margin = 0.03;
      const fits = () => [[0, 0], [mapWidth, 0], [0, mapHeight], [mapWidth, mapHeight]].every(([x, y]) => {
        const [sx, sy] = toScreen(x! * TILE, y! * TILE);
        return sx >= vp.left + vp.width * margin && sx <= vp.left + vp.width * (1 - margin)
          && sy >= vp.top + vp.height * margin && sy <= vp.top + vp.height * (1 - margin);
      });
      target.set(mapWidth / 2, 0, mapHeight / 2);
      let lo = MIN_DISTANCE;
      let hi = MAX_DISTANCE;
      for (let i = 0; i < 30; i++) {
        distance = (lo + hi) / 2;
        update();
        if (fits()) hi = distance; else lo = distance;
      }
      distance = hi;
      update();
    },
  };
  return self;
}
