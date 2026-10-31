// Headless interaction checks for the canvas track, against a running dev server (default http://127.0.0.1:5196) or its own
// on a free port in 5185-5199. Prints PASS/FAIL per check and exits 1 when one fails.
//   node scripts/e2e-canvas.mjs [--url http://127.0.0.1:5196]
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const free = (port) =>
  new Promise((res) => {
    const s = net.createServer();
    s.once('error', () => res(false));
    s.once('listening', () => s.close(() => res(true)));
    s.listen(port, '127.0.0.1');
  });
async function startServer() {
  for (let port = 5185; port <= 5199; port++) {
    if (!(await free(port))) continue;
    const child = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { cwd: WEB, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', () => {});
    child.stderr.on('data', () => {});
    const url = `http://127.0.0.1:${port}`;
    for (let i = 0; i < 80; i++) {
      try {
        if ((await fetch(url)).ok) return { url, stop: () => child.kill() };
      } catch {}
      await sleep(250);
    }
    child.kill();
  }
  throw new Error('no free port');
}
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find((p) => p && existsSync(p));

let failed = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
};

const only = arg('--only', '');
const given = arg('--url', '');
const server = given ? { url: given, stop() {} } : await startServer();
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
const errors = [];
async function open(fixture, { w = 1440, h = 900, lang = 'en', reduced = false, speed = 'instant' } = {}) {
  const p = await browser.newPage();
  await p.setViewport({ width: w, height: h });
  if (reduced) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.evaluateOnNewDocument((l) => {
    try {
      localStorage.clear();
      localStorage.setItem('ab.lang', l);
    } catch {}
  }, lang);
  p.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  p.on('console', (m) => {
    if (m.type() === 'error' && !/502|Bad Gateway/.test(m.text())) errors.push(`console: ${m.text()}`);
  });
  await p.goto(`${server.url}/?replay=${fixture}&speed=${speed}&lang=${lang}`, { waitUntil: speed === 'instant' ? 'networkidle0' : 'domcontentloaded' });
  if (speed === 'instant') await sleep(1600);
  return p;
}
const vp = (p) =>
  p.evaluate(() => {
    const m = /translate\(([-\d.]+)px, ([-\d.]+)px\) scale\(([-\d.]+)\)/.exec(document.querySelector('.react-flow__viewport')?.style.transform ?? '');
    return m ? { x: +m[1], y: +m[2], zoom: +m[3] } : null;
  });

