// Browser entry: human plays through the UI, the AI faction is a scripted bot (LLM General comes in Phase 2).
// URL options: ?ai=training|rush|boom|turtle&seed=123&stress=300 (stress spawns N fighting units to check frame rate)
// Testing: &human=rush|boom|turtle lets a bot play your side (to watch or screenshot), &autostart skips the start screen,
// &skip=60 fast-forwards 60 seconds before the first frame.
import { Application, Container, Graphics } from 'pixi.js';
import { createScriptedBot, STRATEGIES, TRAINING } from './ai/scripted.ts';
import { createSession, tickSession } from './harness/session.ts';
import { createStats, recordStats } from './harness/stats.ts';
import { attachSummaryHover, summaryHtml } from './render/summary.ts';
import { drawWorld } from './render/draw.ts';
import { createHud } from './render/hud.ts';
import { buildCard } from './render/card.ts';
import { createEffects, drawEffects, intel, updateEffects } from './render/effects.ts';
import { boxSelect, describeAt, describeMode, key, modeClick, pickOwn, rightClick, selectSameType, type UiState } from './render/input.ts';
import { applyCommand, factionView, issue, spawnUnit, TICK_RATE, TILE, toReplay, type Command } from './sim/index.ts';

const params = new URLSearchParams(location.search);
const strategy = STRATEGIES[params.get('ai') ?? 'training'] ?? TRAINING;
const seed = Number(params.get('seed') ?? Date.now() % 100000);
const humanBot = STRATEGIES[params.get('human') ?? ''];
const session = createSession({ seed, controllers: {
  ai: createScriptedBot('ai', strategy, seed),
  ...(humanBot ? { human: createScriptedBot('human', humanBot, seed) } : {}),
} });
const { game } = session;
const { world } = game;

for (let i = 0; i < Number(params.get('skip') ?? 0) * TICK_RATE; i++) tickSession(session);

const stress = Number(params.get('stress') ?? 0);
if (stress > 0) {
  // Gate 1 performance check: N units fighting in the middle of the map.
  for (const [faction, type, x] of [['human', 'red_team', 18], ['ai', 'botnet_swarm', 30]] as const) {
    const ids: number[] = [];
    for (let i = 0; i < stress / 2; i++) ids.push(spawnUnit(world, type, faction, (x + (i % 6)) * TILE, (4 + Math.trunc(i / 6) % 24) * TILE).id);
    applyCommand(world, faction, { type: 'attackMove', units: ids, x: (48 - x) * TILE, y: 16 * TILE });
  }
}

const app = new Application();
await app.init({ resizeTo: window, background: '#0b0e12', antialias: true });
document.body.appendChild(app.canvas);
const stage = new Container();
const g = new Graphics();
const fxLayer = new Graphics();
const box = new Graphics();
stage.addChild(g, fxLayer);
const fx = createEffects();
app.stage.addChild(stage, box);

const hudRoot = document.createElement('div');
hudRoot.id = 'hud';
document.body.appendChild(hudRoot);
const hud = createHud(hudRoot, `AI (${strategy.name})`);

// Camera: world units -> screen pixels.
const cam = { x: 0, y: 0, zoom: 1 };
/** Fit the map into the screen area right of the guide panel and above the command card. */
function fit(): void {
  const left = 320;
  const bottom = 110;
  const w = app.screen.width - left;
  const h = app.screen.height - bottom;
  cam.zoom = Math.min(w / (world.map.width * TILE), h / (world.map.height * TILE)) * 0.95;
  cam.x = (world.map.width * TILE) / 2 - (left + w / 2) / cam.zoom;
  cam.y = (world.map.height * TILE) / 2 - h / 2 / cam.zoom;
}
fit();
const toWorld = (sx: number, sy: number): [number, number] =>
  [Math.round(cam.x + sx / cam.zoom), Math.round(cam.y + sy / cam.zoom)];

const ui: UiState = { selected: new Set(), mode: { type: 'none' } };
hud.onNarrowSelection((ids) => { ui.selected = new Set(ids); });
let cursor: [number, number] = [0, 0];
let dragStart: [number, number] | null = null;
let panStart: [number, number, number, number] | null = null;
let paused = stress === 0 && !params.has('autostart');
if (paused) hud.showStart(() => { paused = false; });
let speed = 1;

/** Human commands apply on the next tick; rejections show up as HUD messages. */
function send(cmds: Command[]): void {
  for (const c of cmds) issue(game, 'human', c);
}

