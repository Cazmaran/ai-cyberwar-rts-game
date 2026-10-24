import { describe, expect, it } from 'vitest';
import { fit, pan, project, toScreen, toWorld, unproject, zoomAt, type IsoCamera } from '../src/render/iso/camera.ts';
import { depthOrder } from '../src/render/iso/objects.ts';
import { viewport } from '../src/render/renderer.ts';
import { TILE } from '../src/sim/index.ts';

describe('iso camera', () => {
  it('projects to a 2:1 diamond and back', () => {
    const [px, py] = project(1000, 0);
    expect(px / py).toBeCloseTo(Math.sqrt(3)); // 30° slope
    expect(project(1000, 1000)[0]).toBeCloseTo(0); // the x = y line runs straight down the screen
    const [x, y] = unproject(...project(12345, 6789));
    expect(x).toBeCloseTo(12345);
    expect(y).toBeCloseTo(6789);
  });

  it('toWorld inverts toScreen after fit, pan and zoom', () => {
    const c: IsoCamera = { x: 0, y: 0, zoom: 1 };
    fit(c, 48, 32, 1280, 760);
    pan(c, 37, -12);
    zoomAt(c, 600, 300, 1.7);
    for (const [x, y] of [[0, 0], [48000, 32000], [20500, 7300]] as const) {
      const [sx, sy] = toScreen(c, x, y);
      const [wx, wy] = toWorld(c, sx, sy);
      expect(Math.abs(wx - x)).toBeLessThanOrEqual(1);
      expect(Math.abs(wy - y)).toBeLessThanOrEqual(1);
    }
  });

  it('fit keeps the whole map inside the HUD-free area', () => {
    const c: IsoCamera = { x: 0, y: 0, zoom: 1 };
    fit(c, 48, 32, 1280, 760);
    const vp = viewport(1280, 760);
    for (const [x, y] of [[0, 0], [48 * TILE, 0], [0, 32 * TILE], [48 * TILE, 32 * TILE]] as const) {
      const [sx, sy] = toScreen(c, x, y);
      expect(sx).toBeGreaterThanOrEqual(vp.left);
      expect(sx).toBeLessThanOrEqual(vp.left + vp.width);
      expect(sy).toBeGreaterThanOrEqual(vp.top);
      expect(sy).toBeLessThanOrEqual(vp.top + vp.height);
    }
  });

  it('zoomAt keeps the ground under the cursor in place', () => {
    const c: IsoCamera = { x: 0, y: 0, zoom: 1 };
    fit(c, 48, 32, 1280, 760);
    const before = toWorld(c, 700, 400);
    zoomAt(c, 700, 400, 2);
    const after = toWorld(c, 700, 400);
    expect(Math.abs(after[0] - before[0])).toBeLessThanOrEqual(1);
    expect(Math.abs(after[1] - before[1])).toBeLessThanOrEqual(1);
  });

  it('paints objects back to front', () => {
    expect(depthOrder([{ d: 5 }, { d: 1 }, { d: 3 }]).map((i) => i.d)).toEqual([1, 3, 5]);
  });
});
