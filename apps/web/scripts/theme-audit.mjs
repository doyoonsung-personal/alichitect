// Contrast audit of the running app in both themes, measured in a real browser from computed styles and checked against the
// rendered pixels. For every state it measures:
//   text      every text colour against the background it actually sits on (ancestor fills and group opacity composed; the
//             rendered pixels cross-check the background, and where they disagree the pixels win). AA: 4.5, large text 3.
//   focus     the focus ring of every Tab stop, read from the pixels: the ring against the ground just outside it. AA: 3.
//   boundary  every visible border, and every filled control, against the ground outside it (WCAG 1.4.11 for the ones that
//             identify a component). Decorative card/hairline borders are listed apart; they are not required to reach 3.
//   icon      UI stroke icons and product icons against their ground. 3.
//   stroke    canvas edges, read from the pixels with the edges hidden. 3.
// Starts its own Vite server on 5185-5199 and answers /api in the browser, like theme-shots.mjs.
//   node scripts/theme-audit.mjs [--themes light,dark] [--only landing,working] [--out audit.json] [--size 1440x900]
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { WEB, launch, sleep, startVite } from './console/lib.mjs';

const require = createRequire(import.meta.url);
const PNG = require('png-js');

const args = process.argv.slice(2);
const arg = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const themes = arg('--themes', 'light,dark').split(',');
const only = arg('--only', '').split(',').filter(Boolean);
const [W, H] = arg('--size', '1440x900').split('x').map(Number);
const outFile = arg('--out', path.join(WEB, 'screenshots', 'theme', 'audit.json'));
const saveShots = args.includes('--shots');
mkdirSync(path.dirname(outFile), { recursive: true });

const ACCOUNT = { email: 'mina.park@example.com', name: 'Mina Park', role: 'member', turnsToday: 7, turnsPerDay: 20, links: { account: '/account', admin: null, signOut: '/auth/logout' } };

/* ---------- colour maths (Node side) ---------- */
const lin = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
export const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
export const hex = (c) => '#' + c.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
export const dist = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);

/* ---------- PNG pixels ---------- */
export async function decode(buf) {
  const png = new PNG(buf);
  const w = png.width;
  const h = png.height;
  const data = await new Promise((res) => png.decode((d) => res(d)));
  const ch = data.length / (w * h); // 3 or 4
  const at = (x, y) => {
    x = Math.max(0, Math.min(w - 1, Math.round(x)));
    y = Math.max(0, Math.min(h - 1, Math.round(y)));
    const i = (y * w + x) * ch;
    return [data[i], data[i + 1], data[i + 2]];
  };
  /** The most common colour inside a rect, and the colour farthest from it. */
  const region = (r) => {
    const x0 = Math.max(0, Math.floor(r.x)), y0 = Math.max(0, Math.floor(r.y));
    const x1 = Math.min(w, Math.ceil(r.x + r.w)), y1 = Math.min(h, Math.ceil(r.y + r.h));
    const count = new Map();
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const i = (y * w + x) * ch;
      const k = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
      count.set(k, (count.get(k) ?? 0) + 1);
    }
    if (!count.size) return null;
    let best = -1, bk = 0;
    for (const [k, n] of count) if (n > best) { best = n; bk = k; }
    const mode = [(bk >> 16) & 255, (bk >> 8) & 255, bk & 255];
    let far = mode, fd = -1;
    for (const k of count.keys()) {
      const c = [(k >> 16) & 255, (k >> 8) & 255, k & 255];
      const d = dist(c, mode);
      if (d > fd) { fd = d; far = c; }
    }
    return { mode, far };
  };
  return { w, h, at, region };
}

