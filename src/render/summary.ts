// Post-match summary: totals, the moment the opponent was furthest ahead, and two small line charts
// (army value, income) for both sides. Colors are the faction hues stepped for a dark chart surface
// (validated: lightness band, colorblind separation, contrast).
import { TICK_RATE, type Faction } from '../sim/index.ts';
import { biggestGap, economicLead, incomeGap, type MatchStats, type Sample } from '../harness/stats.ts';

const SERIES: Record<Faction, { color: string; label: string }> = {
  human: { color: '#3d96f2', label: 'You' },
  ai: { color: '#d96a24', label: 'AI' },
};
const W = 420;
const H = 130;
const PAD = { l: 40, r: 44, t: 8, b: 20 };

const clock = (tick: number) => {
  const s = Math.trunc(tick / TICK_RATE);
  return `${Math.trunc(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** A round axis maximum: 1, 2 or 5 times a power of ten, at least the data max. */
function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  return ([1, 2, 5, 10].map((m) => m * p).find((m) => m >= v))!;
}

function chart(id: string, title: string, unit: string, samples: Sample[], pick: (s: Sample, f: Faction) => number): string {
  const lastTick = samples.at(-1)?.tick ?? 1;
  const max = niceMax(Math.max(...samples.flatMap((s) => [pick(s, 'human'), pick(s, 'ai')])));
  const x = (tick: number) => PAD.l + ((W - PAD.l - PAD.r) * tick) / lastTick;
  const y = (v: number) => PAD.t + (H - PAD.t - PAD.b) * (1 - v / max);
  const grid = [0, 0.5, 1].map((f) => `<line x1="${PAD.l}" x2="${W - PAD.r}" y1="${y(max * f)}" y2="${y(max * f)}" class="grid"/>`
    + `<text x="${PAD.l - 6}" y="${y(max * f) + 4}" text-anchor="end" class="axis">${Math.round(max * f)}</text>`).join('');
  const minutes = Math.trunc(lastTick / (60 * TICK_RATE));
  const step = minutes > 10 ? 5 : minutes > 4 ? 2 : 1;
  const ticks = Array.from({ length: Math.trunc(minutes / step) + 1 }, (_, i) => i * step)
    .map((m) => `<text x="${x(m * 60 * TICK_RATE)}" y="${H - 4}" text-anchor="middle" class="axis">${m}m</text>`).join('');
  const lines = (['human', 'ai'] as const).map((f) => {
    const pts = samples.map((s) => `${x(s.tick).toFixed(1)},${y(pick(s, f)).toFixed(1)}`).join(' ');
    const last = samples.at(-1);
    const end = last ? `<text x="${W - PAD.r + 4}" y="${y(pick(last, f)) + 4}" class="end">${SERIES[f].label} ${Math.round(pick(last, f))}</text>` : '';
    return `<polyline points="${pts}" fill="none" stroke="${SERIES[f].color}" stroke-width="2" stroke-linejoin="round"/>${end}`;
  }).join('');
  const legend = (['human', 'ai'] as const)
    .map((f) => `<span class="sw" style="background:${SERIES[f].color}"></span>${SERIES[f].label}`).join(' &nbsp; ');
  return `<figure class="chart"><figcaption><b>${title}</b> <span class="dim">(${unit})</span> <span class="legend">${legend}</span></figcaption>`
    + `<svg id="${id}" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${title} over time, you and the AI">`
    + `${grid}${ticks}${lines}<line class="cross" x1="0" x2="0" y1="${PAD.t}" y2="${H - PAD.b}" visibility="hidden"/></svg>`
    + `<div class="tip" hidden></div></figure>`;
}

