// Snapshot rendering: picks the states to draw, routes each one cold (libavoid-js if it loaded, else the channel
// router), writes an SVG per state and canvas size, converts them to PNG in headless Chrome, writes a contact sheet,
// and checks the truncation estimate against real Chrome text layout on a sample of card and frame strings.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Catalog } from '../../../../packages/core/src/types.ts';
import type { LayoutCard, LayoutFrame } from '../../../../packages/core/src/layout.ts';
import type { LayoutModule } from '../layouts.ts';
import { textWidthOf } from '../layouts.ts';
import type { RunResult } from '../runner.ts';
import type { Trace } from '../trace.ts';
import { cardIds } from '../display.ts';
import { canvasKey } from '../metrics/size.ts';
import { cardText, frameLabelRoom, frameText, textWidth } from '../text.ts';
import type { AdvanceTable, StyleKey } from '../text.ts';
import { planEdges } from '../routing/plan.ts';
import { routeChannels } from '../routing/channel.ts';
import { createAvoidState, disposeAvoidState, routeWithAvoid } from '../routing/avoid.ts';
import { FONT_STACK, interFontFace, launchBrowser } from '../browser.ts';
import { renderSvg } from './svg.ts';
import { pct, round } from '../stats.ts';

export interface RenderTarget {
  name: string;
  title: string;
  /** [file suffix, snapshot key] pairs; an edit target has a before and an after state. */
  states: Array<{ suffix: string; key: string }>;
  keys: string[];
}

/** The states the task asks for, resolved against the trace (targets whose session is not in the trace are skipped). */
export function renderTargets(trace: Trace): RenderTarget[] {
  const ids = new Set(trace.sessions.map((s) => s.spec.id));
  const one = (name: string, title: string, session: string, turn: number | 'base' = 0): RenderTarget | null => (ids.has(session) ? { name, title, states: [{ suffix: '', key: `${session}@${turn}` }], keys: [`${session}@${turn}`] } : null);
  const edit = (name: string, title: string, session: string): RenderTarget | null =>
    ids.has(session) ? { name, title, states: [{ suffix: '-before', key: `${session}@base` }, { suffix: '-after', key: `${session}@0` }], keys: [`${session}@base`, `${session}@0`] } : null;
  // the largest real turn-end state by drawn cards (eval sources only), overall and within mt-06 of the final run
  const largestOf = (keep: (id: string) => boolean): { key: string; cards: number } | null => {
    let best: { key: string; cards: number } | null = null;
    for (const st of trace.sessions) {
      if (st.spec.source === 'probes' || !keep(st.spec.id)) continue;
      for (const f of st.frames) {
        if (f.kind !== 'commit' || !f.count) continue;
        const cards = cardIds(f.display).size + f.display.recs.length;
        if (!best || cards > best.cards) best = { key: `${st.spec.id}@${f.turn}`, cards };
      }
    }
    return best;
  };
  const largest = largestOf(() => true);
  const mt06 = largestOf((id) => id.startsWith('final:mt-06-'));
  const out = [
    one('ecommerce-f', 'F: e-commerce for Southeast Asia (probe stream F)', 'probes:F'),
    one('kubernetes', 'Kubernetes microservices (final:pat-02-k8s#1)', 'final:pat-02-k8s#1'),
    one('data-warehouse', 'Data platform and warehouse (final:pat-05-data-platform#1)', 'final:pat-05-data-platform#1'),
    one('rag', 'RAG assistant (final:pat-04-rag#1)', 'final:pat-04-rag#1'),
    one('solution-map', 'Product-need solution map (synthetic F1)', 'probes:F1'),
    largest ? { name: 'largest', title: `Largest real state: ${largest.key} (${largest.cards} cards)`, states: [{ suffix: '', key: largest.key }], keys: [largest.key] } : null,
    mt06 && mt06.key !== largest?.key ? { name: 'largest-mt06', title: `Largest mt-06 state in the final run: ${mt06.key} (${mt06.cards} cards)`, states: [{ suffix: '', key: mt06.key }], keys: [mt06.key] } : null,
    edit('edit-insert-waf', 'Edit: "Add a WAF" (final:edit-01-insert-waf#1)', 'final:edit-01-insert-waf#1'),
    edit('edit-swap-ack', 'Edit: ECS to Kubernetes (final:edit-03-swap-k8s#1)', 'final:edit-03-swap-k8s#1'),
    edit('edit-remove', 'Edit: drop the AI assistant (final:edit-05-remove-component#1)', 'final:edit-05-remove-component#1'),
  ];
  return out.filter((x): x is RenderTarget => x !== null);
}