/* ---------- the in-page auditors ---------- */
// One function, serialised into the page. Returns plain records; no pixel work here.
export function inPage(opts) {
  const cache = new Map();
  const cv = document.createElement('canvas');
  cv.width = cv.height = 1;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  const rgba = (s) => {
    if (cache.has(s)) return cache.get(s);
    let out;
    if (!s || s === 'transparent' || s === 'none') out = [0, 0, 0, 0];
    else {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = '#000';
      ctx.fillStyle = s;
      ctx.fillRect(0, 0, 1, 1);
      const d = ctx.getImageData(0, 0, 1, 1).data;
      // canvas premultiplies: recover alpha from a second draw on white
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = s;
      ctx.fillRect(0, 0, 1, 1);
      const d2 = ctx.getImageData(0, 0, 1, 1).data;
      out = [d2[0], d2[1], d2[2], d2[3] / 255];
      void d;
    }
    cache.set(s, out);
    return out;
  };
  const over = (top, under, alpha = 1) => {
    const a = top[3] * alpha;
    return [top[0] * a + under[0] * (1 - a), top[1] * a + under[1] * (1 - a), top[2] * a + under[2] * (1 - a), 1];
  };
  const lin = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
  const scheme = getComputedStyle(document.documentElement).colorScheme.includes('dark') ? [18, 18, 18, 1] : [255, 255, 255, 1];

  const keyOf = (el) => {
    const one = (e) => e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '') + (e.dataset && e.dataset.kind ? `[${e.dataset.kind}]` : '');
    const p = el.parentElement;
    return (p && p !== document.body ? one(p) + ' > ' : '') + one(el);
  };
  const chainOf = (el) => {
    const out = [];
    for (let e = el; e; e = e.parentElement) out.unshift(e);
    return out;
  };
  /** The ground a thing paints on: every ancestor's fill, group opacity multiplied in, from the page down. `upTo` excludes the element itself. */
  const ground = (el, includeSelf) => {
    const chain = chainOf(el);
    if (!includeSelf) chain.pop();
    let acc = scheme.slice();
    let cum = 1;
    let unknown = false;
    for (const e of chain) {
      const cs = getComputedStyle(e);
      cum *= parseFloat(cs.opacity);
      acc = over(rgba(cs.backgroundColor), acc, cum);
      if (cs.backgroundImage !== 'none') unknown = true;
    }
    return { color: acc, cum, unknown };
  };
  const cumOpacity = (el) => {
    let c = 1;
    for (let e = el; e; e = e.parentElement) c *= parseFloat(getComputedStyle(e).opacity);
    return c;
  };
  const inView = (r) => r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight;
  const isDisabled = (el) => !!el.closest('[disabled],[aria-disabled="true"],:disabled');
  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    for (let e = el; e; e = e.parentElement) if (getComputedStyle(e).display === 'none') return false;
    return true;
  };

  const scope = opts.scope ? document.querySelector(opts.scope) : document.body;
  const text = [];
  const walker = document.createTreeWalker(scope ?? document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const s = n.nodeValue.trim();
    if (!s) continue;
    const el = n.parentElement;
    if (!el || seen.has(el) || /^(SCRIPT|STYLE|TITLE|NOSCRIPT)$/.test(el.tagName)) continue;
    if (el.closest('title,script,style')) continue;
    if (!visible(el)) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    const r = range.getBoundingClientRect();
    if (!inView(r)) continue;
    // covered by something else (a popover over the canvas): not visible text
    const top = document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2)));
    if (top && !el.contains(top) && !top.contains(el)) continue;
    seen.add(el);
    const cs = getComputedStyle(el);
    const isSvg = el instanceof SVGElement;
    const fg = rgba(isSvg ? cs.fill : cs.color);
    if (fg[3] === 0 || parseFloat(cs.fontSize) === 0) continue;
    const g = ground(el, true);
    const cum = cumOpacity(el);
    const txt = over(fg, g.color, cum);
    const px = parseFloat(cs.fontSize);
    const w = parseInt(cs.fontWeight, 10) || 400;
    const large = px >= 24 || (px >= 18.66 && w >= 700);
    text.push({
      kind: 'text',
      key: keyOf(el),
      sample: s.slice(0, 40),
      fg: txt.map(Math.round),
      bg: g.color.map(Math.round),
      ratio: ratio(txt, g.color),
      need: large ? 3 : 4.5,
      size: px,
      weight: w,
      disabled: isDisabled(el),
      dimmed: cum < 0.5,
      unknownBg: g.unknown,
      rect: { x: r.left, y: r.top, w: r.width, h: r.height },
      opacity: cum,
    });
  }
  // inputs: value/placeholder text
  for (const el of (scope ?? document.body).querySelectorAll('input,textarea,select')) {
    if (!visible(el) || el.type === 'hidden' || el.type === 'checkbox' || el.type === 'radio') continue;
    const r = el.getBoundingClientRect();
    if (!inView(r)) continue;
    const cs = getComputedStyle(el);
    const g = ground(el, true);
    const cum = cumOpacity(el);
    const parts = [];
    if (el.value) parts.push(['value', cs.color]);
    if (el.placeholder && !el.value) parts.push(['placeholder', getComputedStyle(el, '::placeholder').color]);
    for (const [what, col] of parts) {
      const fg = over(rgba(col), g.color, cum);
      text.push({ kind: 'text', key: keyOf(el) + `::${what}`, sample: (what === 'value' ? el.value : el.placeholder).slice(0, 40), fg: fg.map(Math.round), bg: g.color.map(Math.round), ratio: ratio(fg, g.color), need: 4.5, size: parseFloat(cs.fontSize), weight: parseInt(cs.fontWeight, 10), disabled: el.disabled, dimmed: cum < 0.5, unknownBg: g.unknown, rect: { x: r.left + 8, y: r.top + 4, w: Math.max(4, r.width - 16), h: Math.max(4, r.height - 8) }, opacity: cum });
    }
  }

  // boundaries: every visible border, and every filled interactive control
  const boundary = [];
  const INTERACTIVE = 'button,a[href],input,textarea,select,[role="button"],[role="menuitem"],[role="menuitemradio"],[role="radio"],[role="tab"],[role="switch"],[tabindex]:not([tabindex="-1"])';
  for (const el of (scope ?? document.body).querySelectorAll('*')) {
    if (el instanceof SVGElement && !(el instanceof SVGSVGElement)) continue;
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    if (!inView(r) || r.width < 4 || r.height < 4) continue;
    const cs = getComputedStyle(el);
    const interactive = el.matches(INTERACTIVE);
    const out = ground(el, false);
    const cum = cumOpacity(el);
    const sides = ['Top', 'Right', 'Bottom', 'Left'];
    const nSides = sides.filter((sd) => parseFloat(cs[`border${sd}Width`]) > 0 && cs[`border${sd}Style`] !== 'none' && rgba(cs[`border${sd}Color`])[3] > 0).length;
    for (const side of sides) {
      const bw = parseFloat(cs[`border${side}Width`]);
      if (!(bw > 0) || cs[`border${side}Style`] === 'none' || rgba(cs[`border${side}Color`])[3] === 0) continue;
      const col = over(rgba(cs[`border${side}Color`]), out.color, cum);
      const own = over(rgba(cs.backgroundColor), out.color, cum);
      if (rgba(cs.backgroundColor)[3] > 0.9 && Math.abs(col[0] - own[0]) + Math.abs(col[1] - own[1]) + Math.abs(col[2] - own[2]) < 10) {
        // the border is the fill's own colour: the fill is the boundary
        boundary.push({ kind: 'boundary', what: 'fill', key: keyOf(el), interactive, width: 0, color: own.map(Math.round), outside: out.color.map(Math.round), inside: own.map(Math.round), ratioOut: ratio(own, out.color), ratioIn: 99, need: 3, disabled: isDisabled(el), dimmed: cum < 0.5, rect: { x: r.left, y: r.top, w: r.width, h: r.height }, sample: (el.textContent || '').trim().slice(0, 24) });
        break;
      }
      boundary.push({ kind: 'boundary', what: `border-${side.toLowerCase()}`, sides: nSides, key: keyOf(el), interactive, dashed: cs[`border${side}Style`] === 'dashed', width: bw, color: col.map(Math.round), outside: out.color.map(Math.round), inside: own.map(Math.round), ratioOut: ratio(col, out.color), ratioIn: ratio(col, own), need: 3, disabled: isDisabled(el), dimmed: cum < 0.5, rect: { x: r.left, y: r.top, w: r.width, h: r.height }, sample: (el.textContent || '').trim().slice(0, 24) });
      break; // one side stands for the element
    }
    if (interactive && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && parseFloat(cs.borderTopWidth) === 0) {
      const own = over(rgba(cs.backgroundColor), out.color, cum);
      // a 2 px inset rule in the action colour is what tells a chosen segment apart: it counts as the indicator
      let rule = 0;
      const m = cs.boxShadow.match(/(rgba?\([^)]*\))\s+0px\s+-?[\d.]+px\s+0px\s+0px\s+inset/);
      if (m) rule = ratio(over(rgba(m[1]), own), own);
      boundary.push({ kind: 'boundary', what: rule ? 'fill+rule' : 'fill', key: keyOf(el), interactive, width: 0, color: own.map(Math.round), outside: out.color.map(Math.round), inside: own.map(Math.round), ratioOut: Math.max(ratio(own, out.color), rule), ratioIn: 99, need: 3, disabled: isDisabled(el), dimmed: cum < 0.5, rect: { x: r.left, y: r.top, w: r.width, h: r.height }, sample: (el.textContent || '').trim().slice(0, 24) });
    }
  }

  // icons: stroke or fill of UI icons and product icons against their ground
  const icon = [];
  for (const svg of (scope ?? document.body).querySelectorAll('svg')) {
    if (!visible(svg) || svg.closest('.cv-edges')) continue;
    const r = svg.getBoundingClientRect();
    if (!inView(r) || r.width < 6) continue;
    const g = ground(svg, false);
    const cum = cumOpacity(svg);
    if (cum < 0.05) continue; // revealed on hover or focus: measured in the hover pass
    const paints = new Set();
    for (const p of svg.querySelectorAll('path,circle,rect,line,polyline,polygon,ellipse')) {
      const cs = getComputedStyle(p);
      if (cs.stroke !== 'none' && parseFloat(cs.strokeWidth) > 0) paints.add(cs.stroke);
      if (cs.fill !== 'none') paints.add(cs.fill);
    }
    if (!paints.size) continue;
    const brand = svg.closest('.cv-card__icon,.cv-pop__icon,.brand,.pp-row,[class*="icon"]') && [...paints].some((p) => /255, 106, 0/.test(p));
    for (const p of paints) {
      const c = over(rgba(p), g.color, cum);
      icon.push({ kind: 'icon', key: keyOf(svg), paint: p, color: c.map(Math.round), bg: g.color.map(Math.round), ratio: ratio(c, g.color), need: 3, brand: !!brand, disabled: isDisabled(svg), dimmed: cum < 0.5, size: Math.round(r.width), rect: { x: r.left, y: r.top, w: r.width, h: r.height } });
    }
  }

  // canvas edges: stroke colour, width, opacity and a few points to read from the pixels
  const strokes = [];
  for (const el of document.querySelectorAll('.cv-edge__line,.cv-edge__arrow,.cv-legend__line')) {
    if (!visible(el)) continue;
    const cs = getComputedStyle(el);
    const cum = cumOpacity(el);
    const pts = [];
    try {
      const len = el.getTotalLength();
      const m = el.getScreenCTM();
      for (const f of [0.15, 0.35, 0.5, 0.65, 0.85]) {
        const p = el.getPointAtLength(len * f);
        const q = new DOMPoint(p.x, p.y).matrixTransform(m);
        if (q.x > 0 && q.y > 0 && q.x < innerWidth && q.y < innerHeight) pts.push([q.x, q.y]);
      }
    } catch {
      /* not a geometry element */
    }
    strokes.push({ kind: 'stroke', key: keyOf(el) + (el.parentElement?.dataset.kind ? `[${el.parentElement.dataset.kind}]` : '') + (el.parentElement?.hasAttribute('data-path') ? '[path]' : ''), stroke: rgba(cs.stroke).map((v, i) => (i < 3 ? Math.round(v) : v)), width: parseFloat(cs.strokeWidth), dash: cs.strokeDasharray, opacity: cum, pts, dim: !!el.closest('[data-dim]') || cum < 0.5 });
  }
  return { text, boundary, icon, strokes };
}

