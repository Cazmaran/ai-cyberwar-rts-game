# 0002 — Renderer spike: 3D (Three.js) vs isometric 2D (M4.0, D-017, issue #7)

**Status:** prototypes built, for the owner's decision on D-017. Nothing in `src/sim/`, the AI, the harness or the HUD changed.

## Try it

Same game state, three views:

- `?renderer=pixi` (default, unchanged): top-down 2D greybox
- `?renderer=three`: 3D, Three.js 0.186
- `?renderer=iso`: isometric 2.5D, PixiJS

Example: `?renderer=three&human=boom&ai=turtle&autostart&skip=120&seed=3` (a bot plays your side), or `&stress=300` for the 300-unit fight.

## How it plugs in

`src/render/renderer.ts` defines the `Renderer` interface main.ts uses: `render(frame)`, `toWorld` / `toScreen`, `pan`, `zoomAt`, `fit`, `setBox`. The old top-down drawing moved unchanged to `src/render/pixi.ts`. Box and double-click selection now test screen positions, so they work in tilted views too. Three.js is loaded only when `?renderer=three` is picked.

## The two prototypes

| | 3D (`src/render/three/`) | Isometric (`src/render/iso/`) |
|---|---|---|
| Camera | Perspective, tilted 57°, pan/zoom keep the ground under the cursor | 2:1 diamond projection, pan/zoom |
| Units | Low-poly meshes built in code, one InstancedMesh per role × faction; face their direction, flash when hit | Upright shaded shapes with shadows, depth-sorted by x+y; face their direction |
| Buildings | Extruded blocks with faction trim and real shadows; height per type | Iso blocks (lit top, shaded sides); height per type; unfinished ones rise as they build |
| Ground, fog | Slate ground, tile grid, fog as a 48×32 texture with soft edges | Dark slab with grid and rim, fog reuses the existing per-tile shading |
| Lighting | Hemisphere + sun with a 2048 shadow map | Baked into the shapes (fixed light) |
| Art needed for final look | 3D models (glTF), one per unit/building type; animations optional | Sprite sheets: ~1.5–2.5k frames for units at 8 facings × idle/move/attack/death, ~50–100 building sprites, ~30–60 ground/site sprites |
| Extra download | ~151 kB gzipped (Three.js chunk, only when picked) | none |
| Tests | Camera framing, toWorld/toScreen round trip, zoom and pan | Projection round trip, fit, zoom and pan |

### Performance

Measured in the built-in browser of the Claude desktop app. Treat the numbers as rough: the pane was sometimes hidden, which pauses page frames, and the page was capped at about 83 frames per second during testing.

- `?stress=300`: 3D held a steady 82–83 fps (at the cap), top-down Pixi 44 fps in the same run.
- Normal match: iso 82–83 fps, 3D 82–165 fps.
- Iso direct timing on the stress fight (render + GPU sync): about 12 ms per frame vs about 19 ms for the top-down Pixi view.

All three are well inside the Gate 1 bar (300 units at 60 fps). A proper benchmark on a normal browser window is a to-do before the decision.

## Screenshots

`docs/proposals/renderer-spike/`:

- 3D: `three-base-attack.jpg`, `three-stress-300.jpg`
- Iso: `iso-match-frontline.jpg`, `iso-base-closeup.jpg`, `iso-stress-300.jpg`, `iso-match-fit.jpg`

## Known gaps (prototype quality)

- **Both:** worker job markers are partly missing in 3D; at the full-map framing units are small, so you zoom in to play; picking is on the ground plane, so very tall shapes are clicked at their feet.
- **3D:** units can overlap visually; shot beams and death marks are thin; wheel zoom is slow from the full-map view.
- **Iso:** depth sorting uses object centres, so big cores can sort wrong against units right beside them; the diamond makes the default framing about 30% smaller than top-down.

## Recommendation (for the owner to weigh)

- **3D** gets the biggest jump in looks for the least art: lighting, shadows and a free camera come with the engine, and one model per type covers every angle. Cost: a 151 kB library and a different picking model.
- **Isometric** keeps the whole game on PixiJS and is the most "classic RTS". But final art is sprite-heavy: every unit needs 8 facings × several animations, and that is weeks of artist time.

For a small team that builds with agents, 3D looks like the cheaper path to a finished look.
