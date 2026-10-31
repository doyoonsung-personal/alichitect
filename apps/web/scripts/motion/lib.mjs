// Shared helpers for the motion scripts: a production build served by `vite preview` on a free port in 5185-5199 (never
// 5173 or 5174), a recorder that notes when cards, edges, ghosts and the handoff ghost first appear, and a 25-card stream
// built from the recorded e-commerce fixture.
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { WEB, freePort, sleep } from '../console/lib.mjs';

export const DIST = path.join(process.env.TEMP ?? WEB, 'ab-motion-dist');

export function build(dist = DIST) {
  const b = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--outDir', dist, '--emptyOutDir'], { cwd: WEB, encoding: 'utf8' });
  if (b.status !== 0) {
    process.stdout.write(b.stdout + b.stderr);
    throw new Error('build failed');
  }
}

/** `vite preview` of the build, with /api proxied to `apiTarget`. */
export async function startPreview(apiTarget, skip = new Set(), dist = DIST) {
  const port = await freePort(5185, 5199, skip);
  const env = { ...process.env, ...(apiTarget ? { API_TARGET: apiTarget } : {}) };
  const child = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--outDir', dist, '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { cwd: WEB, env, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', () => {});
  child.stderr.on('data', () => {});
  const url = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch(url)).ok) return { url, port, stop: () => child.kill() };
    } catch {
      /* not up yet */
    }
    await sleep(250);
  }
  child.kill();
  throw new Error('preview did not start');
}

/**
 * Runs in the page before it loads: notes the wall-clock time (Date.now(), the clock CDP screencast frames use) at which
 * each card, ghost, edge and the handoff ghost first enters the DOM, and their settled screen rectangles a second later.
 * Also counts cancelled CSS animations and transitions on the canvas (a cut entrance or move shows up there).
 */
export function recorder() {
  const marks = { handoff: null, cards: {}, ghosts: {}, edges: [], tags: null, badges: {}, cancels: { animation: 0, transition: 0, byClass: {} } };
  window.__motion = marks;
  const rectOf = (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  };
  const cardAt = (pt) => {
    let best = null;
    let bestD = Infinity;
    for (const n of document.querySelectorAll('.react-flow__node-card')) {
      const id = n.getAttribute('data-id');
      if (!id || id.startsWith('ghost:')) continue;
      const r = n.getBoundingClientRect();
      const dx = Math.max(r.left - pt.x, 0, pt.x - r.right);
      const dy = Math.max(r.top - pt.y, 0, pt.y - r.bottom);
      const d = Math.hypot(dx, dy);
      if (d < bestD) {
        bestD = d;
        best = id;
      }
    }
    return bestD < 40 ? best : null;
  };
  const edgeInfo = (g) => {
    const line = g.querySelector('.cv-edge__line');
    if (!line || typeof line.getTotalLength !== 'function') return null;
    const len = line.getTotalLength();
    const m = line.getScreenCTM();
    if (!m || !len) return null;
    const a = new DOMPoint(line.getPointAtLength(0).x, line.getPointAtLength(0).y).matrixTransform(m);
    const b = new DOMPoint(line.getPointAtLength(len).x, line.getPointAtLength(len).y).matrixTransform(m);
    return { from: cardAt(a), to: cardAt(b), a: { x: a.x, y: a.y }, b: { x: b.x, y: b.y }, rect: rectOf(g) };
  };
  const seen = (el) => {
    const t = Date.now();
    if (el.classList?.contains('handoff-ghost') && !marks.handoff) marks.handoff = t;
    if (el.classList?.contains('cv-tag') && !marks.tags) marks.tags = t;
    if (el.classList?.contains('cv-badge')) {
      const id = el.getAttribute('data-nav-id');
      if (id && !marks.badges[id]) {
        const host = el.closest('.react-flow__node-card');
        const m = (marks.badges[id] = { t, host: host?.getAttribute('data-id') ?? null, rect: null });
        setTimeout(() => {
          if (host) m.rect = rectOf(host);
        }, 1000);
      }
    }
    if (el.classList?.contains('react-flow__node-card')) {
      const id = el.getAttribute('data-id') ?? '';
      if (id.startsWith('ghost:')) {
        const real = id.slice(6);
        if (!marks.ghosts[real]) {
          marks.ghosts[real] = { t, rect: rectOf(el) };
        }
      } else if (!marks.cards[id]) {
        const m = (marks.cards[id] = { t, rect: null, enter: !!el.querySelector('.cv-unit[data-enter]') });
        setTimeout(() => {
          m.rect = rectOf(el);
        }, 1000);
      }
    }
    if (el.classList?.contains('cv-edge')) {
      const info = edgeInfo(el);
      if (info && info.from && info.to && !marks.edges.some((e) => e.from === info.from && e.to === info.to)) {
        const e = { t, ...info };
        marks.edges.push(e);
        setTimeout(() => {
          const again = edgeInfo(el);
          if (again) e.rect = again.rect;
        }, 1000);
      }
    }
  };
  const visit = (n) => {
    if (n.nodeType !== 1) return;
    seen(n);
    for (const el of n.querySelectorAll('.handoff-ghost, .react-flow__node-card, .cv-edge, .cv-tag, .cv-badge')) seen(el);
  };
  new MutationObserver((list) => {
    for (const m of list) for (const n of m.addedNodes) visit(n);
  }).observe(document, { childList: true, subtree: true });
  const cancel = (kind) => (e) => {
    const el = e.target;
    if (!(el instanceof Element) || !el.closest('.cv')) return;
    marks.cancels[kind]++;
    const k = `${kind}:${el.getAttribute('class')?.split(' ')[0] ?? el.tagName}:${e.animationName ?? e.propertyName ?? ''}`;
    marks.cancels.byClass[k] = (marks.cancels.byClass[k] ?? 0) + 1;
    (marks.cancels.log ??= []).push({ k, t: Date.now(), id: el.closest('[data-id]')?.getAttribute('data-id') ?? null, elapsed: Math.round(e.elapsedTime * 1000) });
  };
  document.addEventListener('animationcancel', cancel('animation'), true);
  document.addEventListener('transitioncancel', cancel('transition'), true);
}