/* ---------- harness ---------- */
export const results = []; // flat records, each carries theme and state

/** Measure one page as it stands: text, boundaries, icons, edges, then the focus ring of each Tab stop. */
/** Jump every finite animation and transition to its end, so a measure never reads a colour mid-fade. */
export async function settle(p) {
  await p.evaluate(() => {
    for (const a of document.getAnimations()) {
      const t = a.effect?.getComputedTiming?.();
      if (t && Number.isFinite(t.endTime) && t.iterations !== Infinity) a.finish();
    }
  });
  await new Promise((r) => setTimeout(r, 60));
}

export async function measure(p, theme, state, { focus = 0 } = {}) {
  const rec = (r) => results.push({ theme, state, ...r });
  await settle(p);
  const shot1 = await decode(await p.screenshot());
  if (saveShots) await p.screenshot({ path: path.join(WEB, 'screenshots', 'theme', `audit-${theme}-${state}.png`) });
  const found = await p.evaluate(inPage, {});

  for (const t of found.text) {
    // the pixels decide when the computed ground and the rendered one disagree
    const px = shot1.region(t.rect);
    let note = '';
    let bg = t.bg;
    let ratioFinal = t.ratio;
    if (px && dist(px.mode, t.bg) > 30) {
      bg = px.mode;
      note = `bg-by-pixels ${hex(t.bg)}->${hex(px.mode)}`;
      ratioFinal = ratio(t.fg, px.mode);
    }
    rec({ ...t, bg, ratio: ratioFinal, note, rect: undefined });
  }
  for (const b of found.boundary) {
    // the ground outside each border, from the pixels: three points along the side, the median read (a label, an edge or a
    // neighbour can sit on one of them)
    const r = b.rect;
    const along = (fn) => [0.25, 0.5, 0.75].map(fn);
    let samples = null;
    if (b.what === 'border-top') samples = along((f) => shot1.at(r.x + r.w * f, r.y - 2));
    else if (b.what === 'border-left') samples = along((f) => shot1.at(r.x - 2, r.y + r.h * f));
    else if (b.what === 'border-bottom') samples = along((f) => shot1.at(r.x + r.w * f, r.y + r.h + 1));
    else if (b.what === 'border-right') samples = along((f) => shot1.at(r.x + r.w + 1, r.y + r.h * f));
    const mid = samples ? samples.map((c) => ({ c, d: dist(c, b.outside) })).sort((x, y) => x.d - y.d)[1].c : null;
    const out = mid ?? b.outside;
    const mismatch = mid && dist(mid, b.outside) > 30;
    rec({ ...b, outside: out, ratioOut: mismatch ? ratio(b.color, mid) : b.ratioOut, note: mismatch ? `out-by-pixels ${hex(b.outside)}->${hex(mid)}` : '', rect: undefined });
  }
  for (const i of found.icon) {
    const px = shot1.region(i.rect);
    const mismatch = px && dist(px.mode, i.bg) > 30;
    rec({ ...i, bg: mismatch ? px.mode : i.bg, ratio: mismatch ? ratio(i.color, px.mode) : i.ratio, note: mismatch ? `bg-by-pixels ${hex(i.bg)}->${hex(px.mode)}` : '', rect: undefined });
  }
  if (found.strokes.length) {
    // edges hidden: read the ground under each point
    await p.addStyleTag({ content: '.cv-edges,.cv-legend__line,.cv-legend__arrow{visibility:hidden!important}' });
    const shot2 = await decode(await p.screenshot());
    for (const s of found.strokes) {
      for (const pt of s.pts) {
        const bg = shot2.at(pt[0], pt[1]);
        const col = [0, 1, 2].map((k) => s.stroke[k] * s.opacity + bg[k] * (1 - s.opacity));
        rec({ kind: 'stroke', key: s.key, width: s.width, dash: s.dash, dim: s.dim, color: col.map(Math.round), bg, ratio: ratio(col, bg), need: 3 });
      }
    }
  }
  if (focus) await focusSweep(p, theme, state, focus);
  return found;
}

