// Emitted icon set: every catalog id resolves, every emitted SVG is allowlisted, mappings pass the rule check,
// fallback glyphs follow the grid, and the official logos render.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { iconFor, hasOwnIcon, iconSvg, LOGOS } from '../../../src/icons/index.ts';
import { CATALOG_ICONS, FAMILY_ICONS } from '../../../src/icons/catalog-map.generated.ts';
import * as O from '../../../src/icons/official.generated.ts';
import * as F from '../../../src/icons/fallback.generated.ts';
import type { IconGeometry, IconNode, OfficialIcon } from '../../../src/icons/types.ts';
import { ALLOWED_ATTRIBUTES, ALLOWED_ELEMENTS, sanitizeSvg, serializeSvg } from '../sanitize.ts';
import { nodeBBox } from '../bbox.ts';
import { LIVE_AREA, MIN_EXTENT } from '../grid.ts';
import { ruleCheck } from '../rules.ts';
import { isRecommendable } from '../../../../../packages/core/src/catalog.ts';
import type { CatalogEntry, IconFamily } from '../../../../../packages/core/src/types.ts';

const here = dirname(fileURLToPath(import.meta.url));
const web = resolve(here, '../../..');
const repo = resolve(web, '../..');

const catalog: CatalogEntry[] = ['products.json', 'offerings.json'].flatMap((f) => (JSON.parse(readFileSync(join(repo, 'packages/core/catalog', f), 'utf8')) as { entries: CatalogEntry[] }).entries);

/** Every icon family in the core contract. Typed as a full record, so tsc fails here when core adds a family. */
const FAMILIES: Readonly<Record<IconFamily, true>> = {
  users: true, device: true, onprem: true, internet: true, dns: true, cdn: true, shield: true, firewall: true, loadbalancer: true,
  gateway: true, compute: true, container: true, serverless: true, database: true, cache: true, storage: true, filestore: true,
  search: true, queue: true, stream: true, analytics: true, bi: true, ai: true, agent: true, network: true, vpn: true, monitor: true,
  logs: true, key: true, identity: true, audit: true, devtools: true, desktop: true, media: true, saas: true, generic: true,
};
const official = O.OFFICIAL_KEYS.map((k) => (O as unknown as Record<string, OfficialIcon>)[k]);
const fallback = F.FALLBACK_KEYS.map((k) => (F as unknown as Record<string, IconGeometry & { key: string }>)[k]);

// ---------- independent checker for emitted SVG text (does not reuse the sanitizer) ----------

