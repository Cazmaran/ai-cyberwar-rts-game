// Placeholder: the iso prototype is being built (M4.0 renderer spike, issue #7). Falls back to the default view.
import type { Renderer } from '../renderer.ts';

export async function createIsoRenderer(mapWidth: number, mapHeight: number): Promise<Renderer> {
  return (await import('../pixi.ts')).createPixiRenderer(mapWidth, mapHeight);
}
