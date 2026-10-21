import { Application, Text } from 'pixi.js';
import { createWorld, step, TICK_RATE } from './sim/world.ts';

const app = new Application();
await app.init({ resizeTo: window, background: '#111418', antialias: true });
document.body.appendChild(app.canvas);

const world = createWorld(Date.now() >>> 0);
const label = new Text({ text: '', style: { fill: '#d8e1ea', fontFamily: 'monospace', fontSize: 18 } });
label.position.set(16, 16);
app.stage.addChild(label);

// Fixed-timestep loop: the sim advances at TICK_RATE regardless of frame rate.
const msPerTick = 1000 / TICK_RATE;
let accumulator = 0;
app.ticker.add((ticker) => {
  accumulator += ticker.deltaMS;
  while (accumulator >= msPerTick) {
    step(world);
    accumulator -= msPerTick;
  }
  label.text = `AI Cyberwar RTS — greybox\nseed ${world.seed}  tick ${world.tick}`;
});
