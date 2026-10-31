// Frame rate while a 25-card diagram streams in, measured in the page with the Performance API: every animation frame's
// timestamp (requestAnimationFrame) and every long animation frame (PerformanceObserver 'long-animation-frame', with
// 'longtask' as a fallback), from the moment the brief is sent until 1.5 s after the commit (so the commit's refit,
// tag stamps and hand-over are in it). The stream is the recorded e-commerce first turn plus four cards (lib.mjs
// bigFixture), from a fake drawing service at --speed times its recorded pace. Production build by default.
//   node scripts/motion/perf.mjs [--speed 3] [--runs 3] [--throttle 4] [--dev] [--reduced] [--no-build] [--dist dir] [--out file.json]
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { launch, sleep, startFakeServer, startVite, WEB } from '../console/lib.mjs';
import { bigFixture, build, recorder, startPreview } from './lib.mjs';

const args = process.argv.slice(2);
const arg = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const SPEED = Number(arg('--speed', '3'));
const RUNS = Number(arg('--runs', '3'));
const THROTTLE = Number(arg('--throttle', '1'));
const DEV = args.includes('--dev');
const REDUCED = args.includes('--reduced');
/** Another build to measure (a baseline), served as it is. */
const DIST_ARG = arg('--dist', '');

const fxFile = path.join(process.env.TEMP ?? WEB, 'ab-motion-perf-25.json');
writeFileSync(fxFile, JSON.stringify(bigFixture()));
if (!DEV && !DIST_ARG && !args.includes('--no-build')) build();

const pct = (xs, p) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};
const r1 = (n) => Math.round(n * 10) / 10;

const results = [];
const browser = await launch();
try {
  for (let run = 0; run < RUNS; run++) {
    const fake = await startFakeServer('perf-25', { speed: SPEED, file: fxFile });
    const web = DEV ? await startVite(fake.url, new Set([fake.port])) : await startPreview(fake.url, new Set([fake.port]), DIST_ARG || undefined);
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
      if (REDUCED) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
      await page.evaluateOnNewDocument(() => {
        try {
          localStorage.clear();
          localStorage.setItem('ab.lang', 'en');
        } catch {
          /* private mode */
        }
      });
      await page.evaluateOnNewDocument(recorder);
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(web.url + '/?lang=en', { waitUntil: 'networkidle0' });
      await page.waitForSelector('.brief__input');
      await page.type('.brief__input', 'We are launching a cross-border e-commerce site for Southeast Asia: about 50k daily active users, 10x traffic spikes during flash sales.');
      await sleep(500);
      const cdp = await page.createCDPSession();
      if (THROTTLE > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });
      await page.evaluate(() => {
        const m = (window.__perf = { frames: [], loaf: [], longtasks: [], t0: performance.now() });
        const loop = (t) => {
          m.frames.push(t);
          if (!m.stop) requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
        try {
          new PerformanceObserver((l) => {
            for (const e of l.getEntries()) m.loaf.push({ start: e.startTime, duration: e.duration, blocking: e.blockingDuration ?? 0, render: e.renderStart ? e.startTime + e.duration - e.renderStart : 0 });
          }).observe({ type: 'long-animation-frame', buffered: false });
        } catch {
          /* not supported */
        }
        try {
          new PerformanceObserver((l) => {
            for (const e of l.getEntries()) m.longtasks.push({ start: e.startTime, duration: e.duration });
          }).observe({ type: 'longtask', buffered: false });
        } catch {
          /* not supported */
        }
      });
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => window.__ab.store.getState().session.revisions[0]?.status === 'done', { timeout: 120000, polling: 200 });
      const tCommit = await page.evaluate(() => performance.now());
      await sleep(1500);
      const m = await page.evaluate(() => {
        window.__perf.stop = true;
        return { ...window.__perf, end: performance.now(), cards: document.querySelectorAll('.react-flow__node-card').length, edges: document.querySelectorAll('.cv-edge').length, cancels: window.__motion?.cancels };
      });
      if (THROTTLE > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      const iv = [];
      for (let i = 1; i < m.frames.length; i++) iv.push(m.frames[i] - m.frames[i - 1]);
      const dur = m.frames.at(-1) - m.frames[0];
      // a frame is "missed" for every 16.7 ms vsync an interval skipped
      const missed = iv.reduce((n, d) => n + Math.max(0, Math.round(d / 16.667) - 1), 0);
      const r = {
        run: run + 1,
        seconds: r1(dur / 1000),
        commitAt: r1((tCommit - m.t0) / 1000),
        cards: m.cards,
        edges: m.edges,
        frames: m.frames.length,
        fps: r1((iv.length / dur) * 1000),
        p50: r1(pct(iv, 50)),
        p95: r1(pct(iv, 95)),
        p99: r1(pct(iv, 99)),
        max: r1(Math.max(...iv)),
        over20: iv.filter((d) => d > 20).length,
        over34: iv.filter((d) => d > 34).length,
        missedPct: r1((missed / (iv.length + missed)) * 100),
        loaf: m.loaf.length,
        loafMaxMs: r1(Math.max(0, ...m.loaf.map((e) => e.duration))),
        loafBlockingMs: r1(m.loaf.reduce((n, e) => n + e.blocking, 0)),
        longtasks: m.longtasks.length,
        cancelled: m.cancels ? { animations: m.cancels.animation, transitions: m.cancels.transition } : null,
        errors,
      };
      results.push(r);
      process.stdout.write(`run ${r.run}: ${r.cards} cards, ${r.frames} frames in ${r.seconds} s = ${r.fps} fps; interval p50 ${r.p50} p95 ${r.p95} p99 ${r.p99} max ${r.max} ms; >20 ms ${r.over20}, >34 ms ${r.over34}; missed ${r.missedPct}%; LoAF ${r.loaf} (max ${r.loafMaxMs} ms)${errors.length ? '; errors: ' + errors.join(' | ') : ''}\n`);
      await page.close();
    } finally {
      web.stop();
      fake.stop();
    }
  }
} finally {
  await browser.close();
}
const out = arg('--out', '');
const summary = { build: DEV ? 'dev' : DIST_ARG ? `production (${path.basename(DIST_ARG)})` : 'production', speed: SPEED, throttle: THROTTLE, reduced: REDUCED, viewport: '1440x900', results };
if (out) {
  mkdirSync(path.dirname(path.resolve(WEB, out)), { recursive: true });
  writeFileSync(path.resolve(WEB, out), JSON.stringify(summary, null, 1));
}