// ----- residency: pan, zoom, tools, keyboard, popover -----
{
  const p = await open('residency');
  const v0 = await vp(p);
  check('fit: zoom 0.95 at 1040x800', v0 && Math.abs(v0.zoom - 0.95) < 0.01, JSON.stringify(v0));
  await p.mouse.move(700, 400);
  await p.mouse.wheel({ deltaY: 120 });
  await sleep(300);
  const v1 = await vp(p);
  check('wheel pans, does not zoom', v1 && Math.abs(v1.zoom - v0.zoom) < 1e-6 && Math.abs(v1.y - v0.y) > 1, JSON.stringify(v1));
  await p.keyboard.down('Control');
  await p.mouse.wheel({ deltaY: -200 });
  await p.keyboard.up('Control');
  await sleep(300);
  const v2 = await vp(p);
  check('ctrl+wheel zooms', v2 && v2.zoom > v1.zoom + 0.01, JSON.stringify(v2));
  await p.click('.cv-tools button[aria-label="Fit to view"]');
  await sleep(700);
  const v3 = await vp(p);
  check('fit button restores the fit', v3 && Math.abs(v3.zoom - 0.95) < 0.01, JSON.stringify(v3));
  await p.click('.cv-tools button[aria-label="Zoom in"]');
  await sleep(500);
  const v4 = await vp(p);
  check('zoom in steps up', v4 && v4.zoom > v3.zoom + 0.05, JSON.stringify(v4));
  // drag on blank pane
  const before = await vp(p);
  await p.mouse.move(480, 120);
  await p.mouse.down();
  await p.mouse.move(540, 160, { steps: 5 });
  await p.mouse.up();
  await sleep(200);
  const after = await vp(p);
  check('drag pans', Math.abs(after.x - before.x) > 20, `${before.x.toFixed(0)} -> ${after.x.toFixed(0)}`);
  for (let i = 0; i < 3; i++) {
    await p.click('.cv-tools button[aria-label="Zoom out"]');
    await sleep(300);
  }
  const low = await p.evaluate(() => document.querySelector('.cv-tools__value')?.getAttribute('data-low'));
  check('below the floor the zoom value warns', low !== null && low !== undefined, String(low));
  await p.click('.cv-tools button[aria-label="Fit to view"]');
  await sleep(600);

  // keyboard: one tab stop, arrows, Enter into the popover, Escape back
  const stops = await p.evaluate(() => document.querySelectorAll('.cv [tabindex="0"][data-nav-id]').length);
  check('canvas has exactly one tab stop', stops === 1, String(stops));
  await p.evaluate(() => document.querySelector('.cv [tabindex="0"][data-nav-id]').focus());
  await sleep(150);
  const first = await p.evaluate(() => document.activeElement?.getAttribute('data-nav-id'));
  await p.keyboard.press('ArrowRight');
  await sleep(150);
  const second = await p.evaluate(() => document.activeElement?.getAttribute('data-nav-id'));
  check('arrow moves focus to another card', !!second && second !== first, `${first} -> ${second}`);
  const popOpen = await p.evaluate(() => !!document.querySelector('.cv-pop'));
  check('focus opens the popover at once', popOpen);
  await p.keyboard.press('Enter');
  await sleep(200);
  const inPop = await p.evaluate(() => !!document.activeElement?.closest('.cv-pop'));
  const hasLink = await p.evaluate(() => !!document.querySelector('.cv-pop a, .cv-pop button'));
  check('Enter moves focus into a popover that has a link', hasLink ? inPop : true, `link=${hasLink} in=${inPop}`);
  await p.keyboard.press('Escape');
  await sleep(200);
  const closed = await p.evaluate(() => !document.querySelector('.cv-pop'));
  const back = await p.evaluate(() => document.activeElement?.getAttribute('data-nav-id'));
  check('Escape closes the popover and returns focus to the card', closed && back === second, `back=${back}`);
  await p.keyboard.press('f');
  await sleep(500);
  check('F fits', Math.abs((await vp(p)).zoom - 0.95) < 0.01);

  // hover popover after 300 ms (park the pointer on blank sheet first: a card under it would open on its own)
  await p.mouse.move(470, 110);
  await sleep(500);
  await p.hover('.cv-card[data-nav-id="kms"]');
  await sleep(120);
  const early = await p.evaluate(() => document.querySelector('.cv-pop')?.querySelector('.cv-pop__title')?.textContent ?? false);
  const act = await p.evaluate(() => document.activeElement?.getAttribute('data-nav-id') ?? document.activeElement?.className);
  await sleep(300);
  const late = await p.evaluate(() => !!document.querySelector('.cv-pop'));
  check('hover opens the popover after about 300 ms', !early && late, `early=${early} late=${late} active=${act}`);
  const pop = await p.evaluate(() => {
    const r = document.querySelector('.cv-pop').getBoundingClientRect();
    const c = document.querySelector('.cv-card[data-nav-id="kms"]').getBoundingClientRect();
    return { overlaps: r.left < c.right && r.right > c.left && r.top < c.bottom && r.bottom > c.top, w: r.width };
  });
  check('popover is 320 wide and does not cover its card', pop.w === 320 && !pop.overlaps, JSON.stringify(pop));
  await p.mouse.move(700, 120);
  await sleep(400);
  check('leaving closes it', await p.evaluate(() => !document.querySelector('.cv-pop')));
  // highlight sync and hover reporting to the store
  await p.hover('.cv-card[data-nav-id="alb"]');
  const hv = await p.evaluate(() => window.__ab.store.getState().ui.hoverCard);
  check('hover reports the card to the store', hv === 'alb', String(hv));
  // revision tag
  const tag = await p.$('.cv-tag');
  check('latest revision tag is on the canvas', !!tag);
  await tag?.hover();
  await sleep(200);
  const hl = await p.evaluate(() => window.__ab.store.getState().ui.highlight);
  check('hovering a tag highlights the revision', hl && hl.revision === 4 && hl.cards.length > 0, JSON.stringify(hl));
  await p.close();
}

