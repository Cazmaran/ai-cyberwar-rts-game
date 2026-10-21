// HTML overlay: resources, selection, messages, hotkeys, and the text view. Plain DOM keeps it readable,
// scalable and screen-reader friendly.
import { BUILDINGS, describeView, MILLI, TICK_RATE, type FactionView, type World } from '../sim/index.ts';
import { HOTKEYS } from './input.ts';

export interface Hud {
  update(world: World, view: FactionView, selected: Set<number>, modeText: string, speed: number, paused: boolean, fps: number): void;
  message(text: string): void;
  toggleTextView(): void;
}

export function createHud(root: HTMLElement, aiName: string): Hud {
  root.innerHTML = `
    <div id="hud-top" class="hud-panel"></div>
    <div id="hud-mode" class="hud-panel"></div>
    <div id="hud-messages"></div>
    <div id="hud-selection" class="hud-panel"></div>
    <details id="hud-help" class="hud-panel"><summary>Controls</summary><table>${
      HOTKEYS.map(([k, v]) => `<tr><td><kbd>${k}</kbd></td><td>${v}</td></tr>`).join('')
    }</table></details>
    <pre id="hud-text" class="hud-panel" hidden></pre>
    <div id="hud-banner" hidden></div>`;
  const $ = (id: string) => root.querySelector<HTMLElement>(`#${id}`)!;
  const messages: { text: string; at: number }[] = [];
  let showText = false;
  let lastTextTick = -1;

  return {
    update(world, v, selected, modeText, speed, paused, fps) {
      const secs = Math.trunc(world.tick / TICK_RATE);
      const plug = v.plugReadyIn === 0 ? '<b class="ready">READY</b>' : `${Math.ceil((v.plugReadyIn ?? 0) / TICK_RATE)}s`;
      $('hud-top').innerHTML = `
        <span>⏱ ${Math.trunc(secs / 60)}:${String(secs % 60).padStart(2, '0')}${paused ? ' <b>PAUSED</b>' : ''}${speed !== 1 ? ` ×${speed}` : ''}</span>
        <span title="Data: spend on units and buildings">Data <b>${Math.trunc(v.data / MILLI)}</b> (+${((v.income * TICK_RATE) / MILLI).toFixed(1)}/s)</span>
        <span title="Power: every unit and rack draws power; substations add more">Power <b>${v.powerUsed}/${v.powerCap}</b></span>
        <span title="Compute: production speed; server racks add more">Compute <b>${v.compute}</b></span>
        <span title="Pull the Plug: black out a zone, freezing AI units and unpowering buildings">Plug ${plug}</span>
        <span class="dim">vs ${aiName} · ${fps} fps</span>`;
      $('hud-mode').textContent = modeText;
      $('hud-mode').hidden = !modeText;

      const units = v.units.filter((u) => selected.has(u.id));
      const blds = v.buildings.filter((b) => selected.has(b.id));
      let sel = '';
      if (units.length) {
        const counts = new Map<string, number>();
        for (const u of units) counts.set(u.type, (counts.get(u.type) ?? 0) + 1);
        sel = [...counts].map(([t, n]) => `${n} × ${t.replace('_', ' ')}`).join(', ');
      } else if (blds[0]) {
        const b = blds[0];
        sel = `${b.type.replace('_', ' ')} ${b.hp}/${BUILDINGS[b.type].hp}hp${b.built ? '' : ' (under construction)'}`
          + (b.queue.length ? ` · queue: ${b.queue.map((q) => q.replace('_', ' ')).join(', ')}` : '');
      }
      $('hud-selection').textContent = sel || 'Nothing selected';

      const now = performance.now();
      while (messages.length && now - messages[0]!.at > 4000) messages.shift();
      $('hud-messages').innerHTML = messages.map((m) => `<div>${m.text}</div>`).join('');

      if (showText && world.tick !== lastTextTick && world.tick % 10 === 0) {
        lastTextTick = world.tick;
        $('hud-text').textContent = describeView(v);
      }
      if (world.winner) {
        $('hud-banner').hidden = false;
        $('hud-banner').innerHTML = world.winner === 'human'
          ? 'The network holds. <b>Humans win.</b><br><small>Reload to play again.</small>'
          : 'The Model has taken the network. <b>AI wins.</b><br><small>Reload to play again.</small>';
      }
    },
    message(text) {
      messages.push({ text, at: performance.now() });
      if (messages.length > 4) messages.shift();
    },
    toggleTextView() {
      showText = !showText;
      $('hud-text').hidden = !showText;
      lastTextTick = -1;
    },
  };
}

