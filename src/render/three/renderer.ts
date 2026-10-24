// Placeholder: the three prototype is being built (M4.0 renderer spike, issue #7). Falls back to the default view.
import type { Renderer } from '../renderer.ts';

export async function createThreeRenderer(mapWidth: number, mapHeight: number): Promise<Renderer> {
  return (await import('../pixi.ts')).createPixiRenderer(mapWidth, mapHeight);
}