// ----- control edges appear on hover -----
{
  const p = await open('residency');
  const before = await p.evaluate(() => document.querySelectorAll('.cv-edge[data-kind="control"]').length);
  await p.hover('.cv-card[data-nav-id="app"]');
  await sleep(300);
  const after = await p.evaluate(() => document.querySelectorAll('.cv-edge[data-kind="control"]').length);
  check('control edges are hidden at rest and shown on hover', before === 0 && after > 0, `${before} -> ${after}`);
  await p.close();
}

// ----- focus diagram refits once the width settles -----
{
  const p = await open('residency');
  const a = await vp(p);
  const clicked = await p.evaluate(() => {
    const b = [...document.querySelectorAll('header button')].find((x) => /focus|집중|聚焦/i.test(x.textContent ?? ''));
    b?.click();
    return !!b;
  });
  await sleep(1200);
  const b = await vp(p);
  check('focus diagram: the canvas refits to the wider stage', clicked && b && b.zoom >= a.zoom - 1e-6 && Math.abs(b.x - a.x) > 5, `${JSON.stringify(a)} -> ${JSON.stringify(b)}`);
  await p.close();
}

// ----- motion: what moves, and the reduced-motion grammar -----
async function sample(p, ms) {
  const out = [];
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    // another track saving a file can make Vite reload the page under us: skip that sample
    const one = await p.evaluate(() => ({
        enter: [...document.querySelectorAll('.cv-unit[data-enter]')].map((el) => getComputedStyle(el).animationName),
        ghosts: document.querySelectorAll('.cv-card--ghost').length,
        moving: document.querySelectorAll('.react-flow__node.is-moving').length,
        marks: document.querySelectorAll('.cv-mark[data-on]').length,
        tags: document.querySelectorAll('.cv-tag').length,
        cards: document.querySelectorAll('.cv-card:not(.cv-card--ghost)').length,
      })).catch(() => null);
    if (one) out.push(one);
    await sleep(60);
  }
  return out;
}
{
  const p = await open('ecommerce-k8s', { speed: '4x' });
  const s = await sample(p, 24000);
  const names = new Set(s.flatMap((x) => x.enter));
  check('motion: cards enter with the rise keyframes', names.has('cv-card-in'), [...names].join(','));
  check('motion: the swapped card leaves through a ghost', s.some((x) => x.ghosts > 0));
  const ghostFrames = s.filter((x) => x.ghosts > 0).length;
  check('motion: the ghost is gone within a second', ghostFrames * 0.06 + 0.06 < 1.2, `${ghostFrames} samples`);
  check('motion: BuildMarks show while streaming', s.some((x) => x.marks > 0));
  check('motion: revision tags appear at commit and marks hand over', s.some((x) => x.tags > 0) && s[s.length - 1].marks === 0, `last marks=${s[s.length - 1].marks}`);
  check('motion: bystander cards do not move (moves are rare)', Math.max(...s.map((x) => x.moving)) <= 3, `max moving ${Math.max(...s.map((x) => x.moving))}`);
  const router = await p.evaluate(() => document.querySelector('.cv')?.getAttribute('data-router'));
  check('routing: libavoid answered at least once', router === 'libavoid', String(router));
  await p.close();
}
{
  const p = await open('ecommerce-k8s', { speed: '4x', reduced: true });
  const s = await sample(p, 24000);
  const names = new Set(s.flatMap((x) => x.enter));
  check('reduced motion: entrances are plain fades, no rise', names.size > 0 && ![...names].includes('cv-card-in'), [...names].join(','));
  const dur = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--d-move').trim());
  check('reduced motion: the move duration token is 0', dur === '0ms', dur);
  await p.close();
}

await browser.close();
server.stop();
if (errors.length) console.log('\nbrowser errors:\n' + [...new Set(errors)].join('\n'));
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);