const canvas = app.canvas;
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('pointerdown', (e) => {
  const p = toWorld(e.offsetX, e.offsetY);
  if (e.button === 1) { panStart = [e.offsetX, e.offsetY, cam.x, cam.y]; return; }
  if (e.button === 2) {
    if (ui.mode.type !== 'none') { ui.mode = { type: 'none' }; return; }
    send(rightClick(factionView(world, 'human'), ui, p[0], p[1]));
    return;
  }
  if (ui.mode.type !== 'none') { send(modeClick(factionView(world, 'human'), ui, p[0], p[1])); return; }
  dragStart = [e.offsetX, e.offsetY];
});
canvas.addEventListener('pointermove', (e) => {
  cursor = toWorld(e.offsetX, e.offsetY);
  hud.tooltip(dragStart || panStart ? null : describeAt(factionView(world, 'human'), cursor[0], cursor[1]), e.clientX, e.clientY);
  if (panStart) {
    cam.x = panStart[2] - (e.offsetX - panStart[0]) / cam.zoom;
    cam.y = panStart[3] - (e.offsetY - panStart[1]) / cam.zoom;
  }
  box.clear();
  if (dragStart) {
    box.rect(Math.min(dragStart[0], e.offsetX), Math.min(dragStart[1], e.offsetY),
      Math.abs(e.offsetX - dragStart[0]), Math.abs(e.offsetY - dragStart[1])).stroke({ width: 1, color: 0xffffff });
  }
});
window.addEventListener('pointerup', (e) => {
  panStart = null;
  box.clear();
  if (!dragStart || e.button !== 0) return;
  const view = factionView(world, 'human');
  const [ax, ay] = toWorld(dragStart[0], dragStart[1]);
  const [bx, by] = toWorld(e.offsetX, e.offsetY);
  const small = Math.abs(e.offsetX - dragStart[0]) + Math.abs(e.offsetY - dragStart[1]) < 6;
  if (!e.shiftKey) ui.selected.clear();
  if (small) {
    const id = pickOwn(view, bx, by);
    if (id !== null) ui.selected.add(id);
  } else {
    for (const id of boxSelect(view, ax, ay, bx, by)) ui.selected.add(id);
  }
  dragStart = null;
});
canvas.addEventListener('dblclick', (e) => {
  // Select every unit of the clicked type that is on screen (shift adds to the selection).
  const view = factionView(world, 'human');
  const [x, y] = toWorld(e.offsetX, e.offsetY);
  const id = pickOwn(view, x, y);
  if (id === null) return;
  const ids = selectSameType(view, id, toWorld(0, 0), toWorld(canvas.clientWidth, canvas.clientHeight));
  if (ids.length === 0) return;
  if (!e.shiftKey) ui.selected.clear();
  for (const i of ids) ui.selected.add(i);
});
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const [wx, wy] = toWorld(e.offsetX, e.offsetY);
  cam.zoom *= e.deltaY < 0 ? 1.12 : 1 / 1.12;
  cam.x = wx - e.offsetX / cam.zoom;
  cam.y = wy - e.offsetY / cam.zoom;
}, { passive: false });

const held = new Set<string>();
window.addEventListener('keyup', (e) => held.delete(e.key));
window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (e.key.startsWith('Arrow')) { held.add(e.key); return; }
  if (k === ' ') { paused = !paused; e.preventDefault(); return; }
  if (k === '+' || k === '=') { speed = Math.min(4, speed * 2); return; }
  if (k === '-') { speed = Math.max(0.5, speed / 2); return; }
  if (k === 't') { hud.toggleTextView(); return; }
  if (k === 'home') { fit(); return; }
  if (e.ctrlKey && k === 'a') {
    e.preventDefault();
    ui.selected = new Set(factionView(world, 'human').units.filter((u) => u.role !== 'worker').map((u) => u.id));
    return;
  }
  send(key(factionView(world, 'human'), ui, world.map, k, cursor));
});

// Fixed-timestep loop: the sim advances at TICK_RATE × speed regardless of frame rate.
let accumulator = 0;
let seenRejections = 0;
const stats = createStats();
let summaryShown = false;
app.ticker.add((ticker) => {
  const pan = 900 / cam.zoom * (ticker.deltaMS / 1000);
  if (held.has('ArrowLeft')) cam.x -= pan;
  if (held.has('ArrowRight')) cam.x += pan;
  if (held.has('ArrowUp')) cam.y -= pan;
  if (held.has('ArrowDown')) cam.y += pan;

  if (!paused && world.winner === null) {
    accumulator += ticker.deltaMS * speed;
    const msPerTick = 1000 / TICK_RATE;
    let steps = 0;
    while (accumulator >= msPerTick && steps++ < 8) {
      tickSession(session);
      recordStats(stats, world);
      accumulator -= msPerTick;
    }
    if (steps >= 8) accumulator = 0;
  }
  for (; seenRejections < game.rejected.length; seenRejections++) {
    const r = game.rejected[seenRejections]!;
    if (r.cmd.faction === 'human' && !humanBot) hud.message(`✗ ${r.cmd.command.type}: ${r.reason}`);
  }

  const view = factionView(world, 'human');
  for (const id of ui.selected) if (!world.entities.has(id)) ui.selected.delete(id);
  stage.scale.set(cam.zoom);
  stage.position.set(-cam.x * cam.zoom, -cam.y * cam.zoom);
  drawWorld(g, world, view, ui.selected);
  const now = performance.now();
  for (const a of updateEffects(fx, view, now)) hud.alert(a);
  drawEffects(fxLayer, view, fx, now);
  hud.setIntel(intel(view));
  hud.update(world, view, ui.selected, describeMode(ui.mode), speed, paused, Math.round(app.ticker.FPS));
  if (world.winner && !summaryShown) {
    summaryShown = true;
    hud.showSummary(summaryHtml(stats, world.winner), (el) => {
      attachSummaryHover(el, stats);
      el.querySelector('#save-replay')?.addEventListener('click', () => {
        // Seed + command log + versions: enough to re-run the match exactly.
        const blob = new Blob([JSON.stringify(toReplay(game))], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `replay-${world.winner}-seed${seed}-${Math.trunc(world.tick / TICK_RATE)}s.json`;
        a.click();
        URL.revokeObjectURL(a.href);
      });
    });
  }
  hud.setCard(buildCard(view, ui, {
    setMode: (m) => { ui.mode = m; },
    select: (ids) => { ui.selected = new Set(ids); },
  }), (b) => send(b.run()));
});
