// Frame strips of the motion grammar, from a real screen recording (CDP screencast) of a production build at 1440x900:
// the landing handoff, a card entrance, an edge drawing itself, and a removal. Each strip shows the frame on screen at
// 0, 100, 200, 400 and 800 ms after the moment, with the frame's own time printed under it. The stream is the recorded
// "e-commerce, then Kubernetes instead of ECS" conversation from a fake drawing service (no key, no Qwen).
//   node scripts/motion/strips.mjs --label before|after [--no-build] [--speed 2] [--reduced]
// Writes screenshots/motion/<label>/{handoff,card,edge,removal}.png and report.json. Ports: free ones in 5185-5199.
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { WEB, launch, sleep, startFakeServer } from '../console/lib.mjs';
import { build, frameAt, recorder, startPreview, startScreencast } from './lib.mjs';

const args = process.argv.slice(2);
const arg = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const LABEL = arg('--label', 'after');
const SPEED = Number(arg('--speed', '2'));
const REDUCED = args.includes('--reduced');
const OUT = path.join(WEB, 'screenshots/motion', LABEL + (REDUCED ? '-reduced' : ''));
const OFFSETS = [0, 100, 200, 400, 800];
mkdirSync(OUT, { recursive: true });

if (!args.includes('--no-build')) build();
const fake = await startFakeServer('ecommerce-k8s', { speed: SPEED });
const vite = await startPreview(fake.url, new Set([fake.port]));
const browser = await launch();
const log = (m) => process.stdout.write(m + '\n');

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
  await page.goto(vite.url + '/?lang=en', { waitUntil: 'networkidle0' });
  await page.waitForSelector('.brief__input');
  await sleep(600);
  const ask = 'We are launching a cross-border e-commerce site for Southeast Asia: about 50k daily active users, 10x traffic spikes during flash sales, product search, lots of product images, and we want an AI shopping-assistant chatbot. It must be highly available.';
  await page.evaluate((t) => {
    const ta = document.querySelector('.brief__input');
    const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    set.call(ta, t);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }, ask);
  await sleep(400);
  const cast = await startScreencast(page);
  await sleep(300);
  const tEnter = await page.evaluate(() => {
    const t = Date.now();
    document.querySelector('.brief__input').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    return t;
  });
  const done = (n) => page.waitForFunction((k) => window.__ab.store.getState().session.revisions[k - 1]?.status === 'done', { timeout: 120000, polling: 100 }, n);
  await done(1);
  log('revision 1 committed');
  await sleep(1800);
  await page.click('.console [data-flip="composer"] textarea');
  await page.keyboard.type('Run the app tier on Kubernetes instead of ECS.');
  await page.keyboard.press('Enter');
  await done(2);
  log('revision 2 committed');
  await sleep(1600);
  // pointing at a change line, opening the products panel, and an export (downloads are denied: nothing is saved)
  const extra = {};
  const line = await page.$('.rev[data-n="2"] button.chg');
  if (line) {
    const box = await line.boundingBox();
    await page.mouse.move(box.x + 30, box.y + box.height / 2 + 200);
    await sleep(300);
    extra.highlight = await page.evaluate(() => Date.now());
    await page.mouse.move(box.x + 30, box.y + box.height / 2);
    await sleep(900);
    extra.lit = await page.evaluate(() => {
      const rs = [...document.querySelectorAll('.cv-card[data-lit]')].map((el) => el.getBoundingClientRect());
      if (!rs.length) return null;
      const x = Math.min(...rs.map((r) => r.left));
      const y = Math.min(...rs.map((r) => r.top));
      return { x, y, w: Math.max(...rs.map((r) => r.right)) - x, h: Math.max(...rs.map((r) => r.bottom)) - y };
    });
    await page.mouse.move(700, 880);
    await sleep(500);
  }
  extra.panel = await page.evaluate(() => Date.now());
  await page.click('.pp__handle');
  await sleep(1200);
  await page.click('.pp__handle');
  await sleep(700);
  const cdp = await page.createCDPSession();
  await cdp.send('Browser.setDownloadBehavior', { behavior: 'deny' }).catch(() => {});
  const xp = await page.$('.xp > button');
  if (xp) {
    await xp.click();
    await sleep(500);
    extra.exportAt = await page.evaluate(() => {
      const t = Date.now();
      document.querySelector('.xp__panel button[type="submit"]')?.click();
      return t;
    });
    await sleep(2000);
    extra.exportRect = await page.evaluate(() => {
      const r = document.querySelector('.xp__panel')?.getBoundingClientRect();
      return r ? { x: r.left, y: r.top, w: r.width, h: r.height } : null;
    });
  }
  await cast.stop();
  const marks = await page.evaluate(() => window.__motion);
  const frames = cast.frames.sort((a, b) => a.t - b.t);
  log(`${frames.length} frames over ${((frames.at(-1).t - frames[0].t) / 1000).toFixed(1)} s`);

  const grow = (r, m) => ({ x: Math.max(0, r.x - m), y: Math.max(0, r.y - m), w: Math.min(1440, r.x + r.w + m) - Math.max(0, r.x - m), h: Math.min(900, r.y + r.h + m) - Math.max(0, r.y - m) });
  const union = (a, b) => {
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
  };
  const scenes = [];
  scenes.push({ name: 'handoff', title: 'Landing prompt hands off into revision 1', t0: tEnter, crop: { x: 0, y: 0, w: 1440, h: 900 } });
  scenes.push({ name: 'handoff-console', title: 'The handoff, console side: the words land as revision 1 and the box settles as the composer', t0: tEnter, crop: { x: 0, y: 0, w: 720, h: 900 } });
  const card = marks.cards.alb;
  if (card?.rect) scenes.push({ name: 'card', title: 'A card enters (ALB, the first card in the VPC)', t0: card.t, crop: grow(card.rect, 90) });
  const edge = marks.edges.find((e) => e.from === 'alb' && e.to === 'ecs-a') ?? marks.edges.find((e) => e.from === 'esa' && e.to === 'alb') ?? marks.edges[4];
  if (edge && marks.cards[edge.from]?.rect && marks.cards[edge.to]?.rect)
    scenes.push({ name: 'edge', title: `An edge draws (${edge.from} to ${edge.to})`, t0: edge.t, crop: grow(union(union(marks.cards[edge.from].rect, marks.cards[edge.to].rect), edge.rect ?? edge.rect), 40) });
  const ghost = marks.ghosts['ecs-a'] ?? Object.values(marks.ghosts)[0];
  if (ghost) scenes.push({ name: 'removal', title: 'A card is removed (App Servers AZ-A, for ACK)', t0: ghost.t, crop: grow(ghost.rect, 110) });

  // a badge snapping onto its host (WAF onto ESA, mid-stream), and the commit of revision 1 (tags stamp on as the
  // Cursor bars under the new cards hand over)
  const waf = marks.badges.waf;
  if (waf?.rect) scenes.push({ name: 'badge', title: 'A badge snaps onto its host (WAF onto ESA)', t0: waf.t, crop: grow(waf.rect, 70) });
  if (marks.tags && marks.cards.alb?.rect) scenes.push({ name: 'commit', title: 'Revision 1 commits: the tags stamp on as the Cursor bars hand over', t0: marks.tags, crop: grow(marks.cards.alb.rect, 120) });
  if (extra.highlight && extra.lit) scenes.push({ name: 'highlight', title: 'Pointing at a change line: the ring closes in on its cards, the rest dims', t0: extra.highlight, crop: grow(extra.lit, 120) });
  scenes.push({ name: 'panel', title: 'The products panel rises, its rows cascade in', t0: extra.panel, crop: { x: 400, y: 260, w: 1040, h: 640 } });
  if (extra.exportAt && extra.exportRect) scenes.push({ name: 'export', title: 'Export: the bar sweeps while the PDF is made in the tab, then fills', t0: extra.exportAt, crop: grow(extra.exportRect, 16) });
  const report = { label: LABEL, reduced: REDUCED, speed: SPEED, frames: frames.length, errors, cancels: marks.cancels, scenes: [] };
  const comp = await browser.newPage();
  for (const s of scenes) {
    const picks = OFFSETS.map((o) => {
      const f = frameAt(frames, s.t0 + o);
      return { o, f, at: f ? Math.round(f.t - s.t0) : null };
    });
    report.scenes.push({ name: s.name, crop: s.crop, frameTimes: picks.map((p) => p.at) });
    if (args.includes('--raw')) for (const p of picks) if (p.f) writeFileSync(path.join(OUT, `${s.name}-${p.o}.jpg`), Buffer.from(p.f.data, 'base64'));
    const cellW = s.name === 'handoff' ? 560 : s.name === 'handoff-console' ? 360 : Math.min(420, Math.max(260, s.crop.w));
    const scale = cellW / s.crop.w;
    const cellH = Math.round(s.crop.h * scale);
    const cells = picks
      .map(
        (p) => `<figure><div class="cell" style="width:${cellW}px;height:${cellH}px"><img src="data:image/jpeg;base64,${p.f?.data ?? ''}" style="width:${1440 * scale}px;left:${-s.crop.x * scale}px;top:${-s.crop.y * scale}px"></div>
        <figcaption><b>${p.o} ms</b> <span>frame at +${p.at} ms</span></figcaption></figure>`,
      )
      .join('');
    await comp.setContent(`<!doctype html><meta charset="utf-8"><style>
      body{margin:0;background:#fff;font:13px/18px Arial,sans-serif;color:#181818}
      .strip{display:inline-block;padding:16px 20px 18px}
      h1{margin:0 0 10px;font-size:14px;line-height:20px;font-weight:700}
      h1 span{font-weight:400;color:#636466}
      .row{display:flex;gap:12px}
      figure{margin:0}
      .cell{position:relative;overflow:hidden;border:1px solid #bcbec0;background:#fff}
      .cell img{position:absolute;max-width:none}
      figcaption{margin-top:6px} figcaption span{color:#636466;margin-left:6px}
    </style><div class="strip"><h1>${s.title} <span>· ${LABEL}${REDUCED ? ' · reduced motion' : ''} · 1440x900 · frames from a CDP screencast</span></h1><div class="row">${cells}</div></div>`);
    await comp.evaluate(() => Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => (i.onload = r))))));
    const el = await comp.$('.strip');
    await el.screenshot({ path: path.join(OUT, `${s.name}.png`) });
    log(`${s.name}: frames at ${picks.map((p) => p.at).join(', ')} ms`);
  }
  writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ ...report, marks: { ...marks, edges: marks.edges.map(({ from, to, t }) => ({ from, to, t })) } }, null, 1));
  log(`cancelled on the canvas: ${marks.cancels.animation} animations, ${marks.cancels.transition} transitions`);
  if (errors.length) log('page errors: ' + errors.join(' | '));
} finally {
  await browser.close();
  vite.stop();
  fake.stop();
}
