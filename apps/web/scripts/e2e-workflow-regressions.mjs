// Offline workflow checks through the real UI, served by Vite on a free loopback port in 5196-5198.
//   node scripts/e2e-workflow-regressions.mjs (optional WF_CASE regex)
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const free = (port) =>
  new Promise((res) => {
    const s = net.createServer();
    s.once('error', () => res(false));
    s.once('listening', () => s.close(() => res(true)));
    s.listen(port, '127.0.0.1');
  });
async function startServer() {
  for (let port = 5196; port <= 5198; port++) {
    if (!(await free(port))) continue;
    const child = spawn(process.execPath, ['--input-type=module', '-e',
      "import {createServer} from 'vite'; const s=await createServer({configLoader:'native',cacheDir:'.workflow-cache',server:{port:" +
      port + ",strictPort:true,host:'127.0.0.1'}}); await s.listen();"], { cwd: WEB, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', () => {});
    child.stderr.on('data', (s) => process.stderr.write(s));
    const url = `http://127.0.0.1:${port}`;
    for (let i = 0; i < 80; i++) {
      try {
        if (child.exitCode !== null) throw new Error('Vite exited');
        if ((await fetch(url, { signal: AbortSignal.timeout(1000) })).ok) return { url, stop: () => child.kill() };
      } catch {}
      await sleep(250);
    }
    child.kill();
  }
  throw new Error('no free port');
}
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
  `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find((p) => p && existsSync(p));


console.log('Starting local workflow harness');
const server = await startServer();
console.log('Server ready', server.url);
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
console.log('Browser ready');

const failures = [];
let checks = 0;
const fixture = JSON.parse(readFileSync(path.join(WEB, '../../packages/core/test/fixtures/workflows/support-email-triage.json'), 'utf8'));
const step = (id, kind = 'ai', extra = {}) => ({ t: 'step', id, kind, label: id, ...extra });
const basic = [step('a', 'trigger'), step('b', 'ai', { after: 'a' }), step('c', 'end', { after: 'b' }),
  ...Array.from({ length: 6 }, (_, i) => step('t' + i, 'tool', { on: 'b', label: 'Tool ' + i }))];
async function pageFor(ops = basic, { width = 800, height = 600, lang = 'en', commit = true, mode = 'workflow' } = {}) {
  const p = await browser.newPage();
  await p.setViewport({ width, height });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.evaluateOnNewDocument((lang) => localStorage.setItem('ab.lang', lang), lang);
  await p.setRequestInterception(true);
  p.on('request', (r) => {
    if (r.url().includes('/api/')) return r.respond({ status: 200, contentType: 'application/json', body: '{}' });
    return r.url().startsWith(server.url) || r.url().startsWith('data:') ? r.continue() : r.abort();
  });
  await p.goto(server.url, { timeout: 90000 });
  await p.waitForFunction(() => !!window.__ab);
  await p.evaluate((mode) => {
    const { store } = window.__ab;
    store.dispatch({ type: 'session/mode', mode });
    store.dispatch({ type: 'turn/start', mode, ask: 'Regression', now: 1 });
  }, mode);
  await batch(p, ops);
  if (commit) await p.evaluate((mode) => {
    const { store } = window.__ab, s = store.getState();
    store.dispatch({ type: 'turn/event', event: { type: 'commit', memory: mode === 'workflow'
      ? { ...s.session.memory, workflow: s.work.rawWorkflow } : s.work.rawMemory, changes: '', warnings: [] }, now: 4 });
  }, mode);
  await sleep(400);
  return p;
}
async function batch(p, ops) {
  await p.evaluate((ops) => {
    const { store } = window.__ab;
    for (const op of ops) store.dispatch({ type: 'turn/event', event: { type: 'op', phase: 'main', op }, now: 2 });
    store.dispatch({ type: 'turn/flush', now: 3 });
  }, ops);
  await sleep(180);
}
async function check(id, fn) {
  if (process.env.WF_CASE && !new RegExp(process.env.WF_CASE).test(id)) return;
  checks++;
  try { await fn(); console.log('PASS', id); }
  catch (e) { failures.push(id + ': ' + e.message); console.log('FAIL', id, e.message); }
  finally { for (const p of await browser.pages()) await p.close(); }
}
function ok(value, message = 'assertion failed') { if (!value) throw new Error(message); }
const card = (id) => `[data-wf-card="${id}"]`;
async function open(p, id) { await p.focus(card(id)); await p.keyboard.press('Enter'); await sleep(100); }
const transform = (p) => p.$eval('.react-flow__viewport', e => e.style.transform);
async function wheel(p, deltaX = 200) {
  const point = await p.$eval('.wf-stage', e => { const r = e.getBoundingClientRect(); return { x: r.x + 5, y: r.y + 180 }; });
  await p.mouse.move(point.x, point.y); await p.mouse.wheel({ deltaX }); await sleep(250);
}
try {
  for (const width of [800, 1150]) await check('C8 mouse hover and +N ' + width, async () => {
    const p = await pageFor([...fixture.ops, step('b', 'ai'), ...basic.filter(o => o.on)], { width, height: width === 800 ? 600 : 800 });
    await p.focus(card('b')); await p.keyboard.press('Escape'); await p.hover(card('b')); await sleep(500);
    ok(await p.$('#cv-pop'), 'mouse hover did not open');
    await p.keyboard.press('Escape'); await p.click(card('b') + ' .wf-card__count'); await sleep(100);
    ok(await p.$eval('#cv-pop', e => ['Tool 3', 'Tool 4', 'Tool 5'].every(t => e.textContent.includes(t))));
    await p.close();
  });
  for (const id of ['kb', 'log']) for (const target of ['textarea', '#products .pp__handle']) {
    await check('C10 C42 removed ' + id + ' focus in ' + target, async () => {
      const p = await pageFor(fixture.ops, { width: 1150, height: 800 });
      await open(p, id); await p.keyboard.press('Escape');
      await p.evaluate(() => window.__ab.store.dispatch({ type: 'turn/start', mode: 'workflow', ask: 'Revision', now: 5 }));
      await p.focus(target); await batch(p, [{ t: 'unstep', id }]);
      ok(await p.$eval(target, e => e === document.activeElement), 'focus stolen');
      if (target === 'textarea') { await p.keyboard.type('fix'); ok(await p.$eval(target, e => e.value.endsWith('fix'))); }
      await p.close();
    });
  }
  await check('C12 stationary clicks preserve follow', async () => {
    const p = await pageFor(basic, { commit: false });
    await p.mouse.click(400, 400); await sleep(50);
    ok(await p.$eval('.wf-tools [aria-pressed]', e => e.getAttribute('aria-pressed') === 'true'));
    await p.click(card('b')); await sleep(50);
    ok(await p.$eval('.wf-tools [aria-pressed]', e => e.getAttribute('aria-pressed') === 'true'));
    await p.close();
  });
  await check('C13 C45 tab exit and portal order', async () => {
    const p = await pageFor(); await open(p, 'b');
    ok(await p.$eval('#cv-pop', e => !!e.closest('.wf-stage')), 'portal outside canvas');
    for (let i = 0; i < 4; i++) await p.keyboard.press('Tab');
    ok(!await p.$('#cv-pop'), 'popover remains after tab exit');
    ok(await p.evaluate(() => !!document.activeElement.closest('.wf-tools')), 'tab escaped canvas tools');
    await open(p, 'b'); await p.keyboard.press('Escape'); ok(!await p.$('#cv-pop'));
    await p.close();
  });
  await check('C14 resume restores fit', async () => {
    const p = await pageFor(basic.filter(o => !o.on || Number(o.id.slice(1)) < 3).map(o => o.on ? { ...o, on: 'c' } : o));
    const before = await transform(p); await wheel(p, -300);
    await p.click('.wf-tools [aria-pressed]'); await sleep(150);
    ok(await transform(p) === before, 'resume differs from fit: ' + JSON.stringify({ before, after: await transform(p) }));
    await p.close();
  });
  await check('C15 zoom centre', async () => {
    const p = await pageFor();
    const world = () => p.evaluate(() => {
      const s = document.querySelector('.wf-stage').getBoundingClientRect();
      const m = new DOMMatrix(getComputedStyle(document.querySelector('.react-flow__viewport')).transform);
      return { x: (s.width / 2 - m.e) / m.a, y: (110 + (s.height - 160) / 2 - m.f) / m.a };
    });
    const a = await world(); await p.click('.wf-tools button:nth-child(3)'); const b = await world();
    ok(Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1, JSON.stringify({ a, b })); await p.close();
  });
  await check('C16 modified card shortcuts', async () => {
    const p = await pageFor(); await wheel(p); await p.focus(card('b'));
    for (const modifier of ['ctrlKey', 'altKey', 'metaKey']) {
      ok(await p.$eval(card('b'), (e, modifier) => e.dispatchEvent(new KeyboardEvent('keydown',
        { key: 'f', [modifier]: true, bubbles: true, cancelable: true })), modifier), modifier + ' prevented');
    }
    await p.close();
  });
  await check('Codex #6 newest branch', async () => {
    const p = await pageFor([step('a', 'trigger'), step('b', 'ai', { after: 'a' })], { commit: false });
    await batch(p, [step('c', 'ai', { after: 'a' })]);
    ok(await p.$eval(card('c'), e => {
      const r = e.getBoundingClientRect(), s = e.closest('.wf-stage').getBoundingClientRect();
      return r.top >= s.top + 110 && r.bottom <= s.bottom - 48;
    }), 'new branch not visible'); await p.close();
  });
  await check('C30 edge copy', async () => {
    const p = await pageFor([...fixture.ops, { t: 'link', id: 'lr', from: 'check', to: 'draft', kind: 'loop' }]);
    await open(p, 'human'); ok(!await p.$eval('#cv-pop', e => e.textContent.includes('{condition}')));
    await p.keyboard.press('Escape'); await open(p, 'check');
    ok(!await p.$eval('#cv-pop', e => e.textContent.includes('0 extra passes'))); await p.close();
  });
  for (const [lang, close] of [['en', 'Close'], ['ko', '\ub2eb\uae30'], ['zh', '\u5173\u95ed']]) await check('C37 C46 C53 ' + lang, async () => {
    const p = await pageFor(basic, { lang }); await open(p, 'b');
    ok(await p.$eval('#cv-pop button', e => e.textContent) === close); await p.close();
  });
  await check('C40 zh measured lines', async () => {
    const claims = JSON.parse(readFileSync(path.join(WEB, '../../packages/core/test/fixtures/workflows/insurance-claims-triage.json'), 'utf8'));
    const p = await pageFor(claims.ops, { lang: 'zh' });
    ok(await p.$$eval('[data-wf-card]', es => es.every(e => e.scrollHeight <= e.clientHeight + 1
      && [...e.querySelectorAll('strong span')].every(s => s.offsetHeight <= parseFloat(getComputedStyle(s).lineHeight) + 1))), 'title rewrap');
    await p.close();
  });
  await check('C48 real stable toggle', async () => {
    const p = await pageFor(); const text = await p.$eval('.wf-tools [aria-pressed]', e => e.textContent);
    await p.click('.wf-tools [aria-pressed]');
    ok(await p.$eval('.wf-tools [aria-pressed]', e => e.getAttribute('aria-pressed')) === 'false');
    ok(await p.$eval('.wf-tools [aria-pressed]', e => e.textContent) === text); await p.close();
  });
  await check('C49 overview group', async () => {
    const p = await pageFor(); ok(await p.$eval('.wf-overview', e => e.getAttribute('role')) === 'group'); await p.close();
  });
  await check('C51 wf-edges collision', async () => {
    const p = await pageFor([step('in', 'trigger'), step('wf-edges', 'ai', { label: 'Classify email' }), step('end', 'end'),
      { t: 'link', id: 'l1', from: 'in', to: 'wf-edges' }, { t: 'link', id: 'l2', from: 'wf-edges', to: 'end', label: 'Classified' }]);
    ok(await p.$('svg.wf-edges'), 'edge layer missing'); ok((await p.$$('.wf-edges path')).length >= 3); await p.close();
  });
  await check('C50 cloud edges collision', async () => {
    const p = await pageFor([{ t: 'node', id: 'users', product: 'users', label: 'Users', group: null },
      { t: 'node', id: 'edges', product: 'esa', label: 'ESA', group: null },
      { t: 'node', id: 'dns', product: 'dns', label: 'DNS', group: null },
      { t: 'edge', id: 'e1', from: 'users', to: 'edges' }, { t: 'edge', id: 'e2', from: 'users', to: 'dns', kind: 'resolve' }],
      { mode: 'cloud', commit: false });
    ok(await p.$('.react-flow__node-edges'), 'cloud edge layer missing');
    ok((await p.$$('.react-flow__node-edges path')).length >= 2); await p.close();
  });
  await check('C52 unbroken tokens', async () => {
    const p = await pageFor([step('a', 'trigger', { label: 'Supercalifragilisticexpialidociousnessxxxx', why: 'W'.repeat(80) })]);
    await open(p, 'a'); ok(await p.$eval('#cv-pop', e => e.scrollWidth <= e.clientWidth), 'horizontal overflow'); await p.close();
  });

  await check('C9 Codex #8 popover pan resize fit panel and offscreen', async () => {
    const p = await pageFor(basic, { width: 1150, height: 800 }); await open(p, 'b');
    const position = () => p.$eval('#cv-pop', e => [e.offsetLeft, e.offsetTop]);
    const before = await position(); await wheel(p);
    ok(await p.$('#cv-pop'), 'pan closed visible anchor');
    ok(JSON.stringify(await position()) !== JSON.stringify(before), 'pan stranded popover');
    await p.setViewport({ width: 800, height: 600 }); await sleep(250);
    ok(await p.$eval('#cv-pop', e => e.getBoundingClientRect().right <= innerWidth), 'resize overflow');
    await wheel(p, 3000); ok(!await p.$('#cv-pop'), 'offscreen popover remains'); await p.close();
  });

  await check('C9 follow closes offscreen anchor and follows fit and panel', async () => {
    const p = await pageFor(fixture.ops.slice(0, 2), { width: 1150, height: 800, commit: false });
    await open(p, 'in'); await batch(p, fixture.ops.slice(2, 10));
    ok(!await p.$('#cv-pop'), 'offscreen follow anchor remains');
    await p.evaluate(() => {
      const { store } = window.__ab, s = store.getState();
      store.dispatch({ type: 'turn/event', event: { type: 'commit', memory: { ...s.session.memory, workflow: s.work.rawWorkflow },
        changes: '', warnings: [] }, now: 5 });
    });
    await sleep(200); await open(p, 'in');
    await p.evaluate(() => window.__ab.controller.setPanelOpen(true)); await sleep(350);
    ok(await p.$eval('#cv-pop', e => e.getBoundingClientRect().bottom <= document.querySelector('#products').getBoundingClientRect().top));
    await p.evaluate(() => window.__ab.controller.setPanelOpen(false)); await sleep(350);
    await p.$eval('.wf-tools button', e => e.click()); await sleep(150);
    ok(await p.$eval('#cv-pop', e => {
      const r = e.getBoundingClientRect(), a = document.querySelector('[data-wf-card="in"]').getBoundingClientRect();
      return r.right <= a.left || r.left >= a.right || r.bottom <= a.top || r.top >= a.bottom;
    }), 'fit overlaps anchor');
  });
  await check('Codex #6 changed step and hidden attachment owner', async () => {
    const p = await pageFor([step('a', 'trigger'), step('b', 'ai', { after: 'a' })], { commit: false });
    await batch(p, [step('c', 'ai', { after: 'a' })]);
    await batch(p, [step('b', 'ai', { after: 'a', label: 'Changed b' })]);
    const visible = () => p.$eval(card('b'), e => {
      const r = e.getBoundingClientRect(), s = e.closest('.wf-stage').getBoundingClientRect();
      return r.top >= s.top + 110 && r.bottom <= s.bottom - 48;
    });
    ok(await visible(), 'changed earlier branch not followed');
    await batch(p, basic.filter(o => o.on));
    ok(!await p.$(card('t5')) && await visible(), 'hidden attachment owner not followed');
  });
  await check('C11 open panel follow and fit', async () => {
    const p = await pageFor(fixture.ops.slice(0, 1), { width: 1150, height: 800, commit: false });
    await p.click('#products .pp__handle'); await sleep(350);
    for (const op of fixture.ops.slice(1, 12)) {
      await batch(p, [op]);
      if (op.t === 'step' && !op.on) ok(await p.$eval(card(op.id), e => {
        const r = e.getBoundingClientRect(), panel = document.querySelector('#products').getBoundingClientRect();
        return r.bottom <= panel.top && r.top >= e.closest('.wf-stage').getBoundingClientRect().top + 110;
      }), op.id + ' covered by panel');
    }
    await p.click('.wf-tools button'); await sleep(100);
    ok(await p.$eval(card('in'), e => e.getBoundingClientRect().bottom <= document.querySelector('#products').getBoundingClientRect().top));
    await p.close();
  });
  await check('C17 no link-batch vertical bounce', async () => {
    const p = await pageFor(fixture.ops.filter(o => o.t !== 'link'), { width: 1150, height: 800, commit: false });
    await p.evaluate(() => {
      window.samples = []; window.sampling = true;
      const sample = () => { if (!window.sampling) return;
        window.samples.push(new DOMMatrix(getComputedStyle(document.querySelector('.react-flow__viewport')).transform).f);
        requestAnimationFrame(sample);
      }; sample();
    });
    const links = fixture.ops.filter(o => o.t === 'link');
    for (let i = 0; i < links.length; i += 3) await batch(p, links.slice(i, i + 3));
    const ys = await p.evaluate(() => { window.sampling = false; return window.samples; });
    ok(new Set(ys.map(y => Math.round(y * 100))).size === 1, JSON.stringify([...new Set(ys)])); await p.close();
  });
} finally { await browser.close(); server.stop(); }
console.log(`${checks - failures.length}/${checks} passed`);
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