/** Records CDP screencast frames with their wall-clock times (ms). */
export async function startScreencast(page, { quality = 88 } = {}) {
  const client = await page.createCDPSession();
  const frames = [];
  client.on('Page.screencastFrame', (f) => {
    frames.push({ t: f.metadata.timestamp * 1000, data: f.data });
    void client.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await client.send('Page.startScreencast', { format: 'jpeg', quality, maxWidth: 1440, maxHeight: 900, everyNthFrame: 1 });
  return {
    frames,
    async stop() {
      await client.send('Page.stopScreencast').catch(() => {});
      await client.detach().catch(() => {});
    },
  };
}

/** The frame on screen at `t`: the last one swapped at or before it (the screen does not change between frames). */
export function frameAt(frames, t) {
  let pick = null;
  for (const f of frames) {
    if (f.t <= t + 4) pick = f;
    else break;
  }
  return pick ?? frames[0] ?? null;
}

/**
 * A 25-card stream: the recorded e-commerce first turn plus eight more nodes and four edges before `done`, and the same
 * in the committed graph, so 25 cards (and 2 badges) are on the sheet at commit. Real per-line timings; divide by
 * `speed` to replay.
 */
export function bigFixture() {
  const fx = JSON.parse(readFileSync(path.join(WEB, 'src/replay/fixtures/ecommerce.json'), 'utf8'));
  const turn = structuredClone(fx.turns[0]);
  const extra = [
    { t: 'node', id: 'kms', product: 'kms', label: 'KMS', group: 'region', why: 'Keys for encrypting order and payment data' },
    { t: 'node', id: 'actiontrail', product: 'actiontrail', label: 'ActionTrail', group: 'region', why: 'Audit trail of every API call for compliance' },
    { t: 'node', id: 'cloudmonitor', product: 'cloudmonitor', label: 'CloudMonitor', group: 'region', why: 'Alerts on flash-sale load and errors' },
    { t: 'node', id: 'cfw', product: 'cloud-firewall', label: 'Cloud Firewall', group: 'region', why: 'Controls traffic between the internet and the VPC' },
    { t: 'node', id: 'dts', product: 'dts', label: 'DTS', group: 'region', why: 'Streams order changes to search and analytics' },
    { t: 'node', id: 'bastion', product: 'bastionhost', label: 'Bastionhost', group: 'region', why: 'Audited operator access to the servers' },
    { t: 'node', id: 'maxcompute', product: 'maxcompute', label: 'MaxCompute', group: 'region', why: 'Sales analytics over order history' },
    { t: 'node', id: 'mongodb', product: 'mongodb', label: 'MongoDB', group: 'region', why: 'Product catalog documents with flexible attributes' },
    { t: 'edge', id: 'e-polardb-kms', from: 'polardb', to: 'kms', label: 'keys' },
    { t: 'edge', id: 'e-alb-cfw', from: 'cfw', to: 'alb', label: 'filtered' },
    { t: 'edge', id: 'e-polardb-dts', from: 'polardb', to: 'dts', label: 'changes' },
    { t: 'edge', id: 'e-dts-mc', from: 'dts', to: 'maxcompute', label: 'orders' },
  ];
  const doneAt = turn.ev.findIndex(([, ev]) => ev.type === 'op' && ev.op.t === 'done');
  const at0 = turn.ev[doneAt - 1][0];
  let seq = Math.max(...turn.ev.filter(([, ev]) => ev.type === 'op').map(([, ev]) => ev.seq));
  const ins = extra.map((op, i) => [at0 + 300 + i * 260, { type: 'op', seq: ++seq, op, added: [op.id], updated: [], removed: [], phase: 'main' }]);
  const shift = 300 + extra.length * 260;
  const tail = turn.ev.slice(doneAt).map(([at, ev]) => [at + shift, ev]);
  turn.ev = [...turn.ev.slice(0, doneAt), ...ins, ...tail];
  const commit = turn.ev.find(([, ev]) => ev.type === 'commit')[1];
  const g = commit.memory.graph;
  for (const op of extra) {
    if (op.t === 'node') g.nodes[op.id] = { id: op.id, product: op.product, label: op.label, group: op.group, why: op.why };
    else g.edges[op.id] = { id: op.id, from: op.from, to: op.to, label: op.label };
  }
  return { ...fx, id: 'perf-25', turns: [turn] };
}
