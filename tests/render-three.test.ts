import { describe, expect, it } from 'vitest';
import { createRtsCamera } from '../src/render/three/camera.ts';
import { viewport } from '../src/render/renderer.ts';
import { TILE } from '../src/sim/index.ts';

const W = 1280;
const H = 760;
const newCam = () => {
  const cam = createRtsCamera(48, 32);
  cam.resize(W, H);
  cam.fit();
  return cam;
};

describe('three renderer camera', () => {
  it('fit frames every map corner inside the viewport (right of the guide, above the card)', () => {
    const cam = newCam();
    const vp = viewport(W, H);
    for (const [x, y] of [[0, 0], [48 * TILE, 0], [0, 32 * TILE], [48 * TILE, 32 * TILE]] as const) {
      const [sx, sy] = cam.toScreen(x, y);
      expect(sx).toBeGreaterThanOrEqual(vp.left - 1);
      expect(sx).toBeLessThanOrEqual(vp.left + vp.width + 1);
      expect(sy).toBeGreaterThanOrEqual(vp.top - 1);
      expect(sy).toBeLessThanOrEqual(vp.top + vp.height + 1);
    }
    // The map center lands in the middle of the viewport.
    const [cx, cy] = cam.toScreen(24 * TILE, 16 * TILE);
    expect(Math.abs(cx - (vp.left + vp.width / 2))).toBeLessThan(2);
    expect(Math.abs(cy - (vp.top + vp.height / 2))).toBeLessThan(2);
  });

  it('toWorld inverts toScreen on the ground plane', () => {
    const cam = newCam();
    for (const [x, y] of [[5000, 7000], [24000, 16000], [40000, 30000]] as const) {
      const [sx, sy] = cam.toScreen(x, y);
      const [wx, wy] = cam.toWorld(sx, sy);
      expect(Math.abs(wx - x)).toBeLessThan(5);
      expect(Math.abs(wy - y)).toBeLessThan(5);
    }
  });

  it('zoomAt keeps the ground under the cursor fixed and moves closer', () => {
    const cam = newCam();
    const before = cam.toWorld(900, 200);
    const [ax, ay] = cam.toScreen(10000, 10000);
    const [bx, by] = cam.toScreen(12000, 10000);
    cam.zoomAt(900, 200, 1.5);
    const after = cam.toWorld(900, 200);
    expect(Math.abs(after[0] - before[0])).toBeLessThan(5);
    expect(Math.abs(after[1] - before[1])).toBeLessThan(5);
    const [cx, cy] = cam.toScreen(10000, 10000);
    const [dx, dy] = cam.toScreen(12000, 10000);
    expect(Math.hypot(dx - cx, dy - cy)).toBeGreaterThan(Math.hypot(bx - ax, by - ay));
  });

  it('pan drags the ground with the pointer', () => {
    const cam = newCam();
    const vp = viewport(W, H);
    const sx = vp.left + vp.width / 2;
    const sy = vp.height / 2;
    const p = cam.toWorld(sx, sy);
    cam.pan(60, -40);
    const [nx, ny] = cam.toScreen(p[0], p[1]);
    expect(Math.abs(nx - (sx + 60))).toBeLessThan(2);
    expect(Math.abs(ny - (sy - 40))).toBeLessThan(2);
  });
});
