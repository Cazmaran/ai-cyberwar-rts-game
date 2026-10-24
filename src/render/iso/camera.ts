// Isometric camera math (no PixiJS, so it can be unit tested). World ground point (x, y) projects to
// a 2:1 diamond: px = (x - y)·cos30°, py = (x + y)·sin30°. Height goes straight up the screen.
// The camera then maps projected points to canvas pixels: screen = (p - cam)·zoom.
import { TILE } from '../../sim/index.ts';
import { viewport } from '../renderer.ts';

export const ISO_X = Math.cos(Math.PI / 6);
export const ISO_Y = Math.sin(Math.PI / 6);

/** Ground point -> projected point (world-sized units, before the camera). */
export function project(x: number, y: number): [number, number] {
  return [(x - y) * ISO_X, (x + y) * ISO_Y];
}

/** Projected point -> ground point. */
export function unproject(px: number, py: number): [number, number] {
  const a = px / ISO_X; // x - y
  const b = py / ISO_Y; // x + y
  return [(a + b) / 2, (b - a) / 2];
}

export interface IsoCamera { x: number; y: number; zoom: number }

export function toScreen(cam: IsoCamera, x: number, y: number): [number, number] {
  const [px, py] = project(x, y);
  return [(px - cam.x) * cam.zoom, (py - cam.y) * cam.zoom];
}

export function toWorld(cam: IsoCamera, sx: number, sy: number): [number, number] {
  const [x, y] = unproject(cam.x + sx / cam.zoom, cam.y + sy / cam.zoom);
  return [Math.round(x), Math.round(y)];
}

export function pan(cam: IsoCamera, dx: number, dy: number): void {
  cam.x -= dx / cam.zoom;
  cam.y -= dy / cam.zoom;
}

export function zoomAt(cam: IsoCamera, sx: number, sy: number, factor: number): void {
  const px = cam.x + sx / cam.zoom;
  const py = cam.y + sy / cam.zoom;
  cam.zoom = Math.min(0.5, Math.max(0.004, cam.zoom * factor));
  cam.x = px - sx / cam.zoom;
  cam.y = py - sy / cam.zoom;
}

/** Height (projected units) kept free above the map's top corner so tall buildings there aren't clipped. */
const HEADROOM = 3000;

/** Frame the whole map diamond in the HUD-free screen area. */
export function fit(cam: IsoCamera, mapWidth: number, mapHeight: number, screenW: number, screenH: number): void {
  const W = mapWidth * TILE;
  const H = mapHeight * TILE;
  const vp = viewport(screenW, screenH);
  const spanX = (W + H) * ISO_X;
  const spanY = (W + H) * ISO_Y + HEADROOM;
  cam.zoom = Math.min(vp.width / spanX, vp.height / spanY) * 0.95;
  const [cx, cy] = project(W / 2, H / 2);
  cam.x = cx - (vp.left + vp.width / 2) / cam.zoom;
  cam.y = cy - HEADROOM / 2 - (vp.top + vp.height / 2) / cam.zoom;
}