/** Tab through the page; for each stop read what the focus ring is from the pixels, against the ground beside it. */
export async function focusSweep(p, theme, state, max) {
  await p.evaluate(() => {
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
    window.scrollTo(0, 0);
  });
  const stops = new Set();
  for (let i = 0; i < max; i++) {
    await p.keyboard.press('Tab');
    await sleep(40);
    const read = () => p.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const one = (e) => e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
      const label = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('placeholder') || '').trim().slice(0, 24);
      return { key: one(el) + (el.getAttribute('role') ? `[${el.getAttribute('role')}]` : ''), label, rect: { x: r.left, y: r.top, w: r.width, h: r.height }, outline: { style: cs.outlineStyle, width: parseFloat(cs.outlineWidth), offset: parseFloat(cs.outlineOffset), color: cs.outlineColor }, shadow: cs.boxShadow, vis: r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth };
    });
    // focusing can pan the canvas or scroll a list: read again until the element holds still
    let info = null;
    for (let k = 0; k < 14; k++) {
      await settle(p);
      const next = await read();
      if (info && next && Math.abs(next.rect.x - info.rect.x) < 0.3 && Math.abs(next.rect.y - info.rect.y) < 0.3) { info = next; break; }
      info = next;
      if (!info) break;
      await sleep(70);
    }
    if (!info) break;
    const id = info.key + info.label + Math.round(info.rect.x) + ',' + Math.round(info.rect.y);
    if (stops.has(id)) break; // wrapped
    stops.add(id);
    if (!info.vis) continue;
    const shot = await decode(await p.screenshot());
    const r = info.rect;
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    // candidate rings: the outline, and each solid box-shadow ring (outermost last)
    const rings = [];
    if (info.outline.style !== 'none' && info.outline.width > 0) {
      const w = info.outline.width, off = info.outline.offset;
      // left edge: ring occupies x in [r.x - off - w, r.x - off] (outset) or inside (negative offset)
      rings.push({ via: 'outline', ringX: r.x - off - w / 2, outerX: r.x - off - w - 3, innerX: r.x - off + 3, w, off });
    }
    const sh = info.shadow === 'none' ? [] : info.shadow.match(/(rgba?\([^)]*\)|color\([^)]*\))\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+(-?[\d.]+)px(\s+inset)?/g) ?? [];
    const parsed = sh.map((s) => {
      const m = s.match(/(rgba?\([^)]*\)|color\([^)]*\))\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+(-?[\d.]+)px(\s+inset)?/);
      return { blur: +m[4], spread: +m[5], inset: !!m[6] };
    }).filter((s) => !s.inset && s.blur === 0 && s.spread > 0);
    if (parsed.length) {
      const outer = Math.max(...parsed.map((s) => s.spread));
      const inner = Math.min(...parsed.map((s) => s.spread));
      // the outer band spans (inner, outer]; the gap ring, when there are two, spans (0, inner]
      const band = parsed.length > 1 ? (inner + outer) / 2 : outer / 2;
      rings.push({ via: 'box-shadow', ringX: r.x - band, outerX: r.x - outer - 3, innerX: r.x + 3, w: outer - (parsed.length > 1 ? inner : 0), off: 0 });
    }
    const insetRing = info.shadow !== 'none' && /inset/.test(info.shadow) && info.outline.style === 'none' ? info.shadow.match(/(rgba?\([^)]*\))\s+0px\s+0px\s+0px\s+([\d.]+)px\s+inset/) : null;
    if (!rings.length && insetRing) {
      // a field's own border turns action blue and gains an inset 1 px ring: the ring is the border, against the ground outside it
      const ring = shot.at(r.x + 1, cy);
      const out = shot.at(r.x - 3, cy);
      results.push({ theme, state, kind: 'focus', key: info.key, sample: info.label, via: 'border+inset', ring, bg: out, ratio: ratio(ring, out), need: 3, note: '' });
      continue;
    }
    if (!rings.length) {
      results.push({ theme, state, kind: 'focus', key: info.key, sample: info.label, via: 'none', ratio: 0, need: 3, note: 'no visible ring' });
      continue;
    }
    for (const g of rings) {
      // a probe can fall on a neighbour, a frame line or a label: read all four sides and keep the best read
    const dx = r.x - g.ringX; // ring distance from the edge
    const dxo = r.x - g.outerX;
    const probes = [
      { ring: shot.at(r.x - dx, cy), out: shot.at(r.x - dxo, cy) },
      { ring: shot.at(r.x + r.w + dx, cy), out: shot.at(r.x + r.w + dxo, cy) },
      { ring: shot.at(cx, r.y - dx), out: shot.at(cx, r.y - dxo) },
      { ring: shot.at(cx, r.y + r.h + dx), out: shot.at(cx, r.y + r.h + dxo) },
    ];
    const best = probes.map((q) => ({ ...q, ratio: ratio(q.ring, q.out) })).sort((a, b) => b.ratio - a.ratio)[0];
      results.push({ theme, state, kind: 'focus', key: info.key, sample: info.label, via: g.via, ring: best.ring, bg: best.out, ratio: best.ratio, need: 3, note: g.off < 0 ? 'inset' : '' });
    }
  }
  await p.evaluate(() => document.activeElement && document.activeElement.blur());
}


