// prefers-reduced-motion: every animation that runs is a fade (or a colour change), nothing travels, scales or draws.
// Plays the "e-commerce, then Kubernetes instead of ECS" conversation from a fake drawing service through the landing
// handoff, both revisions, the products panel opening, a change-line highlight and the export dialog, sampling
// document.getAnimations() every 40 ms and reading each animation's keyframes. Prints PASS/FAIL lines, exits 1 on a
// failure. Also runs the same flow without the preference and checks that motion does run there.
//   node scripts/motion/reduced.mjs [--no-build] [--speed 4]
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { WEB, launch, sleep, startFakeServer } from '../console/lib.mjs';
import { build, startPreview } from './lib.mjs';

const args = process.argv.slice(2);
const arg = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const SPEED = Number(arg('--speed', '4'));
if (!args.includes('--no-build')) build();

let failed = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failed++;
  process.stdout.write(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}\n`);
};

/** In the page: samples running animations and classifies what they change. */
function sampler() {
  const seen = new Map();
  const identity = (prop, v) => {
    if (v === undefined || v === null || v === '' || v === 'none') return true;
    if (prop === 'strokeDashoffset') return parseFloat(v) === 0;
    if (prop === 'transform' || prop === 'translate' || prop === 'scale' || prop === 'rotate') {
      for (const m of String(v).matchAll(/(translate[XYZ3d]*|scale[XYZ3d]*|rotate[XYZ3d]*|matrix(?:3d)?)\(([^)]*)\)/g)) {
        const nums = m[2].split(',').map((x) => parseFloat(x));
        if (m[1].startsWith('translate') && nums.some((n) => n !== 0)) return false;
        if (m[1].startsWith('scale') && nums.some((n) => n !== 1)) return false;
        if (m[1].startsWith('rotate') && nums.some((n) => n !== 0)) return false;
        if (m[1] === 'matrix' && (nums[0] !== 1 || nums[1] !== 0 || nums[2] !== 0 || nums[3] !== 1 || nums[4] !== 0 || nums[5] !== 0)) return false;
      }
      return true;
    }
    return true;
  };
  const MOVING = ['transform', 'translate', 'scale', 'rotate', 'strokeDashoffset', 'offsetDistance'];
  const tick = () => {
    for (const a of document.getAnimations()) {
      const el = a.effect?.target;
      const who = el ? `${el.tagName.toLowerCase()}.${String(el.getAttribute?.('class') ?? '').split(' ')[0]}` : '?';
      const name = a.animationName ?? (a.transitionProperty ? `transition:${a.transitionProperty}` : 'waapi');
      const key = `${who} ${name}`;
      if (seen.has(key)) continue;
      let kf = [];
      try {
        kf = a.effect.getKeyframes();
      } catch {
        /* none */
      }
      const props = new Set();
      let moves = false;
      for (const k of kf) {
        for (const [p, v] of Object.entries(k)) {
          if (['offset', 'computedOffset', 'easing', 'composite'].includes(p)) continue;
          props.add(p);
          if (MOVING.includes(p) && !identity(p, v)) moves = true;
        }
      }
      const t = a.effect?.getComputedTiming?.();
      seen.set(key, { key, props: [...props], moves, duration: t?.duration ?? null });
    }
  };
  window.__anims = seen;
  setInterval(tick, 40);
  window.__sample = () => [...seen.values()];
  window.__flights = 0;
  new MutationObserver((l) => {
    for (const m of l) for (const n of m.addedNodes) if (n.nodeType === 1 && n.classList.contains('flight')) window.__flights++;
  }).observe(document.body ?? document.documentElement, { childList: true });
}

async function play(reduced) {
  const fake = await startFakeServer('ecommerce-k8s', { speed: SPEED });
  const vite = await startPreview(fake.url, new Set([fake.port]));
  const browser = await launch();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    if (reduced) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.evaluateOnNewDocument(() => {
      try {
        localStorage.clear();
        localStorage.setItem('ab.lang', 'en');
      } catch {
        /* private mode */
      }
    });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(vite.url + '/?lang=en', { waitUntil: 'networkidle0' });
    await page.evaluate(sampler);
    await page.type('.brief__input', 'We are launching a cross-border e-commerce site for Southeast Asia with flash sales.');
    await page.keyboard.press('Enter');
    const done = (n) => page.waitForFunction((k) => window.__ab.store.getState().session.revisions[k - 1]?.status === 'done', { timeout: 120000, polling: 100 }, n);
    await done(1);
    await sleep(900);
    const cursor = await page.evaluate(() => [...document.querySelectorAll('.cursor, .cv-cursor')].map((c) => getComputedStyle(c).animationName));
    await page.click('.console [data-flip="composer"] textarea');
    await page.keyboard.type('Run the app tier on Kubernetes instead of ECS.');
    await page.keyboard.press('Enter');
    await sleep(500);
    const blink = await page.evaluate(() => [...document.querySelectorAll('.cursor--blink, .cv-cursor')].map((c) => getComputedStyle(c).animationName));
    await done(2);
    await sleep(900);
    // pointing at a change line, the products panel, the export dialog
    const line = await page.$('.rev[data-n="2"] button.chg');
    if (line) await line.hover();
    await sleep(400);
    await page.mouse.move(5, 5);
    await page.click('.pp__handle');
    await sleep(900);
    await page.click('.pp__handle');
    await sleep(500);
    const exportBtn = await page.$('.xp > button');
    if (exportBtn) await exportBtn.click();
    await sleep(500);
    await page.keyboard.press('Escape');
    await sleep(300);
    const anims = await page.evaluate(() => window.__sample());
    const flights = await page.evaluate(() => window.__flights);
    return { anims, flights, errors, cursor: [...cursor, ...blink] };
  } finally {
    await browser.close();
    vite.stop();
    fake.stop();
  }
}

const red = await play(true);
const moving = red.anims.filter((a) => a.moves);
check('reduced: no animation moves, scales or draws', moving.length === 0, moving.map((a) => a.key).join(', '));
check('reduced: meaningful changes still fade (opacity animations ran)', red.anims.some((a) => a.props.includes('opacity')), `${red.anims.length} distinct animations`);
check('reduced: no word flight', red.flights === 0, String(red.flights));
check('reduced: the Cursor holds still', red.cursor.every((n) => n === 'none'), red.cursor.join(','));
const long = red.anims.filter((a) => a.props.some((p) => p === 'opacity') && typeof a.duration === 'number' && a.duration > 250 && !/handoff|flight/.test(a.key));
check('reduced: fades are short (250 ms or less)', long.length === 0, long.map((a) => `${a.key} ${a.duration}`).join(', '));
check('reduced: no page errors', red.errors.length === 0, red.errors.join(' | '));

const full = await play(false);
const fullMoving = full.anims.filter((a) => a.moves).map((a) => a.key);
const has = (re) => fullMoving.some((k) => re.test(k));
check('full motion: cards rise, edges draw, ghosts collapse, marks draw, tags stamp, badges snap', has(/cv-unit/) && has(/cv-edge__line cv-draw/) && has(/cv-card cv-ghost-out/) && has(/cv-mark/) && has(/cv-tag/) && has(/cv-badge/), fullMoving.filter((k) => /cv-/.test(k)).join(', '));
check('full motion: the words fly into the record', full.flights >= 2, String(full.flights));
check('full motion: no page errors', full.errors.length === 0, full.errors.join(' | '));
writeFileSync(path.join(WEB, 'screenshots/motion/reduced-check.json'), JSON.stringify({ reduced: red, full: { ...full, anims: full.anims } }, null, 1));
process.exit(failed ? 1 : 0);
