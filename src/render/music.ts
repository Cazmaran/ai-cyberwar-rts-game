// Background music: a calm loop and a combat loop that play in sync and crossfade when fighting starts
// near our units or buildings. All tracks are 32 bars at 100 BPM in D minor, so any calm/combat pair
// lines up. Each match picks one of each. Tracks: generated with ACE-Step 1.5, see public/music/README.md.
import { dist2, TILE, type FactionView } from '../sim/index.ts';

export const MUSIC = {
  /** Tracks per mood: public/music/calm-1.ogg … combat-3.ogg. */
  tracks: 3,
  /** Master volume (0-1): background, under the game's alerts. */
  volume: 0.35,
  fadeSeconds: 2,
  /** Quiet time after the last fighting before the music calms down again. */
  calmAfterMs: 10_000,
  /** Enemy combat units this close to anything of ours count as fighting. */
  range: 8 * TILE,
};

/** Visible enemy combat units near our units or buildings. */
export function fighting(v: FactionView): boolean {
  const ours = [...v.units, ...v.buildings];
  return v.enemyUnits.some((e) => e.role !== 'worker' && ours.some((o) => dist2(o.x, o.y, e.x, e.y) < MUSIC.range ** 2));
}

export interface Mood { combat: boolean; lastFight: number }

export function createMood(): Mood {
  return { combat: false, lastFight: -Infinity };
}

/** Combat starts at once and lasts until `calmAfterMs` without fighting, so short lulls don't flip it. */
export function updateMood(m: Mood, fight: boolean, now: number): boolean {
  if (fight) {
    m.combat = true;
    m.lastFight = now;
  } else if (m.combat && now - m.lastFight >= MUSIC.calmAfterMs) {
    m.combat = false;
  }
  return m.combat;
}

export interface MusicPlayer {
  /** Call from a click or key press: browsers only allow audio after a user gesture. Safe to call again. */
  start(): void;
  setCombat(on: boolean): void;
  /** Returns whether the music is now on. */
  toggleMute(): boolean;
}

export function createMusic(): MusicPlayer {
  const pick = () => 1 + Math.floor(Math.random() * MUSIC.tracks);
  const names = [`calm-${pick()}`, `combat-${pick()}`];
  let muted = false;
  try { muted = localStorage.getItem('music') === 'off'; } catch { /* storage blocked: default on */ }
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let gains: GainNode[] = [];
  let combat = false;

  const fadeTo = (g: GainNode, to: number) => {
    const t = ctx!.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(g.gain.value, t);
    g.gain.linearRampToValueAtTime(to, t + MUSIC.fadeSeconds);
  };

  return {
    start() {
      if (ctx) return;
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : MUSIC.volume;
      master.connect(ctx.destination);
      gains = names.map((_, i) => {
        const g = ctx!.createGain();
        g.gain.value = (i === 1) === combat ? 1 : 0;
        g.connect(master!);
        return g;
      });
      const audio = ctx;
      Promise.all(names.map((n) => fetch(`music/${n}.ogg`).then((r) => r.arrayBuffer()).then((b) => audio.decodeAudioData(b))))
        .then((buffers) => {
          // Start both on the same clock time so the beats stay locked while they loop.
          const when = audio.currentTime + 0.1;
          buffers.forEach((buffer, i) => {
            const src = audio.createBufferSource();
            src.buffer = buffer;
            src.loop = true;
            src.connect(gains[i]!);
            src.start(when);
          });
        })
        .catch((err) => console.warn('music failed to load', err));
    },
    setCombat(on) {
      if (on === combat) return;
      combat = on;
      if (!ctx) return;
      fadeTo(gains[0]!, on ? 0 : 1);
      fadeTo(gains[1]!, on ? 1 : 0);
    },
    toggleMute() {
      muted = !muted;
      try { localStorage.setItem('music', muted ? 'off' : 'on'); } catch { /* not saved */ }
      if (master) master.gain.setTargetAtTime(muted ? 0 : MUSIC.volume, ctx!.currentTime, 0.1);
      return !muted;
    },
  };
}