async function main() {
  const server = await startVite('http://127.0.0.1:8805');
  const browser = await launch();
  const log = [];

  async function open(theme, url, o = {}) {
    const p = await browser.newPage();
    await p.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
    await p.emulateMediaFeatures([
      { name: 'prefers-color-scheme', value: o.device ?? 'light' },
      { name: 'prefers-reduced-motion', value: 'no-preference' },
    ]);
    await p.evaluateOnNewDocument(
      (t, lang) => {
        try {
          localStorage.clear();
          localStorage.setItem('ab.lang', lang);
          if (t === 'light' || t === 'dark') localStorage.setItem('ab.theme', t);
        } catch {}
      },
      theme,
      o.lang ?? 'en',
    );
    await p.setRequestInterception(true);
    p.on('request', (r) => {
      const u = new URL(r.url());
      if (!u.pathname.startsWith('/api/')) return void r.continue();
      if (u.pathname === '/api/me' && o.account) return void r.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(o.account) });
      return void r.respond({ status: 404, contentType: 'application/json', body: '{"error":"not-found"}' });
    });
    p.on('pageerror', (e) => log.push(`pageerror: ${e.message}`));
    await p.goto(server.url + url, { waitUntil: o.wait ?? 'networkidle0' });
    return p;
  }

  const states = {
    async landing(theme) {
      const p = await open(theme, '/');
      await sleep(400);
      await measure(p, theme, 'landing', { focus: 14 });
      // typed ask: the composer text, the send control
      await p.type('.brief__input', 'We run an online store in Southeast Asia.');
      await sleep(200);
      await measure(p, theme, 'landing-typed');
      await p.close();
    },
    async themeMenu(theme) {
      const p = await open(theme, '/');
      await sleep(300);
      await p.click('.menu--theme > button');
      await sleep(300);
      await measure(p, theme, 'landing-theme-menu', { focus: 0 });
      await p.close();
    },
    async working(theme) {
      const p = await open(theme, '/?replay=ha&speed=instant');
      await sleep(900);
      await measure(p, theme, 'working', { focus: 60 });
      await p.click('.menu--theme > button');
      await sleep(300);
      await measure(p, theme, 'working-theme-menu');
      await p.keyboard.press('Escape');
      await p.close();
    },
    async popover(theme) {
      const p = await open(theme, '/?replay=ha&speed=instant');
      await sleep(700);
      const cards = await p.$$('.cv-card');
      await cards[Math.min(3, cards.length - 1)].hover();
      await sleep(800);
      await measure(p, theme, 'popover');
      const line = await p.$('button.chg');
      if (line) {
        await line.hover();
        await sleep(500);
        await measure(p, theme, 'highlight');
      }
      await p.close();
    },
    async panel(theme) {
      const p = await open(theme, '/?replay=ha&speed=instant');
      await sleep(500);
      await p.click('#products button');
      await sleep(700);
      await p.hover('.pp-row:nth-of-type(2)').catch(() => undefined);
      await sleep(300);
      await measure(p, theme, 'panel-open', { focus: 30 });
      await p.close();
    },
    async exportDialog(theme) {
      const p = await open(theme, '/?replay=ha&speed=instant');
      await sleep(600);
      const btn = await p.$('.xp > button');
      if (btn) {
        await btn.click();
        await sleep(400);
        await measure(p, theme, 'export-dialog', { focus: 12 });
      }
      await p.close();
    },
    async account(theme) {
      const p = await open(theme, '/?replay=ha&speed=instant', { account: ACCOUNT });
      await sleep(600);
      await p.click('.menu--account > button');
      await sleep(300);
      await measure(p, theme, 'account-menu');
      await p.close();
    },
    async error(theme) {
      const p = await open(theme, '/?replay=stub-fatal&speed=instant');
      await sleep(800);
      await measure(p, theme, 'error');
      await p.close();
    },
    async stream(theme) {
      const p = await open(theme, '/?replay=ecommerce&speed=1x', { wait: 'domcontentloaded' });
      await sleep(900);
      await measure(p, theme, 'stream-waiting');
      await sleep(5900);
      await measure(p, theme, 'stream-mid');
      await p.close();
    },
    async finishing(theme) {
      const p = await open(theme, '/?replay=stub-rescue-whole&speed=4x', { wait: 'domcontentloaded' });
      await p.waitForSelector('.rev__status', { timeout: 15000 });
      await sleep(120);
      await measure(p, theme, 'finishing');
      await p.close();
    },
    async solution(theme) {
      const p = await open(theme, '/?replay=ai-agent&speed=instant');
      await sleep(800);
      await measure(p, theme, 'solution-map');
      await p.close();
    },
    async offline(theme) {
      const p = await open(theme, '/');
      await sleep(500);
      await p.type('.brief__input', 'We run an online store in Southeast Asia.');
      await p.keyboard.press('Enter');
      await sleep(600);
      await measure(p, theme, 'landing-offline');
      await p.close();
    },
    // hover and pressed states of every control on the working view
    async hover(theme) {
      const p = await open(theme, '/?replay=ha&speed=instant');
      await sleep(900);
      const sel = 'button,a[href],[role="menuitem"],[role="button"]';
      const n = await p.$$eval(sel, (els) => els.length);
      for (let i = 0; i < Math.min(n, 60); i++) {
        const el = (await p.$$(sel))[i];
        if (!el) break;
        const box = await el.boundingBox();
        if (!box || box.width < 2 || box.y > H || box.y < 0) continue;
        await el.hover().catch(() => undefined);
        await sleep(180);
        await settle(p);
        const tag = await el.evaluate((e) => {
          e.setAttribute('data-audit-hover', '1');
          return e.tagName.toLowerCase() + '.' + String(e.className || '').split(' ')[0] + '|' + (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 20);
        });
        const found = await p.evaluate(inPage, { scope: '[data-audit-hover]' });
        const shot = await decode(await p.screenshot());
        await el.evaluate((e) => e.removeAttribute('data-audit-hover'));
        for (const t of found.text) {
          const px = shot.region(t.rect);
          let bg = t.bg, r = t.ratio, note = '';
          if (px && dist(px.mode, t.bg) > 30) { bg = px.mode; r = ratio(t.fg, px.mode); note = `bg-by-pixels ${hex(t.bg)}->${hex(px.mode)}`; }
          results.push({ theme, state: 'hover', ...t, key: `${t.key} (hover ${tag})`, bg, ratio: r, note, rect: undefined });
        }
        for (const ic of found.icon) {
          const px = shot.region(ic.rect);
          const mismatch = px && dist(px.mode, ic.bg) > 30;
          results.push({ theme, state: 'hover', ...ic, key: `${ic.key} (hover ${tag})`, bg: mismatch ? px.mode : ic.bg, ratio: mismatch ? ratio(ic.color, px.mode) : ic.ratio, rect: undefined });
        }
      }
      await p.close();
    },
  };

  for (const [name, fn] of Object.entries(states)) {
    if (only.length && !only.includes(name)) continue;
    for (const theme of themes) {
      process.stdout.write(`${name} ${theme}\n`);
      try {
        await fn(theme);
      } catch (e) {
        process.stdout.write(`  ! ${name} ${theme}: ${e.message}\n`);
      }
    }
  }
  await browser.close();
  server.stop();
  writeFileSync(outFile, JSON.stringify(results));
  report(results, log);
}