export function summaryHtml(s: MatchStats, winner: Faction, you: Faction = 'human'): string {
  const them: Faction = you === 'human' ? 'ai' : 'human';
  const end = s.samples.at(-1)?.tick ?? 0;
  const head = winner === you
    ? `The network holds. <b>You win</b> in ${clock(end)}.`
    : `The Model has taken the network. <b>AI wins</b> in ${clock(end)}.`;
  const gap = biggestGap(s, you);
  const armyLine = !gap ? 'The AI\'s army never got far ahead of yours.'
    : gap.ratio === null ? `Biggest gap: at <b>${clock(gap.tick)}</b> you had no army; the AI's was worth <b>${Math.round(gap.theirs)} Data</b>.`
    : `Biggest gap: at <b>${clock(gap.tick)}</b> the AI's army was worth <b>${gap.ratio.toFixed(1)}×</b> yours.`;
  // The turning point tells the match's economic story; an early income gap is only worth mentioning
  // when nobody pulled ahead for good.
  const lead = economicLead(s);
  const last = s.samples.at(-1);
  const leadLine = lead && last
    ? `Turning point: from <b>${clock(lead.tick)}</b> ${lead.leader === you ? 'you out-earned the AI' : 'the AI out-earned you'} for the rest of the match`
      + ` (at the end: you <b>${last.income[you].toFixed(1)}</b> Data/s, AI <b>${last.income[them].toFixed(1)}</b>).<br>`
    : '';
  const inc = lead ? null : incomeGap(s, you);
  const incomeLine = inc
    ? `<br>Economy: from <b>${clock(inc.tick)}</b> the AI earned <b>${inc.theirs.toFixed(1)}</b> Data/s to your <b>${inc.yours.toFixed(1)}</b> (Data sources: AI ${inc.sources[1]}, you ${inc.sources[0]}).`
    : '';
  const insight = leadLine + armyLine + incomeLine;
  const rows: [string, (f: Faction) => string][] = [
    ['Data earned', (f) => String(s.totals[f].earned)],
    ['Combat units trained', (f) => String(s.totals[f].trained)],
    ['Combat units lost', (f) => String(s.totals[f].lost)],
    ['Biggest army (Data)', (f) => String(Math.round(s.totals[f].peakArmy))],
    ['Production idle, could afford a unit', (f) => mmss(s.totals[f].idleSeconds)],
    ['Production idle, not enough Data', (f) => mmss(s.totals[f].starvedSeconds)],
  ];
  const table = `<table class="totals"><tr><th></th><th>${SERIES[you].label}</th><th>${SERIES[them].label}</th></tr>`
    + rows.map(([k, v]) => `<tr><td>${k}</td><td>${v(you)}</td><td>${v(them)}</td></tr>`).join('') + '</table>';
  return `<div class="summary"><div class="head">${head}</div><div>${insight}</div>${table}`
    + chart('chart-army', 'Army value', 'Data', s.samples, (x, f) => x.army[f])
    + chart('chart-income', 'Income', 'Data/s', s.samples, (x, f) => x.income[f])
    + '<small class="dim">"Production idle": time your SOC sat empty after it was built, split by whether you had Data for a unit (lost time you could have used) or not (starved). Reload to play again.</small></div>';
}

const mmss = (secs: number) => `${Math.trunc(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;

/** Hover: a crosshair and a tooltip with both sides' values at the nearest sample. */
export function attachSummaryHover(root: HTMLElement, s: MatchStats): void {
  const pickers: Record<string, [string, (x: Sample, f: Faction) => number]> = {
    'chart-army': ['Data', (x, f) => x.army[f]],
    'chart-income': ['Data/s', (x, f) => x.income[f]],
  };
  const lastTick = s.samples.at(-1)?.tick ?? 1;
  for (const [id, [unit, pick]] of Object.entries(pickers)) {
    const svg = root.querySelector<SVGSVGElement>(`#${id}`);
    const tip = svg?.parentElement?.querySelector<HTMLElement>('.tip');
    const cross = svg?.querySelector<SVGLineElement>('.cross');
    if (!svg || !tip || !cross) continue;
    svg.addEventListener('pointermove', (e) => {
      const r = svg.getBoundingClientRect();
      const vx = ((e.clientX - r.left) / r.width) * W;
      const tick = ((vx - PAD.l) / (W - PAD.l - PAD.r)) * lastTick;
      const sample = s.samples.reduce((a, b) => (Math.abs(b.tick - tick) < Math.abs(a.tick - tick) ? b : a));
      const sx = PAD.l + ((W - PAD.l - PAD.r) * sample.tick) / lastTick;
      cross.setAttribute('x1', String(sx));
      cross.setAttribute('x2', String(sx));
      cross.setAttribute('visibility', 'visible');
      tip.hidden = false;
      tip.style.left = `${(sx / W) * r.width + 8}px`;
      tip.innerHTML = `<b>${clock(sample.tick)}</b><br>`
        + (['human', 'ai'] as const).map((f) => `<span class="sw" style="background:${SERIES[f].color}"></span>${SERIES[f].label}: ${Math.round(pick(sample, f) * 10) / 10} ${unit}`).join('<br>');
    });
    svg.addEventListener('pointerleave', () => { tip.hidden = true; cross.setAttribute('visibility', 'hidden'); });
  }
}