export interface RenderArgs {
  layout: LayoutModule;
  catalog: Catalog;
  table: AdvanceTable;
  runs: RunResult[];
  targets: RenderTarget[];
  outDir: string;
  png: boolean;
  dpr: number;
  avoid: unknown | null;
  trace: Trace;
}

interface Shot {
  target: string;
  title: string;
  state: string;
  canvas: string;
  zoom: number;
  bbox: { w: number; h: number };
  cards: number;
  titlePx: number;
  router: string;
  svg: string;
  png?: string;
}

export async function renderAll(a: RenderArgs): Promise<unknown> {
  const dir = path.join(a.outDir, 'render');
  mkdirSync(dir, { recursive: true });
  const face = interFontFace();
  const shots: Shot[] = [];
  const missing: string[] = [];
  for (const t of a.targets) {
    for (const s of t.states) {
      for (const run of a.runs) {
        const snap = run.snapshots.get(s.key);
        const ck = canvasKey(run.canvas);
        if (!snap) {
          missing.push(`${s.key} at ${ck}`);
          continue;
        }
        const req = planEdges(snap.display, snap.layout, a.catalog);
        let routes = routeChannels(req).routes;
        let router = 'channel';
        if (a.avoid) {
          const st = createAvoidState(a.avoid);
          try {
            routes = routeWithAvoid(st, req).routes;
            router = 'libavoid';
          } finally {
            disposeAvoidState(st);
          }
        }
        const r = renderSvg({ layout: snap.layout, display: snap.display, catalog: a.catalog, edges: req.edges, routes, metrics: a.layout.METRICS, canvas: run.canvas, table: a.table, cardText: a.layout.cardText ?? cardText, fontFace: face });
        const file = `${t.name}${s.suffix}-${ck}.svg`;
        writeFileSync(path.join(dir, file), r.svg);
        shots.push({ target: t.name, title: t.title, state: s.suffix.replace('-', '') || 'final', canvas: ck, zoom: round(r.zoom, 3), bbox: r.bbox, cards: Object.keys(snap.layout.cards).length, titlePx: round(a.layout.METRICS.titlePx * r.zoom, 1), router, svg: file });
      }
    }
  }
  let chrome = '';
  let verify: unknown = null;
  {
    const browser = await launchBrowser();
    try {
      chrome = await browser.version();
      if (a.png) {
        const page = await browser.newPage();
        for (const s of shots) {
          const [w, h] = s.canvas.split('x').map(Number);
          await page.setViewport({ width: w, height: h, deviceScaleFactor: a.dpr });
          const svg = readFileSync(path.join(dir, s.svg), 'utf8');
          await page.setContent(`<!doctype html><html><head><style>html,body{margin:0;background:#f3f5f8}</style></head><body>${svg}</body></html>`, { waitUntil: 'load' });
          await page.evaluate('document.fonts.ready.then(() => true)');
          s.png = s.svg.replace(/\.svg$/, '.png');
          await page.screenshot({ path: path.join(dir, s.png), type: 'png' });
        }
        await page.close();
      }
      verify = await verifyText(browser, a);
    } finally {
      await browser.close();
    }
  }
  writeFileSync(path.join(dir, 'index.html'), contactSheet(a.layout.name, shots));
  writeFileSync(path.join(a.outDir, 'text-verify.json'), JSON.stringify(verify, null, 1) + '\n');
  return { dir: path.relative(process.cwd(), dir).split(path.sep).join('/'), chrome, dpr: a.dpr, shots: shots.map(({ svg: _s, ...rest }) => rest), missing, textVerify: verify && typeof verify === 'object' ? (verify as { summary: unknown }).summary : null };
}