/* ---------- report ---------- */
export function report(all, log, themesUsed) {
  const decorative = /^(div|li|section|article|aside|header|nav|span)\.(cv-card|cv-frame|rev|chg|pp-|asks|req|asm|ask|panel|console|record)/;
  const fails = [];
  const agg = new Map();
  let dimmedCount = 0;
  for (const r of all) {
    const rv = r.kind === 'boundary' ? Math.min(r.ratioOut, r.ratioIn ?? 99) : r.ratio;
    r.r = rv;
    if (r.kind === 'boundary') r.group = r.interactive && !(r.sides && r.sides < 3) ? 'control' : /cv-frame/.test(r.key) ? 'frame' : /cv-card|cv-badge|cv-chip|chip|tag/.test(r.key) ? 'card/chip' : 'hairline';
    if (r.disabled) continue;
    if (r.dimmed || r.dim) { dimmedCount++; continue; }
    const id = [r.theme, r.kind, r.group ?? '', r.key, r.fg ? hex(r.fg) : r.color ? hex(r.color) : r.ring ? hex(r.ring) : '', r.bg ? hex(r.bg) : '', r.outside ? hex(r.outside) : ''].join('|');
    const cur = agg.get(id);
    if (!cur) agg.set(id, { ...r, n: 1, states: new Set([r.state]) });
    else {
      cur.n++;
      cur.states.add(r.state);
      if (rv < cur.r) Object.assign(cur, { r: rv, ratio: r.ratio });
    }
  }
  const rows = [...agg.values()];
  const bad = rows.filter((r) => r.r < r.need - 0.005 && r.group !== 'hairline');
  const hair = rows.filter((r) => r.r < r.need - 0.005 && r.group === 'hairline');
  process.stdout.write(`\nrecords ${all.length}, dimmed (left out) ${dimmedCount}, unique ${rows.length}, below threshold ${bad.length}\n`);
  for (const theme of themesUsed ?? themes) {
    for (const kind of ['text', 'focus', 'boundary', 'icon', 'stroke']) {
      const set = rows.filter((r) => r.theme === theme && r.kind === kind);
      if (!set.length) continue;
      const min = Math.min(...set.map((r) => r.r));
      const failing = set.filter((r) => r.r < r.need - 0.005);
      process.stdout.write(`${theme.padEnd(5)} ${kind.padEnd(8)} checked ${String(set.length).padStart(4)}  min ${min.toFixed(2)}  failing ${failing.length}\n`);
    }
  }
  process.stdout.write('\nFAILURES\n');
  for (const r of bad.sort((a, b) => a.r - b.r)) {
    const colours = r.kind === 'text' ? `${hex(r.fg)} on ${hex(r.bg)}` : r.kind === 'focus' ? (r.ring ? `${hex(r.ring)} beside ${hex(r.bg)}` : '') : r.kind === 'boundary' ? `${hex(r.color)} out ${hex(r.outside)} in ${hex(r.inside ?? r.outside)} ${r.what}${r.interactive ? ' [control]' : ''}${r.dashed ? ' dashed' : ''}` : r.kind === 'icon' ? `${hex(r.color)} on ${hex(r.bg)}${r.brand ? ' [brand]' : ''}` : `${hex(r.color)} on ${hex(r.bg)} w${r.width} ${r.dash}`;
    process.stdout.write(`${r.theme.padEnd(5)} ${r.kind.padEnd(8)} ${(r.group ?? '').padEnd(9)} ${r.r.toFixed(2)}/${r.need}  ${r.key}  ${colours}  "${r.sample ?? ''}"  [${[...r.states].join(',')}] x${r.n} ${r.note ?? ''}\n`);
  }
  process.stdout.write(`
DECORATIVE HAIRLINES below 3 (not required): ${hair.length}
`);
  const hk = new Map();
  for (const r of hair) hk.set(`${r.theme} ${hex(r.color)} on ${hex(r.outside)}`, (hk.get(`${r.theme} ${hex(r.color)} on ${hex(r.outside)}`) ?? 0) + 1);
  for (const [k, v] of hk) process.stdout.write(`  ${k} x${v}
`);
  void decorative;
  if (log.length) process.stdout.write(`\nbrowser errors:\n${[...new Set(log)].join('\n')}\n`);
}

// run as a script, not when the Worker's pages audit imports the measuring code
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((e) => {
    process.stderr.write(String(e.stack ?? e) + '\n');
    process.exit(1);
  });
}
