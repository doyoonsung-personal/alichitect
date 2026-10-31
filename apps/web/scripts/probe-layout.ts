// Prints the layout size and bounds of a recorded fixture played through the store: node --import ./scripts/alias.mjs scripts/probe-layout.ts <fixture id>
import { loadFixtureFile, newStore, play } from '../src/test/fixtures.ts';
const id = process.argv[2] ?? 'ha';
const store = newStore();
play(store, loadFixtureFile(id), { flushEvery: 6 });
const l = store.getState().display.layout!;
const f = Object.values(l.frames);
const c = Object.values(l.cards);
const all = [...f, ...c];
console.log(id, 'layout', l.width, l.height, 'cards', c.length, 'frames', f.length, 'min', Math.min(...all.map((r) => r.x)), Math.min(...all.map((r) => r.y)), 'max', Math.max(...all.map((r) => r.x + r.w)), Math.max(...all.map((r) => r.y + r.h)));
console.log('card size', c[0].w, c[0].h);