function contactSheet(name: string, shots: Shot[]): string {
  const rows = new Map<string, Shot[]>();
  for (const s of shots) {
    const k = `${s.target}|${s.state}`;
    rows.set(k, [...(rows.get(k) ?? []), s]);
  }
  const esc = (x: string): string => x.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const body = [...rows.values()]
    .map((list) => {
      const first = list[0];
      const cells = list.map((s) => `<figure><img src="${s.png ?? s.svg}" width="${Math.round(Number(s.canvas.split('x')[0]) / 2)}" alt=""><figcaption>${s.canvas} · zoom ${s.zoom} · title ${s.titlePx} px · ${s.cards} cards · ${s.router}</figcaption></figure>`).join('');
      return `<section><h2>${esc(first.title)} <small>${esc(first.state)}</small></h2><div class="row">${cells}</div></section>`;
    })
    .join('\n');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Layout bench: ${esc(name)}</title><style>body{font:14px/1.4 system-ui,sans-serif;margin:16px;background:#fafbfc;color:#14181f}h2{font-size:15px;margin:24px 0 8px}small{color:#667080;font-weight:400}.row{display:flex;gap:12px;flex-wrap:wrap;align-items:flex-start}figure{margin:0}img{border:1px solid #d8dde4;display:block;max-width:100%;height:auto}figcaption{font-size:12px;color:#485160;margin-top:4px}</style></head><body><h1>Layout bench snapshots: ${esc(name)}</h1><p>Each image is the full canvas at its real pixel size (shown here at half width; open an image for 1:1). Fit zoom with 24 px padding, max 1.25.</p>${body}</body></html>\n`;
}

// ---------- browser check of the truncation estimate ----------

interface Sample {
  style: StyleKey;
  text: string;
  px: number;
  room: number;
}

function samples(a: RenderArgs): Sample[] {
  const M = a.layout.METRICS;
  const room = textWidthOf(M);
  const rule = a.layout.cardText ?? cardText;
  const seen = new Set<string>();
  const all: Sample[] = [];
  const add = (s: Sample): void => {
    const k = `${s.style}|${s.text}`;
    if (!s.text || seen.has(k)) return;
    seen.add(k);
    all.push(s);
  };
  for (const st of a.trace.sessions) {
    for (const f of st.frames) {
      if (f.kind !== 'commit') continue;
      for (const nd of Object.values(f.display.nodes)) {
        const card = { id: nd.id, kind: 'node', product: nd.product } as LayoutCard;
        const t = rule(card, f.display, a.catalog);
        add({ style: 'title', text: t.title, px: M.titlePx, room });
        add({ style: 'subtitle', text: t.subtitle, px: M.subtitlePx, room });
      }
      // frame labels: group labels as the canvas draws them (small-caps kind word, caption in normal case)
      for (const g of Object.values(f.display.groups)) {
        const fr = { id: g.id, kind: g.kind === 'subnet' ? 'zone' : g.kind, label: g.label, parent: null, depth: 0, implicit: false, empty: false, x: 0, y: 0, w: 0, h: 0 } as LayoutFrame;
        const { label, caption } = frameText(fr);
        add({ style: 'frame', text: label, px: M.frameLabelPx, room: 216 - 24 });
        if (caption) add({ style: 'caption', text: caption, px: M.frameLabelPx, room: 216 - 24 });
      }
    }
  }
  for (const run of a.runs.slice(0, 1)) {
    for (const snap of run.snapshots.values()) {
      for (const f of Object.values(snap.layout.frames)) {
        const { label } = frameText(f);
        add({ style: 'frame', text: label, px: M.frameLabelPx, room: frameLabelRoom(f) });
      }
    }
  }
  // deterministic sample: every k-th, at most 300 per style, so CJK and long labels stay in
  const out: Sample[] = [];
  for (const style of ['title', 'subtitle', 'frame', 'caption'] as StyleKey[]) {
    const list = all.filter((s) => s.style === style);
    const k = Math.max(1, Math.ceil(list.length / 300));
    for (let i = 0; i < list.length; i += k) out.push(list[i]);
  }
  return out;
}

async function verifyText(browser: Awaited<ReturnType<typeof launchBrowser>>, a: RenderArgs): Promise<unknown> {
  const list = samples(a);
  const page = await browser.newPage();
  await page.setContent(`<!doctype html><html><head><style>${interFontFace()}body{margin:0;font-family:${FONT_STACK}}span{display:inline-block;white-space:nowrap}.title{font-weight:600;letter-spacing:-0.006em}.subtitle{font-weight:450}.frame{font-weight:650;letter-spacing:0.07em;font-variant-caps:all-small-caps}.caption{font-weight:500}</style></head><body></body></html>`);
  const widths = (await page.evaluate(
    `(async () => {
      await document.fonts.load('600 12px "Inter Variable"', 'Aa');
      await document.fonts.load('450 12px "Inter Variable"', 'Aa');
      await document.fonts.load('650 12px "Inter Variable"', 'Aa');
      const list = ${JSON.stringify(list.map((s) => ({ style: s.style, text: s.text, px: s.px })))};
      const out = [];
      for (const s of list) {
        const el = document.createElement('span');
        el.className = s.style;
        el.style.fontSize = s.px + 'px';
        el.textContent = s.text;
        document.body.appendChild(el);
        out.push(el.getBoundingClientRect().width);
        el.remove();
      }
      return out;
    })()`,
  )) as number[];
  await page.close();
  const rows = list.map((s, i) => {
    const est = textWidth(a.table, s.style, s.text, s.px);
    const real = widths[i];
    return { ...s, est: round(est, 2), real: round(real, 2), err: round(est - real, 2), estCut: est > s.room + 0.01, realCut: real > s.room + 0.01 };
  });
  const byStyle: Record<string, unknown> = {};
  for (const style of ['title', 'subtitle', 'frame', 'caption']) {
    const r = rows.filter((x) => x.style === style);
    const abs = r.map((x) => Math.abs(x.err));
    const rel = r.map((x) => Math.abs(x.err) / Math.max(1, x.real));
    const cjk = r.filter((x) => /[぀-ヿ㐀-鿿가-힯]/.test(x.text));
    byStyle[style] = {
      n: r.length,
      absErrPx: { p50: round(pct(abs, 0.5), 2), p95: round(pct(abs, 0.95), 2), max: round(Math.max(0, ...abs), 2) },
      relErr: { p50: round(pct(rel, 0.5), 4), p95: round(pct(rel, 0.95), 4) },
      meanSignedErrPx: round(r.reduce((s, x) => s + x.err, 0) / Math.max(1, r.length), 3),
      cutAgreement: round(r.filter((x) => x.estCut === x.realCut).length / Math.max(1, r.length), 4),
      estCut: r.filter((x) => x.estCut).length,
      realCut: r.filter((x) => x.realCut).length,
      cjk: { n: cjk.length, absErrP95: round(pct(cjk.map((x) => Math.abs(x.err)), 0.95), 2) },
    };
  }
  const disagreements = rows.filter((x) => x.estCut !== x.realCut).map((x) => `${x.style} "${x.text}" est ${x.est} real ${x.real} room ${x.room}`);
  return { summary: { samples: rows.length, byStyle, disagreements: disagreements.slice(0, 20) }, rows };
}
