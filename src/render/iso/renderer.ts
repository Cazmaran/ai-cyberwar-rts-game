// Isometric 2.5D renderer (M4.0 renderer spike, issue #7, D-017): the "Age of Empires" look with
// procedural shapes. Flat things are drawn in world units under the iso matrix; buildings and units
// stand upright in projected space, sorted back to front. One camera (pan + zoom) moves both.
import { Application, Container, Graphics, Matrix } from 'pixi.js';
import { visibleTiles } from '../fog.ts';
import type { Frame, Renderer, ScreenBox } from '../renderer.ts';
import * as cam from './camera.ts';
import { drawGround, drawGroundStatic, drawSlabSides } from './ground.ts';
import { drawObjects, type Headings } from './objects.ts';
import { drawOverlay } from './overlay.ts';

/** A container that turns world-unit drawing into the iso diamond (projected units). */
function isoLayer(...children: Graphics[]): Container {
  const c = new Container();
  c.setFromMatrix(new Matrix(cam.ISO_X, cam.ISO_Y, -cam.ISO_X, cam.ISO_Y, 0, 0));
  c.addChild(...children);
  return c;
}

export async function createIsoRenderer(mapWidth: number, mapHeight: number): Promise<Renderer> {
  const app = new Application();
  // The game loop in main.ts calls render() once per frame, so Pixi's own ticker stays off.
  await app.init({ resizeTo: window, background: '#0b0e12', antialias: true, autoStart: false });
  document.body.appendChild(app.canvas);

  const slab = new Graphics();
  const groundStatic = new Graphics();
  const ground = new Graphics();
  const objects = new Graphics();
  const overlay = new Graphics();
  const boxG = new Graphics();
  drawSlabSides(slab, mapWidth, mapHeight);
  drawGroundStatic(groundStatic, mapWidth, mapHeight);

  const scene = new Container();
  scene.addChild(slab, isoLayer(groundStatic, ground), objects, isoLayer(overlay));
  app.stage.addChild(scene, boxG);

  const camera: cam.IsoCamera = { x: 0, y: 0, zoom: 1 };
  const headings: Headings = new Map();

  return {
    canvas: app.canvas,
    toWorld: (sx, sy) => cam.toWorld(camera, sx, sy),
    toScreen: (x, y) => cam.toScreen(camera, x, y),
    pan: (dx, dy) => cam.pan(camera, dx, dy),
    zoomAt: (sx, sy, factor) => cam.zoomAt(camera, sx, sy, factor),
    fit: () => cam.fit(camera, mapWidth, mapHeight, app.screen.width, app.screen.height),
    setBox(box: ScreenBox | null) {
      boxG.clear();
      if (box) {
        boxG.rect(Math.min(box.x0, box.x1), Math.min(box.y0, box.y1), Math.abs(box.x1 - box.x0), Math.abs(box.y1 - box.y0))
          .stroke({ width: 1, color: 0xffffff });
      }
    },
    render({ world, view, selected, fx, now }: Frame) {
      scene.scale.set(camera.zoom);
      scene.position.set(-camera.x * camera.zoom, -camera.y * camera.zoom);
      const seen = visibleTiles(view);
      drawGround(ground, world, view, selected, seen, now);
      drawObjects(objects, view, selected, fx, seen, headings, now);
      drawOverlay(overlay, world, fx, now);
      app.render();
    },
  };
}
