// Offline workflow checks through the real UI, served by Vite on a free loopback port (WORKFLOW_PORT overrides the default).
//   node scripts/e2e-workflow.mjs [--smoke] [--case=1150:10:false]
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import examples from '../src/landing/examples.json' with { type: 'json' };

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const selected = args.find((arg) => arg.startsWith('--case='))?.slice(7);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function moveToPane(page) {
  const point = await page.$eval('.wf-stage', (el) => {
    const r = el.getBoundingClientRect();
    for (let y = r.bottom - 80; y > r.top + 110; y -= 20) {
      for (let x = r.right - 20; x > r.left; x -= 20) {
        if (document.elementFromPoint(x, y)?.classList.contains('react-flow__pane')) return { x, y };
      }
    }
    throw new Error('No uncovered workflow pane to pan');
  });
  await page.mouse.move(point.x, point.y);
}
const free = (port) =>
  new Promise((res) => {
    const s = net.createServer();
    s.once('error', () => res(false));
    s.once('listening', () => s.close(() => res(true)));
    s.listen(port, '127.0.0.1');
  });
async function startServer() {
  const firstPort = Number(process.env.WORKFLOW_PORT ?? 5190);
  for (let port = firstPort; port <= firstPort + 2; port++) {
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
let cases = 0;
const errors = [];
try {
  const fixture = JSON.parse(readFileSync(path.join(WEB, '../../packages/core/test/fixtures/workflows/support-email-triage.json'), 'utf8'));
  for (const [width, required] of [[1150, 5], [920, 3], [800, 2]]) {
    if (selected) continue;
    const page = await browser.newPage();
    await page.setViewport({ width, height: 800 });
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.evaluateOnNewDocument(() => localStorage.setItem('ab.lang', 'en'));
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (req.url().includes('/api/')) return req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({
        ok: true, keyConfigured: true, model: 'test', endpoint: 'test', catalog: { version: 'test', entries: 1 },
        limits: { askChars: 20000 }, inFlight: 0, maxInFlight: 4,
      }) });
      if (!req.url().startsWith(server.url) && !req.url().startsWith('data:')) return req.abort();
      return req.continue();
    });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(server.url);
    await page.waitForFunction(() => !!window.__ab);
    await page.evaluate(() => {
      window.__ab.store.dispatch({ type: 'session/mode', mode: 'workflow' });
      window.__ab.store.dispatch({ type: 'turn/start', mode: 'workflow', ask: 'Support email', now: 1 });
    });
    for (const op of fixture.ops) {
      await page.evaluate((op) => {
        const { store } = window.__ab;
        store.dispatch({ type: 'turn/event', event: { type: 'op', phase: 'main', op }, now: 2 });
        store.dispatch({ type: 'turn/flush', now: 3 });
      }, op);
      await page.waitForSelector('[data-wf-card]');
      await sleep(60);
    }
    const inlineIds = fixture.ops.filter((op) => op.t === 'step' && !op.on).map((op) => op.id);
    const inspect = () => page.evaluate((inlineIds) => {
      const stage = document.querySelector('.wf-stage').getBoundingClientRect();
      const zoom = Number(/scale\(([^)]+)\)/.exec(document.querySelector('.react-flow__viewport').style.transform)?.[1]);
      const cards = [...document.querySelectorAll('[data-wf-card]')].map((el) => {
        const r = el.getBoundingClientRect(), title = el.querySelector('strong');
        return { id: el.dataset.wfCard, x: r.x, y: r.y, w: r.width, h: r.height,
          titlePx: parseFloat(getComputedStyle(title).fontSize) * zoom,
          visible: r.left >= stage.left && r.right <= stage.right && r.top >= stage.top + 110 && r.bottom <= stage.bottom - 48,
          clipped: el.scrollHeight > el.clientHeight + 1 || title.scrollWidth > title.clientWidth + 1 };
      });
      const inline = cards.filter((c) => inlineIds.includes(c.id));
      const visible = inline.filter((c) => c.visible);
      const top = Math.min(...inline.map((c) => c.y));
      const branches = inline.filter((c) => c.y > top + 1 && c.x >= stage.left && c.x + c.w <= stage.right);
      return { zoom, width: stage.width, following: document.querySelector('.wf-tools [aria-pressed]')?.getAttribute('aria-pressed') === 'true',
        columns: new Set(visible.map((c) => Math.round(c.x))).size,
        branches: branches.map((c) => c.id), clippedBranches: branches.filter((c) => !c.visible),
        readable: cards.every((c) => c.titlePx >= 10.99), clipped: cards.filter((c) => c.clipped),
        newest: cards.filter((c) => c.x === Math.max(...cards.map((c) => c.x))).some((c) => c.visible) };
    }, inlineIds);
    await sleep(300);
    const follow = await inspect();
    if (!follow.following || !follow.newest || !follow.readable || follow.zoom > 1) {
      throw new Error('Fixture follow: ' + JSON.stringify({ width, follow }));
    }
    await page.evaluate(() => {
      const { store } = window.__ab, s = store.getState();
      store.dispatch({ type: 'turn/event', event: { type: 'commit',
        memory: { ...s.session.memory, workflow: s.work.rawWorkflow }, changes: '', warnings: [] }, now: 4 });
    });
    await page.evaluate(() => {
      const { store } = window.__ab;
      const { workflowLayout, ...record } = store.getState().session;
      store.dispatch({ type: 'session/open', record, now: 5 });
    });
    await sleep(300);
    const check = await inspect();
    if (check.columns < required || !check.readable || check.zoom < 11 / 14 - 0.000001 || check.zoom > 1
      || check.clipped.length || check.clippedBranches.length) {
      throw new Error('Fixture fit: ' + JSON.stringify({ width, required, check }));
    }
    cases++;
    console.log('PASS support-email fixture', width, JSON.stringify(check));
    const seenBranches = new Set();
    for (let i = 0; i < 8; i++) {
      const panned = await inspect();
      if (panned.clippedBranches.length) throw new Error('Branch visibility: ' + JSON.stringify({ width, panned }));
      for (const id of panned.branches) seenBranches.add(id);
      await moveToPane(page);
      const beforePan = await page.$eval('.react-flow__viewport', (el) => el.style.transform);
      await page.mouse.wheel({ deltaX: 400, deltaY: 0 });
      await page.waitForFunction((before) => document.querySelector('.react-flow__viewport').style.transform !== before,
        { timeout: 3000 }, beforePan);
    }
    const branchIds = await page.evaluate(() => {
      const { graph, layout } = window.__ab.store.getState().workflowDisplay;
      return Object.keys(graph.nodes).filter((id) => !graph.nodes[id].on && layout.workflow.cells[id].row > 0);
    });
    if (!branchIds.length || branchIds.some((id) => !seenBranches.has(id))) {
      throw new Error('Branch columns were not exercised: ' + JSON.stringify({ width, branchIds, seen: [...seenBranches] }));
    }
    console.log('PASS branch visibility', width, [...seenBranches]);
    await page.click('.wf-tools [aria-pressed="false"]');
    await sleep(300);
    if (width === 1150) {
      await page.setViewport({ width: 800, height: 800 });
      await sleep(300);
      const resized = await inspect();
      if (resized.columns < 2 || !resized.readable || resized.zoom > 1) throw new Error('Fixture resize: ' + JSON.stringify(resized));
      await page.click('.wf-tools button');
      await sleep(100);
      const fitted = await inspect();
      if (fitted.columns < 2 || !fitted.readable || fitted.zoom > 1) throw new Error('Fixture fit button: ' + JSON.stringify(fitted));
    }
    await page.close();
  }
  for (const width of [800, 920, 1150]) for (const count of (args.includes('--smoke') ? [10] : [10, 15, 25]))
    for (const focus of (args.includes('--smoke') ? [false] : [false, true, 'stage'])) {
    if (selected && selected !== `${width}:${count}:${focus}`) continue;
    const page = await browser.newPage();
    await page.setViewport({ width: focus === 'stage' ? width + 360 : width, height: width === 1150 ? 800 : 700 });
    const lang = args.includes('--smoke') ? (width === 800 ? 'en' : width === 920 ? 'ko' : 'zh')
      : count === 10 ? 'en' : count === 15 ? 'ko' : 'zh';
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: count === 25 ? 'reduce' : 'no-preference' }]);
    await page.evaluateOnNewDocument((lang) => { localStorage.setItem('ab.lang', lang); }, lang);
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (req.url().includes('/api/')) return req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({
        ok: true, keyConfigured: true, model: 'test', endpoint: 'test', catalog: { version: 'test', entries: 1 },
        limits: { askChars: 20000 }, inFlight: 0, maxInFlight: 4,
      }) });
      if (!req.url().startsWith(server.url) && !req.url().startsWith('data:')) return req.abort();
      return req.continue();
    });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(server.url);
    await page.waitForFunction(() => !!window.__ab);
    const briefs = () => page.$$eval('.example__brief', (rows) => rows.map((row) => row.textContent));
    const cloudBriefs = examples.examples.map((example) => example[lang]);
    const workflowBriefs = examples.workflowExamples.map((example) => example[lang]);
    assert.deepEqual(await briefs(), cloudBriefs);
    await page.click('input[name="focus"][value="workflow"]');
    assert.deepEqual(await briefs(), workflowBriefs);
    await page.focus('.example');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.waitForFunction((brief) => document.activeElement === document.querySelector('.brief__input')
      && document.activeElement.value === brief, {}, workflowBriefs[1]);
    await page.click('input[name="focus"][value="cloud"]');
    assert.deepEqual(await briefs(), cloudBriefs);
    assert.equal(await page.$eval('.brief__input', (box) => box.value), '');
    await page.evaluate(({ count, focus, lang }) => {
      const { store, controller } = window.__ab;
      const s = store.getState(), nodes = {}, edges = {};
      const title = { en: 'A detailed workflow title with many words ', ko: '세부 정보가 포함된 아주 긴 워크플로 제목 ',
        zh: '包含许多细节的非常长的工作流标题' }[lang].repeat(20);
      for (let i = 0; i < count; i++) {
        nodes['n' + i] = { id: 'n' + i, kind: i === 0 ? 'trigger' : i === count - 1 ? 'end' : i === 3 ? 'human' : 'agent',
          label: 'Step ' + i + ' ' + title,
          ...(i === 1 ? { product: 'model-studio', approval: 'required', effect: 'send' } : {}),
          ...(i > 0 && i < count - 1 && i !== 3 ? { ai: 'qwen3.8-flash', turns: 5 } : {}) };
        if (i >= 4 && i <= 7) nodes['n' + i].effect = ['publish', 'pay', 'delete', 'admin'][i - 4];
        if (i) edges['e' + i] = { id: 'e' + i, from: 'n' + (i - 1), to: 'n' + i };
      }
      edges.loop = { id: 'loop', from: 'n4', to: 'n2', kind: 'loop', max: 2 };
      edges.branch = { id: 'branch', from: 'n2', to: 'n4', kind: 'branch', label: 'Ready', outcome: 'approve' };
      for (let i = 0; i < 4; i++) nodes['a' + i] = { id: 'a' + i, kind: 'tool', label: 'Attachment ' + i, on: 'n1' };
      store.dispatch({ type: 'session/open', record: { ...s.session, mode: 'workflow',
        memory: { ...s.session.memory, workflow: { nodes, edges, groups: {} } } }, now: 1 });
      controller.setFocusDiagram(focus === true);
    }, { count, focus, lang });
    await page.waitForSelector('[data-wf-card]');
    if (width === 800 && count === 10 && !focus) await page.screenshot({ path: path.join(WEB, '.workflow-preview.png') });
    await sleep(500);
    await page.evaluate((dark) => document.documentElement.dataset.theme = dark ? 'dark' : 'light', count === 15);
    if (width === 800 && focus === false) await page.screenshot({ path: path.join(WEB, '.workflow-' + lang + '.png') });
    const check = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('[data-wf-card]')];
      const zoom = Number(/scale\(([^)]+)\)/.exec(document.querySelector('.react-flow__viewport').style.transform)?.[1]);
      return { cards: cards.length, stops: cards.filter((c) => c.tabIndex === 0).length,
        ids: ['diagram', 'products', 'workflow-keys'].every((id) => document.querySelectorAll('#' + id).length === 1),
        cap: cards.every((c) => parseFloat(c.style.height) === 92 && c.scrollHeight <= c.clientHeight + 1),
        titles: cards.every((c) => c.querySelectorAll('strong span').length <= 2
          && (c.dataset.wfCard.startsWith('a')
            || c.querySelector('strong').textContent.endsWith('…') && c.getAttribute('aria-label').length > 200)),
        signals: ['approval', 'wait', 'send', 'publish', 'pay', 'delete', 'admin']
          .every((signal) => !!document.querySelector(`[data-signal="${signal}"]`)),
        floor: cards.every((c) => parseFloat(getComputedStyle(c.querySelector('strong')).fontSize) * zoom >= 10.99) };
    });
    if (check.cards !== count + 3 || check.stops !== 1 || !check.ids || !check.floor || !check.cap || !check.titles || !check.signals) {
      throw new Error(JSON.stringify({ width, count, focus, check }));
    }
    if (width === 800 && count === 10 && focus === false) {
      await page.mouse.move(750, 400); await page.mouse.wheel({ deltaY: 40 }); await sleep(100);
      const before = await page.$eval('.react-flow__viewport', (e) => e.style.transform);
      await page.evaluate(() => {
        const { store } = window.__ab, memory = store.getState().session.memory;
        store.dispatch({ type: 'turn/start', mode: 'workflow', ask: 'Revise', now: 2 });
        store.dispatch({ type: 'turn/event', event: { type: 'commit', memory, changes: '', warnings: [] }, now: 3 });
      });
      await sleep(100);
      const after = await page.$eval('.react-flow__viewport', (e) => e.style.transform);
      if (before !== after) throw new Error('Commit moved a paused camera');
    }
    await page.focus('[data-wf-card][tabindex="0"]');
    await page.keyboard.press('Enter');
    await page.waitForSelector('#cv-pop');
    const fullLabel = await page.$eval('[data-wf-card][tabindex="0"]', (c) => c.getAttribute('aria-label'));
    const popLabel = await page.$eval('#cv-pop h3', (h) => h.textContent);
    if (popLabel.length < 200 || !fullLabel.startsWith(popLabel)) throw new Error('Popover lost the full title');
    await page.keyboard.press('Escape');
    await page.click('.wf-tools button');
    await sleep(300);
    const geometry = () => page.evaluate(() => ({
      viewport: document.querySelector('.react-flow__viewport').style.transform,
      rects: [...document.querySelectorAll('[data-wf-card], .wf-bracket')].map((el) => {
        const r = el.getBoundingClientRect(); return [r.x, r.y, r.width, r.height];
      }),
      edges: [...document.querySelectorAll('.wf-edges path, .wf-edges text')].map((el) => el.outerHTML),
    }));
    const beforeFold = JSON.stringify(await geometry());
    const mouseFold = async () => {
      const point = await page.$eval('[data-wf-fold="n1"]', (button) => {
        const r = button.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      });
      await page.mouse.move(point.x, point.y);
      await page.mouse.down();
      await page.mouse.up();
      await page.waitForSelector('[data-wf-fold="n1"][aria-expanded="true"]', { timeout: 2000 }).catch(async () => {
        const state = await page.evaluate(({ x, y }) => ({
          hit: document.elementFromPoint(x, y)?.outerHTML.slice(0, 400),
          popover: document.querySelector('.wf-pop')?.getBoundingClientRect().toJSON(),
          fold: document.querySelector('[data-wf-fold="n1"]').getBoundingClientRect().toJSON(),
        }), point);
        throw new Error('Real mouse did not unfold: ' + JSON.stringify({ width, count, focus, state }));
      });
      await sleep(350);
      if (await page.$('.wf-pop')) throw new Error('Fold mouse click opened a popover');
      if (JSON.stringify(await geometry()) !== beforeFold) throw new Error('Fold mouse click moved the diagram');
    };
    // Enter the card briefly so the quick click must cancel its pending hover timer.
    await page.hover('[data-wf-card="n1"]');
    await mouseFold();
    await sleep(100);
    if (JSON.stringify(await geometry()) !== beforeFold) throw new Error('Unfold moved the diagram');
    const unfolded = await page.$eval('[data-wf-fold="n1"]', (button) => ({
      expanded: button.getAttribute('aria-expanded'),
      controlled: document.getElementById(button.getAttribute('aria-controls'))?.dataset.wfDetails,
    }));
    if (unfolded.expanded !== 'true' || unfolded.controlled !== 'n1' || await page.$('#cv-pop')) {
      throw new Error('Fold control/popover interplay failed');
    }
    await page.keyboard.press('Escape');
    await sleep(100);
    if (JSON.stringify(await geometry()) !== beforeFold) throw new Error('Folding moved the diagram');
    if (!await page.$eval('[data-wf-fold="n1"]', (b) => b === document.activeElement && b.getAttribute('aria-expanded') === 'false')) {
      throw new Error('Escape did not restore fold-button focus');
    }
    await page.hover('[data-wf-card="n1"]');
    await sleep(350);
    await page.waitForSelector('.wf-pop');
    const foldExposed = await page.$eval('[data-wf-fold="n1"]', (button) => {
      const r = button.getBoundingClientRect();
      return button.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
    });
    if (!foldExposed) throw new Error('Hover popover covered the fold arrow');
    await mouseFold();
    await page.keyboard.press('Escape');
    if (!await page.$eval('[data-wf-fold="n1"]', (b) => b === document.activeElement && b.getAttribute('aria-expanded') === 'false')) {
      throw new Error('Escape after hover-click did not restore fold-button focus');
    }
    for (const key of ['Enter', 'Space']) {
      await page.focus('[data-wf-fold="n1"]');
      await page.keyboard.press(key);
      await page.waitForSelector('[data-wf-fold="n1"][aria-expanded="true"]');
      if (await page.$('.wf-pop')) throw new Error('Fold keyboard activation opened a popover');
      await page.keyboard.press('Escape');
      if (!await page.$eval('[data-wf-fold="n1"]', (b) => b === document.activeElement && b.getAttribute('aria-expanded') === 'false')) {
        throw new Error('Keyboard fold did not restore focus');
      }
    }
    await page.click('[data-wf-fold="n1"]');
    await page.evaluate(() => {
      const { store } = window.__ab;
      store.dispatch({ type: 'turn/start', mode: 'workflow', ask: 'Keep unfolding', now: 5 });
      const node = store.getState().work.rawWorkflow.nodes.n1;
      store.dispatch({ type: 'turn/event', event: { type: 'op', phase: 'main', op: { t: 'step', ...node, why: 'Updated detail' } }, now: 6 });
      store.dispatch({ type: 'turn/flush', now: 7 });
    });
    await sleep(100);
    if (!await page.$eval('[data-wf-fold="n1"]', (b) => b.getAttribute('aria-expanded') === 'true')) {
      throw new Error('Display batch closed the fold');
    }
    await page.click('[data-wf-details="n1"] .wf-card__attachments');
    await page.waitForSelector('#cv-pop');
    const popText = await page.$eval('#cv-pop', (p) => p.textContent);
    if (!popText.includes('Attachment 3')) throw new Error('Hidden attachment list was lost');
    await page.keyboard.press('Escape');
    await page.click('[data-wf-fold="n1"]');
    await page.click('[data-wf-fold="n0"]');
    if (await page.$$eval('[data-wf-details]:not([hidden])', (els) => els.length) !== 1) throw new Error('More than one fold is open');
    await page.click('[data-wf-fold="n0"]');
    if (await page.$$eval('[data-wf-details]:not([hidden])', (els) => els.length)) throw new Error('Second click did not fold');
    await page.click('[data-wf-fold="n0"]');
    await page.click('.wf-tools button');
    if (await page.$$eval('[data-wf-details]:not([hidden])', (els) => els.length)) throw new Error('Outside click did not fold');
    await page.click('[data-wf-fold="n0"]');
    await page.waitForSelector('[data-wf-fold="n0"][aria-expanded="true"]');
    const beforePan = await page.$eval('.react-flow__viewport', (el) => el.style.transform);
    await moveToPane(page);
    await page.mouse.wheel({ deltaX: 1600, deltaY: 0 });
    try {
      await page.waitForFunction((before) => document.querySelector('.react-flow__viewport').style.transform !== before,
        { timeout: 3000 }, beforePan);
      await page.waitForFunction(() => {
        const card = document.querySelector('[data-wf-card="n0"]').getBoundingClientRect();
        const stage = document.querySelector('.wf-stage').getBoundingClientRect();
        return card.right <= stage.left && !document.querySelector('[data-wf-details]:not([hidden])');
      }, { timeout: 3000 });
    } catch {
      const state = await page.evaluate(() => ({
        viewport: document.querySelector('.react-flow__viewport').style.transform,
        card: document.querySelector('[data-wf-card="n0"]').getBoundingClientRect().toJSON(),
        stage: document.querySelector('.wf-stage').getBoundingClientRect().toJSON(),
      }));
      throw new Error('Offscreen card stayed unfolded: ' + JSON.stringify(state));
    }
    const panned = await page.$eval('.react-flow__viewport', (el) => el.style.transform);
    const staysPaused = () => page.evaluate((expected) => new Promise((resolve) => {
      const viewport = document.querySelector('.react-flow__viewport');
      const paused = () => viewport.style.transform === expected
        && document.querySelector('.wf-tools [aria-pressed]').getAttribute('aria-pressed') === 'false';
      let stable = paused();
      const observer = new MutationObserver(() => { stable = stable && paused(); });
      observer.observe(viewport, { attributes: true, attributeFilter: ['style'] });
      // React Flow defers move-end by 150 ms. Catch stale Fit/scroll callbacks even if they snap back only briefly.
      setTimeout(() => { observer.disconnect(); resolve(stable && paused()); }, 400);
    }), panned);
    if (!await staysPaused()) throw new Error('A delayed camera callback undid the user pan');
    await page.evaluate(() => {
      const { store } = window.__ab, s = store.getState();
      store.dispatch({ type: 'turn/event', event: { type: 'commit',
        memory: { ...s.session.memory, workflow: s.work.rawWorkflow }, changes: '', warnings: [] }, now: 8 });
    });
    if (!await staysPaused()) throw new Error('Commit re-fitted the paused camera');
    await page.click('#products .pp__handle');
    await page.waitForSelector('#products[data-open]');
    if (!await staysPaused()) throw new Error('Panel resize re-fitted the paused camera');
    await page.keyboard.press('Escape');
    await page.click('.wf-tools button');
    await page.waitForFunction((before) => document.querySelector('.react-flow__viewport').style.transform !== before,
      { timeout: 3000 }, panned);
    await page.click('.wf-tools [aria-pressed="false"]');
    await page.waitForSelector('.wf-tools [aria-pressed="true"]');
    cases++;
    console.log('PASS', width, count, focus === 'stage' ? 'canvas width' : focus ? 'focus' : 'console');
    await page.close();
  }
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('Workflow browser cases:', cases);
} finally { await browser.close(); server.stop(); }
