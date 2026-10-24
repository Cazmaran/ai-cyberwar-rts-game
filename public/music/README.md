# Music

Background loops, played by `src/render/music.ts`. Each match picks one calm and one combat track; they play in sync and crossfade when fighting starts.

| File | Mood |
|---|---|
| `calm-1.ogg` … `calm-3.ogg` | No fighting: ambient futuristic synth pads, gentle arpeggio, low pulse |
| `combat-1.ogg` … `combat-3.ogg` | Fighting: driving electronic drums, distorted synth bass, fast arpeggio |

All six are 32 bars at 100 BPM in D minor (exactly 76.8 s), cut on a beat with the tail crossfaded into the head, so they loop without a seam and any calm/combat pair stays on the beat.

**Source and license:** original music generated locally for this project with [ACE-Step 1.5](https://github.com/ace-step/ACE-Step) (MIT), from instrumental text prompts only, with no reference audio. AI-generated, disclosed here as ACE-Step asks. Offered under CC-BY-4.0 with the rest of the project's original audio.
