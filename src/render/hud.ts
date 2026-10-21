// HTML overlay: resources, selection, messages, hotkeys, and the text view. Plain DOM keeps it readable,
// scalable and screen-reader friendly.
import { BUILDINGS, describeView, MILLI, TICK_RATE, type FactionView, type World } from '../sim/index.ts';
import { pretty, type CardButton } from './card.ts';
import { renderGuide } from './guide.ts';
import { HOTKEYS } from './input.ts';

export interface Hud {
  update(world: World, view: FactionView, selected: Set<number>, modeText: string, speed: number, paused: boolean, fps: number): void;
  message(text: string): void;
  toggleTextView(): void;
  setCard(buttons: CardButton[], onPress: (b: CardButton) => void): void;
  tooltip(text: string | null, sx: number, sy: number): void;
  showStart(onStart: () => void): void;
  alert(text: string): void;
  setIntel(html: string): void;
  onNarrowSelection(fn: (ids: number[]) => void): void;
}

export function createHud(root: HTMLElement, aiName: string): Hud {
  root.innerHTML = `
    <div id="hud-top" class="hud-panel"></div>
    <div id="hud-mode" class="hud-panel"></div>
    <div id="hud-messages"></div>
    <div id="hud-alerts"></div>
    <div id="hud-intel" class="hud-panel"></div>
    <div id="hud-selection" class="hud-panel"></div>
    <div id="hud-guide" class="hud-panel"></div>
    <div id="hud-card" class="hud-panel"></div>
    <div id="hud-tip" hidden></div>
    <div id="hud-start" hidden></div>
    <details id="hud-help" class="hud-panel"><summary>Keyboard shortcuts</summary><table>${
      HOTKEYS.map(([k, v]) => `<tr><td><kbd>${k}</kbd></td><td>${v}</td></tr>`).join('')
    }</table></details>
    <pre id="hud-text" class="hud-panel" hidden></pre>
    <div id="hud-banner" hidden></div>`;
  const $ = (id: string) => root.querySelector<HTMLElement>(`#${id}`)!;
  const messages: { text: string; at: number }[] = [];
  let showText = false;
  let lastTextTick = -1;
  let cardKey = '';
  let selKey: string | null = null;
  let onNarrow: (ids: number[]) => void = () => {};
  const icon: Record<string, string> = { worker: '●', fast: '▲', ranged: '◆', tank: '■' };
  const bar = (hp: number, max: number) => {
    const f = Math.max(0, Math.min(1, hp / max));
    const c = f > 0.6 ? '#55d27a' : f > 0.3 ? '#ffd866' : '#e5534b';
    return `<span class="bar"><span style="width:${Math.round(f * 100)}%;background:${c}"></span></span>`;
  };
  /** Selection panel: total count, one clickable row per unit type with combined health. */
  function renderSelection(v: FactionView, selected: Set<number>): void {
    const units = v.units.filter((u) => selected.has(u.id));
    const b = v.buildings.find((x) => selected.has(x.id));
    const key = units.map((u) => `${u.id}:${u.hp}`).join(',') + (b ? `b${b.id}:${b.hp}:${b.queue.length}:${b.built}` : '');
    if (key === selKey) return;
    selKey = key;
    const el = $('hud-selection');
    if (units.length) {
      const groups = new Map<string, typeof units>();
      for (const u of units) groups.set(u.type, [...(groups.get(u.type) ?? []), u]);
      el.innerHTML = `<div class="sel-head">Selected: <b>${units.length}</b> unit${units.length === 1 ? '' : 's'}</div>`
        + [...groups].map(([t, list]) => {
          const hp = list.reduce((s, u) => s + u.hp, 0);
          const max = list.reduce((s, u) => s + u.maxHp, 0);
          return `<button type="button" class="sel-row" data-type="${t}" title="Click to keep only these">`
            + `<span class="ico">${icon[list[0]!.role]}</span> ${list.length} × ${pretty(t)} ${bar(hp, max)} <span class="dim">${hp}/${max}</span></button>`;
        }).join('');
      for (const row of el.querySelectorAll<HTMLButtonElement>('.sel-row')) {
        row.addEventListener('click', () => onNarrow(units.filter((u) => u.type === row.dataset.type).map((u) => u.id)));
      }
    } else if (b) {
      el.innerHTML = `<div class="sel-head">${pretty(b.type)}${b.built ? '' : ' (under construction)'}</div>`
        + `${bar(b.hp, BUILDINGS[b.type].hp)} <span class="dim">${b.hp}/${BUILDINGS[b.type].hp} hp</span>`
        + (b.queue.length ? `<div>Training: ${b.queue.map((q) => pretty(q)).join(', ')}</div>` : '');
    } else {
      el.innerHTML = '<span class="dim">Nothing selected. Drag a box or click a unit.</span>';
    }
  }
  let intelHtml = '';
  const alerts: { text: string; at: number }[] = [];
  let guideKey = '';

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

      renderSelection(v, selected);

      const now = performance.now();
      while (messages.length && now - messages[0]!.at > 4000) messages.shift();
      while (alerts.length && now - alerts[0]!.at > 6000) alerts.shift();
      $('hud-alerts').innerHTML = alerts.map((m) => `<div>${m.text}</div>`).join('');
      $('hud-messages').innerHTML = messages.map((m) => `<div>${m.text}</div>`).join('');

      // Re-render the guide only when progress changes (keeps text selectable and cheap).
      const gk = `${v.income > 0}|${v.units.length}|${v.buildings.length}|${v.sites.filter((x) => x.owner === v.faction).length}`;
      if (gk !== guideKey) { guideKey = gk; renderGuide($('hud-guide'), v); }

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
    setCard(buttons, onPress) {
      // Rebuild only when buttons change, so hovering and clicking stay stable.
      const key = buttons.map((b) => `${b.id}:${b.disabled ?? ''}`).join('|');
      if (key === cardKey) return;
      cardKey = key;
      const el = $('hud-card');
      el.innerHTML = '';
      for (const b of buttons) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.innerHTML = `<span class="label">${b.label}</span>`
          + (b.cost ? `<span class="cost">${Math.trunc(b.cost / MILLI)} Data</span>` : '')
          + (b.key ? `<kbd>${b.key}</kbd>` : '');
        btn.title = b.disabled ? `${b.tip}

(${b.disabled})` : b.tip;
        btn.disabled = !!b.disabled;
        btn.addEventListener('click', () => onPress(b));
        el.appendChild(btn);
      }
    },
    tooltip(text, sx, sy) {
      const tip = $('hud-tip');
      tip.hidden = !text;
      if (!text) return;
      tip.textContent = text;
      tip.style.left = `${sx + 16}px`;
      tip.style.top = `${sy + 16}px`;
    },
    showStart(onStart) {
      const el = $('hud-start');
      el.hidden = false;
      el.innerHTML = `<h1>AI Cyberwar RTS</h1>
        <p>You are the <b style="color:var(--human)">human ops team</b> (blue, left). The <b style="color:var(--ai)">AI</b> (orange) starts on the right, hidden by fog.</p>
        <p><b>Goal:</b> destroy the AI's Primary Cluster before it destroys your NOC.</p>
        <p><b>How:</b> claim Data Sources, connect them to your base with fiber, build a SOC, train an army, attack.
        The checklist on the left walks you through it. Hover anything on the map to learn what it is.</p>
        <button type="button" id="start-btn">Start</button>`;
      el.querySelector('#start-btn')!.addEventListener('click', () => { el.hidden = true; onStart(); });
    },
    alert(text) {
      alerts.push({ text, at: performance.now() });
      if (alerts.length > 3) alerts.shift();
    },
    onNarrowSelection(fn) { onNarrow = fn; },
    setIntel(html) {
      if (html === intelHtml) return;
      intelHtml = html;
      $('hud-intel').innerHTML = html;
    },
    toggleTextView() {
      showText = !showText;
      $('hud-text').hidden = !showText;
      lastTextTick = -1;
    },
  };
}