const ROOT_ATTRS = new Set(['xmlns', 'viewBox', 'width', 'height', 'fill', 'aria-hidden', 'focusable', 'role', 'aria-label']);
const SHAPE_ATTRS = new Set(Object.values(ALLOWED_ATTRIBUTES).flat());
const ELEMENTS = new Set<string>(ALLOWED_ELEMENTS);
function disallowed(svg: string): string[] {
  const bad: string[] = [];
  let depth = 0;
  for (const m of svg.matchAll(/<(\/?)([^\s/>]+)([^>]*)>/g)) {
    const [, close, name, rest] = m;
    if (!ELEMENTS.has(name)) bad.push(`element ${name}`);
    if (close) { depth--; continue; }
    const isRoot = depth === 0;
    if (!/\/\s*$/.test(rest)) depth++;
    for (const a of rest.matchAll(/([^\s=/]+)\s*=\s*"([^"]*)"/g)) {
      const [, k, v] = a;
      if (!(isRoot ? ROOT_ATTRS.has(k) || SHAPE_ATTRS.has(k) : SHAPE_ATTRS.has(k))) bad.push(`attribute ${name}@${k}`);
      if (/url\(|javascript:|data:|expression\(|[<>]/i.test(v)) bad.push(`value ${name}@${k}`);
    }
  }
  if (/<!|<\?|&#|on[a-z]+\s*=|href|style/i.test(svg)) bad.push('markup outside the allowlist');
  return bad;
}

function walk(n: IconNode, f: (n: IconNode) => void) { f(n); for (const c of n.c ?? []) walk(c, f); }

// ---------- resolution ----------

test('the catalog loads and has the expected size', () => {
  assert.ok(catalog.length >= 200, `catalog has ${catalog.length} entries`);
});

test('every recommendable catalog id resolves to its own verified icon', () => {
  const recommendable = catalog.filter(isRecommendable);
  assert.ok(recommendable.length >= 150, `${recommendable.length} recommendable entries`);
  const missing = recommendable.filter((e) => !hasOwnIcon(e.id)).map((e) => e.id);
  assert.deepEqual(missing, [], `ids without a mapping row: ${missing.join(', ')}; add them to scripts/icons/mapping.json and rebuild`);
  for (const e of recommendable) {
    const ic = iconFor(e.id, e.icon);
    assert.ok(ic.geometry.nodes.length > 0, e.id);
    assert.ok(['official', 'fallback'].includes(ic.source), e.id);
    assert.ok(['exact', 'close', 'generic'].includes(ic.confidence), e.id);
  }
});

test('every catalog id, retired and redirected ones included, has its own mapping row', () => {
  const missing = catalog.filter((e) => !hasOwnIcon(e.id)).map((e) => e.id);
  assert.deepEqual(missing, [], `ids without a mapping row: ${missing.join(', ')}`);
  for (const e of catalog) assert.ok(iconFor(e.id, e.icon).geometry.nodes.length > 0, e.id);
});

test('unknown ids fall back to their family glyph, then to the generic glyph', () => {
  assert.equal(iconFor('no-such-product', 'database'), FAMILY_ICONS.database);
  assert.equal(iconFor('no-such-product', 'not-a-family'), FAMILY_ICONS.generic);
  assert.equal(iconFor('no-such-product'), FAMILY_ICONS.generic);
  assert.equal(iconFor('__proto__'), FAMILY_ICONS.generic, 'prototype keys are not mappings');
  assert.equal(iconFor('constructor', 'toString'), FAMILY_ICONS.generic);
  for (const fam of Object.keys(FAMILIES)) assert.ok(Object.hasOwn(FAMILY_ICONS, fam), `family ${fam} has a default`);
  for (const fam of new Set(catalog.map((e) => e.icon))) assert.ok(Object.hasOwn(FAMILIES, fam), `catalog family ${fam} is in the contract`);
  for (const ic of Object.values(FAMILY_ICONS)) assert.equal(ic.confidence, 'generic');
});

test('the pinned gaps get drawn fallbacks', () => {
  for (const id of ['model-studio', 'qwen-cloud', 'pai', 'qoder', 'esa', 'kms', 'cloudsso', 'cpfs', 'milvus', 'dashvector', 'ai-gateway', 'users', 'mobile-app', 'iot-devices', 'onprem-dc', 'third-party-api']) {
    const ic = iconFor(id);
    assert.equal(ic.source, 'fallback', id);
    assert.equal(ic.confidence, 'exact', id);
  }
});

test("every 'exact' official mapping passes the rule check (shared word or a code note)", () => {
  const failures: string[] = [];
  for (const e of catalog) {
    const ic = CATALOG_ICONS[e.id];
    if (!ic || ic.source !== 'official' || ic.confidence !== 'exact') continue;
    const o = (O as unknown as Record<string, OfficialIcon>)[ic.key];
    const r = ruleCheck(e, o.key, o.name);
    if (!r.ok) failures.push(`${e.id} -> ${o.key} (${o.name})`);
  }
  assert.deepEqual(failures, []);
});

// ---------- emitted SVG is allowlisted ----------

test('no emitted icon SVG contains a disallowed element or attribute', () => {
  for (const g of [...official, ...fallback]) {
    const svg = iconSvg(g, { size: 24 });
    assert.deepEqual(disallowed(svg), [], g.key);
    walk({ el: 'g', a: {}, c: g.nodes }, (n) => {
      assert.ok(ELEMENTS.has(n.el), `${g.key}: ${n.el}`);
      for (const k of Object.keys(n.a)) assert.ok(SHAPE_ATTRS.has(k), `${g.key}: ${n.el}@${k}`);
    });
  }
});

test('the checker itself catches disallowed markup', () => {
  assert.notDeepEqual(disallowed('<svg viewBox="0 0 1 1"><script>alert(1)</script></svg>'), []);
  assert.notDeepEqual(disallowed('<svg viewBox="0 0 1 1"><path d="M0 0" onclick="x"/></svg>'), []);
  assert.notDeepEqual(disallowed('<svg viewBox="0 0 1 1"><use href="#a"/></svg>'), []);
  assert.notDeepEqual(disallowed('<svg viewBox="0 0 1 1"><path d="M0 0" fill="url(#g)"/></svg>'), []);
  assert.deepEqual(disallowed('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1" fill="currentColor"><path d="M0 0h1v1z"/></svg>'), []);
});

test('a title is escaped, never markup', () => {
  const svg = iconSvg(fallback[0], { title: '<img src=x onerror=alert(1)>' });
  assert.doesNotMatch(svg, /<img/);
  assert.match(svg, /&lt;img/);
});

test('emitted geometry is a fixed point of the sanitizer', () => {
  for (const g of [...official, ...fallback]) {
    const svg = serializeSvg({ el: 'svg', a: { viewBox: g.viewBox }, c: g.nodes as never });
    const again = sanitizeSvg(svg);
    assert.deepEqual(again.dropped, [], g.key);
    assert.equal(serializeSvg(again.root!), svg, g.key);
  }
});

// ---------- colour ----------

test('single-colour icons inherit currentColor; multi-colour icons are flagged', () => {
  for (const g of [...official, ...fallback]) {
    const fills = new Set<string>();
    for (const n of g.nodes) walk(n, (x) => { if (x.a.fill) fills.add(x.a.fill); });
    assert.equal(g.multicolor, fills.size > 0, `${g.key}: literal fills ${[...fills].join(',')}`);
    for (const f of fills) assert.notEqual(f.toUpperCase(), '#FF6A00', `${g.key} keeps the brand orange literally`);
  }
  assert.deepEqual([...O.OFFICIAL_MULTICOLOR], official.filter((o) => o.multicolor).map((o) => o.key));
  assert.ok(fallback.every((f) => !f.multicolor), 'fallback glyphs are single colour');
});

test('official icons keep their source names', () => {
  assert.equal((O as unknown as Record<string, OfficialIcon>).ecs.name, 'ecs 云服务器ECS');
  assert.equal((O as unknown as Record<string, OfficialIcon>).csk.name, 'csk 容器服务Kubernetes版');
  assert.ok(official.every((o) => o.name.length > 0 && Number.isInteger(o.iconfontId)));
  assert.equal(new Set(official.map((o) => o.key)).size, official.length, 'keys are unique');
});

// ---------- fallback glyphs follow the grid ----------

test('fallback glyphs sit in the official live area and match its optical size', () => {
  for (const g of fallback) {
    assert.equal(g.viewBox, '0 0 1024 1024', g.key);
    walk({ el: 'g', a: {}, c: g.nodes }, (x) => assert.ok(!x.a.transform, `${g.key}: fallback glyphs use absolute coordinates, not transforms`));
    const b = nodeBBox({ el: 'g', a: {}, c: g.nodes });
    assert.ok(b, g.key);
    const where = `${g.key} bbox ${[b.x0, b.y0, b.x1, b.y1].map(Math.round).join(' ')}`;
    assert.ok(b.x0 >= LIVE_AREA.min && b.y0 >= LIVE_AREA.min && b.x1 <= LIVE_AREA.max && b.y1 <= LIVE_AREA.max, `${where} leaves the live area`);
    assert.ok(Math.max(b.x1 - b.x0, b.y1 - b.y0) >= MIN_EXTENT, `${where} is smaller than the official set (larger side < ${MIN_EXTENT})`);
  }
});

// ---------- logos ----------

test('the official logos are sanitized SVG files with their official colours', () => {
  for (const lang of ['en', 'zh'] as const) {
    const meta = LOGOS[lang];
    const file = join(web, 'public', meta.file);
    assert.ok(existsSync(file), file);
    const text = readFileSync(file, 'utf8');
    assert.deepEqual(disallowed(text.trim()), [], meta.file);
    const r = sanitizeSvg(text);
    assert.deepEqual(r.dropped.filter((d) => !/^attr:svg@(width|height|xmlns)$/.test(d)), [], meta.file);
    assert.ok(r.root?.c?.length, 'has shapes');
    const fills = new Set<string>();
    for (const c of r.root!.c!) fills.add((c.a.fill ?? '').toUpperCase());
    for (const f of fills) assert.match(f, /^#FF6[0-9A]00$/, `${meta.file} uses the brand orange, got ${f}`);
    const [, , w, h] = meta.viewBox.split(' ').map(Number);
    assert.ok(w > h * 3, `${meta.file} is a horizontal lockup`);
  }
});

test('the logos render in Chrome', async (t) => {
  const req = createRequire(join(repo, 'spikes/canvas/package.json'));
  let puppeteer: { launch(o: object): Promise<any> };
  try { puppeteer = ((await import(pathToFileURL(req.resolve('puppeteer-core')).href)) as { default: typeof puppeteer }).default; }
  catch { t.skip('puppeteer-core is not installed (spikes/canvas/node_modules)'); return; }
  const chrome = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`, '/usr/bin/google-chrome'].find((c) => c && existsSync(c));
  if (!chrome) { t.skip('Chrome not found'); return; }
  const browser = await puppeteer.launch({ executablePath: chrome, headless: true });
  try {
    const page = await browser.newPage();
    for (const lang of ['en', 'zh'] as const) {
      const svg = readFileSync(join(web, 'public', LOGOS[lang].file), 'utf8');
      const result = await page.evaluate(async (src: string) => {
        const img = new Image();
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src);
        await img.decode();
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        const ctx = c.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        const d = ctx.getImageData(0, 0, c.width, c.height).data;
        let orange = 0;
        for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200 && d[i] > 230 && d[i + 1] > 80 && d[i + 1] < 130 && d[i + 2] < 40) orange++;
        return { w: img.naturalWidth, h: img.naturalHeight, orange, total: d.length / 4 };
      }, svg);
      assert.ok(result.w > 0 && result.h > 0, `${lang} logo has a size`);
      assert.ok(result.orange / result.total > 0.1, `${lang} logo draws orange pixels (${result.orange}/${result.total})`);
    }
  } finally {
    await browser.close();
  }
});
