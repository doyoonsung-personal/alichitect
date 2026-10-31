// Icon pipeline: sanitizes the official Alibaba Cloud icon collection (iconfont.cn collection 21408, saved during
// research) and the hand-drawn fallback glyphs, checks the catalog mapping, and emits:
//   apps/web/src/icons/official.generated.ts     one named export per official icon (tree-shakable)
//   apps/web/src/icons/fallback.generated.ts     one named export per fallback glyph
//   apps/web/src/icons/catalog-map.generated.ts  catalog id -> icon, plus icon-family defaults
//   apps/web/src/icons/brand.generated.ts        logo metadata
//   apps/web/public/brand/alibaba-cloud-logo-{en,zh}.svg
// Usage: node apps/web/scripts/icons/build.ts [--source <c21408.json>]
// The source JSON is untrusted: it is only read as data and every SVG goes through sanitize.ts.
// Without the source (it was saved to a session scratchpad during research), the build reuses the sanitized official
// geometry already in official.generated.ts and leaves it and the logos untouched, so mapping and fallback changes
// can still be rebuilt. Typical loop after a catalog change: add rows to mapping.json, run this build, then
//   node --test "apps/web/scripts/icons/test/*.test.ts"   and   node apps/web/scripts/icons/contact.ts
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fillsOf, sanitizeSvg, serializeSvg, type SvgNode } from './sanitize.ts';
import { nodeBBox, type Box } from './bbox.ts';

const here = dirname(fileURLToPath(import.meta.url));
const web = resolve(here, '../..');
const repo = resolve(web, '../..');
const outSrc = join(web, 'src/icons');
const outBrand = join(web, 'public/brand');

const DEFAULT_SOURCE = 'C:/Users/mendo/AppData/Local/Temp/claude/C--Users-mendo-ali-catalog/35292bdb-ca0c-4df0-80b4-dd0f93723039/scratchpad/iconfont/c21408.json';
const argv = process.argv.slice(2);
const sourceArg = argv.indexOf('--source');
const sourcePath = sourceArg >= 0 ? argv[sourceArg + 1] : DEFAULT_SOURCE;
if (sourceArg >= 0 && !existsSync(sourcePath)) throw new Error(`source not found: ${sourcePath}`);
const fromSource = existsSync(sourcePath);

/** Names with no ASCII code prefix. */
const MANUAL_KEYS: Record<string, string> = {
  '备案': 'beian',
  '企业建站': 'enterprise_website',
  '电子签名': 'esign',
  '域名与网站': 'domain_website',
  '阿里云官方-中文LOGO': 'logo_zh',
  '阿里云官方-英文LOGO': 'logo_en',
};

const RESERVED = new Set(['break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do', 'else', 'enum', 'export', 'extends', 'false', 'finally', 'for', 'function', 'if', 'import', 'in', 'instanceof', 'new', 'null', 'return', 'super', 'switch', 'this', 'throw', 'true', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield', 'let', 'static', 'implements', 'interface', 'package', 'private', 'protected', 'public', 'await', 'arguments', 'eval']);

export function keyFor(name: string): string {
  const trimmed = name.trim();
  if (MANUAL_KEYS[trimmed]) return MANUAL_KEYS[trimmed];
  const m = /^([A-Za-z][A-Za-z0-9_.-]*)/.exec(trimmed);
  if (!m) throw new Error(`no key for icon name ${JSON.stringify(name)}`);
  let key = m[1].replace(/[-_.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '_');
  if (RESERVED.has(key)) key = `${key}_icon`;
  return key;
}

/** The collection's orange and its near variants (#FF5D00 .. #FF7015) all mean "the icon colour". */
function isBrandOrange(fill: string): boolean {
  const m = /^#([0-9A-F]{2})([0-9A-F]{2})([0-9A-F]{2})$/i.exec(fill);
  if (!m) return false;
  const [r, g, b] = [m[1], m[2], m[3]].map((h) => parseInt(h, 16));
  return r >= 0xf0 && g >= 0x50 && g <= 0x80 && b <= 0x30;
}

/** Drops brand-orange fills so the node inherits currentColor; keeps any other fill and reports it. */
function themeable(node: SvgNode, literal: Set<string>): SvgNode {
  const a = { ...node.a };
  if (a.fill && (isBrandOrange(a.fill) || a.fill === 'currentColor')) delete a.fill;
  else if (a.fill && a.fill !== 'none') { a.fill = a.fill.toUpperCase(); literal.add(a.fill); }
  const out: SvgNode = { el: node.el, a };
  if (node.c) out.c = node.c.map((c) => themeable(c, literal));
  return out;
}

const boxOf = (node: SvgNode): Box | null => nodeBBox(node);

interface BuiltIcon { key: string; name: string; iconfontId?: number; viewBox: string; nodes: SvgNode[]; multicolor: boolean; literal: string[]; box: Box | null }

function lit(v: unknown): string { return JSON.stringify(v); }

function nodeLiteral(n: SvgNode): string {
  const attrs = Object.entries(n.a).map(([k, v]) => `${/^[a-z]+$/i.test(k) ? k : lit(k)}: ${lit(v)}`).join(', ');
  const kids = n.c && n.c.length ? `, c: [${n.c.map(nodeLiteral).join(', ')}]` : '';
  return `{ el: ${lit(n.el)}, a: { ${attrs} }${kids} }`;
}

// ---------- 1. Official icons ----------

const official: BuiltIcon[] = [];
const logos: Record<string, BuiltIcon> = {};
const log: string[] = [];
if (fromSource) {
  const raw: unknown = JSON.parse(readFileSync(sourcePath, 'utf8'));
  const icons = (raw as { data?: { icons?: unknown } }).data?.icons;
  if (!Array.isArray(icons)) throw new Error('source has no data.icons[]');
  const used = new Set<string>();
  for (const item of icons as Array<Record<string, unknown>>) {
    const name = typeof item.name === 'string' ? item.name.replace(/\s+/g, ' ').trim() : '';
    const svg = typeof item.show_svg === 'string' ? item.show_svg : '';
    const id = typeof item.id === 'number' ? item.id : Number(item.id);
    if (!name || !svg || !Number.isFinite(id)) { log.push(`skip malformed item ${lit(item.id)}`); continue; }
    const { root, dropped } = sanitizeSvg(svg);
    const notable = dropped.filter((d) => !/^attr:svg@(class|style|version|xmlns|width|height)$/.test(d));
    if (notable.length) log.push(`${name}: dropped ${notable.join(' ')}`);
    if (!root || !root.c?.length) { log.push(`${name}: nothing drawable, skipped`); continue; }
    let key = keyFor(name);
    if (used.has(key)) { let n = 2; while (used.has(`${key}_${n}`)) n++; key = `${key}_${n}`; }
    used.add(key);
    const viewBox = root.a.viewBox ?? '0 0 1024 1024';
    if (key.startsWith('logo_')) {
      logos[key] = { key, name, iconfontId: id, viewBox, nodes: root.c, multicolor: fillsOf(root).size > 1, literal: [...fillsOf(root)], box: boxOf(root) };
      continue;
    }
    const literal = new Set<string>();
    const nodes = root.c.map((c) => themeable(c, literal));
    official.push({ key, name, iconfontId: id, viewBox, nodes, multicolor: literal.size > 0, literal: [...literal], box: boxOf(root) });
  }
} else {
  // Snapshot mode: the generated module is already sanitized; it is re-checked by the tests, not re-sanitized here.
  const snapshot = (await import('../../src/icons/official.generated.ts')) as unknown as Record<string, unknown> & { OFFICIAL_KEYS: readonly string[] };
  for (const key of snapshot.OFFICIAL_KEYS) {
    const o = snapshot[key] as { name: string; iconfontId: number; viewBox: string; multicolor: boolean; nodes: SvgNode[] };
    const root: SvgNode = { el: 'svg', a: {}, c: o.nodes };
    official.push({ key, name: o.name, iconfontId: o.iconfontId, viewBox: o.viewBox, nodes: o.nodes, multicolor: o.multicolor, literal: [...fillsOf(root)], box: boxOf(root) });
  }
  log.push(`source not found (${sourcePath}): reused ${official.length} official icons from official.generated.ts; official icons and logos left as they are`);
}

// ---------- 2. Fallback glyphs ----------

const fallbackDir = join(here, 'fallback');
const fallbackIndexPath = join(fallbackDir, 'index.json');
const fallbackIndex: Record<string, { name: string }> = existsSync(fallbackIndexPath) ? JSON.parse(readFileSync(fallbackIndexPath, 'utf8')) : {};
const fallback: BuiltIcon[] = [];
for (const file of existsSync(fallbackDir) ? readdirSync(fallbackDir).filter((f) => f.endsWith('.svg')).sort() : []) {
  const key = file.replace(/\.svg$/, '');
  if (!/^[a-z][a-z0-9_]*$/.test(key)) throw new Error(`fallback file name must be a key: ${file}`);
  const meta = fallbackIndex[key];
  if (!meta) throw new Error(`fallback ${key} has no entry in fallback/index.json`);
  const { root, dropped } = sanitizeSvg(readFileSync(join(fallbackDir, file), 'utf8'));
  const notable = dropped.filter((d) => !/^attr:svg@(class|style|version|xmlns|width|height)$/.test(d));
  if (notable.length) throw new Error(`fallback ${key}: sanitizer dropped ${notable.join(' ')}; fix the source`);
  if (!root || !root.c?.length) throw new Error(`fallback ${key}: nothing drawable`);
  if (root.a.viewBox !== '0 0 1024 1024') throw new Error(`fallback ${key}: viewBox must be 0 0 1024 1024`);
  const literal = new Set<string>();
  const nodes = root.c.map((c) => themeable(c, literal));
  if (literal.size) throw new Error(`fallback ${key}: must be single colour, found ${[...literal].join(',')}`);
  if (official.some((o) => o.key === key)) throw new Error(`fallback ${key} collides with an official key`);
  fallback.push({ key, name: meta.name, viewBox: root.a.viewBox, nodes, multicolor: false, literal: [], box: boxOf(root) });
}
for (const key of Object.keys(fallbackIndex)) if (!fallback.some((f) => f.key === key)) throw new Error(`fallback/index.json lists ${key} but fallback/${key}.svg is missing`);

// ---------- 3. Catalog mapping ----------

type Ref = `official:${string}` | `fallback:${string}`;
interface MapRow { icon: Ref; confidence: 'exact' | 'close' | 'generic'; note?: string }
const mapping = JSON.parse(readFileSync(join(here, 'mapping.json'), 'utf8')) as { catalogVersion: string; families: Record<string, Ref>; entries: Record<string, MapRow> };
const officialKeys = new Set(official.map((o) => o.key));
const fallbackKeys = new Set(fallback.map((f) => f.key));
function checkRef(ref: string, where: string): { source: 'official' | 'fallback'; key: string } {
  const m = /^(official|fallback):([a-z][a-z0-9_]*)$/.exec(ref);
  if (!m) throw new Error(`${where}: bad icon ref ${ref}`);
  const source = m[1] as 'official' | 'fallback';
  if (!(source === 'official' ? officialKeys : fallbackKeys).has(m[2])) throw new Error(`${where}: unknown ${source} icon ${m[2]}`);
  return { source, key: m[2] };
}
const catalogIds = new Set<string>();
for (const f of ['products.json', 'offerings.json']) {
  const doc = JSON.parse(readFileSync(join(repo, 'packages/core/catalog', f), 'utf8')) as { entries: Array<{ id: string }> };
  for (const e of doc.entries) catalogIds.add(e.id);
}
const unmapped = [...catalogIds].filter((id) => !mapping.entries[id]);
const stale = Object.keys(mapping.entries).filter((id) => !catalogIds.has(id));
if (unmapped.length) log.push(`catalog ids without a mapping (they fall back to their icon family): ${unmapped.join(', ')}`);
if (stale.length) log.push(`mapping rows for ids no longer in the catalog: ${stale.join(', ')}`);

// ---------- 4. Emit ----------

mkdirSync(outSrc, { recursive: true });
mkdirSync(outBrand, { recursive: true });
const banner = (what: string) => `// GENERATED by apps/web/scripts/icons/build.ts — do not edit. ${what}\n`;

const officialTs = [
  banner('Official Alibaba Cloud product icons (iconfont.cn collection 21408, "2022 Alibaba Cloud product icon collection (orange version)", Alibaba Cloud Design Center), sanitized; fills mapped to currentColor.'),
  `import type { OfficialIcon } from './types.ts';\n`,
  ...official.map((o) => `export const ${o.key}: OfficialIcon = { key: ${lit(o.key)}, name: ${lit(o.name)}, iconfontId: ${o.iconfontId}, viewBox: ${lit(o.viewBox)}, multicolor: ${o.multicolor}, nodes: [${o.nodes.map(nodeLiteral).join(', ')}] };`),
  '',
  `/** Every official key, in source order (strings only, so importing this does not pull in geometry). */`,
  `export const OFFICIAL_KEYS: readonly string[] = ${lit(official.map((o) => o.key))};`,
  `/** Keys of icons that keep a literal fill besides currentColor. */`,
  `export const OFFICIAL_MULTICOLOR: readonly string[] = ${lit(official.filter((o) => o.multicolor).map((o) => o.key))};`,
  '',
].join('\n');
if (fromSource) writeFileSync(join(outSrc, 'official.generated.ts'), officialTs);

const fallbackTs = [
  banner('Fallback glyphs for catalog entries the official collection lacks, drawn on the same 1024 grid in one colour. Sources: apps/web/scripts/icons/fallback/*.svg.'),
  `import type { FallbackIcon } from './types.ts';\n`,
  ...fallback.map((f) => `export const ${f.key}: FallbackIcon = { key: ${lit(f.key)}, name: ${lit(f.name)}, viewBox: ${lit(f.viewBox)}, multicolor: false, nodes: [${f.nodes.map(nodeLiteral).join(', ')}] };`),
  '',
  `export const FALLBACK_KEYS: readonly string[] = ${lit(fallback.map((f) => f.key))};`,
  '',
].join('\n');
writeFileSync(join(outSrc, 'fallback.generated.ts'), fallbackTs);

const rowLiteral = (ref: string, confidence: string, where: string) => {
  const { source, key } = checkRef(ref, where);
  return `{ geometry: ${source === 'official' ? 'O' : 'F'}.${key}, source: ${lit(source)}, confidence: ${lit(confidence)}, key: ${lit(key)} }`;
};
const mapTs = [
  banner(`Catalog id -> icon, from apps/web/scripts/icons/mapping.json (catalog ${mapping.catalogVersion}).`),
  `import type { CatalogIcon } from './types.ts';`,
  `import * as O from './official.generated.ts';`,
  `import * as F from './fallback.generated.ts';\n`,
  `export const CATALOG_ICONS: Readonly<Record<string, CatalogIcon>> = {`,
  ...Object.entries(mapping.entries).sort(([a], [b]) => a.localeCompare(b)).map(([id, row]) => {
    if (!['exact', 'close', 'generic'].includes(row.confidence)) throw new Error(`${id}: bad confidence ${row.confidence}`);
    return `  ${lit(id)}: ${rowLiteral(row.icon, row.confidence, id)},`;
  }),
  `};\n`,
  `/** Default per catalog icon family, used for ids the mapping does not know yet. Always confidence 'generic'. */`,
  `export const FAMILY_ICONS: Readonly<Record<string, CatalogIcon>> = {`,
  ...Object.entries(mapping.families).map(([fam, ref]) => `  ${lit(fam)}: ${rowLiteral(ref, 'generic', `family ${fam}`)},`),
  `};`,
  '',
].join('\n');
writeFileSync(join(outSrc, 'catalog-map.generated.ts'), mapTs);

// Logos: official colours kept, cropped to the drawing with a small margin. Only rebuilt from the source.
if (fromSource) {
  const brandMeta: Record<string, { file: string; viewBox: string; aspect: number; name: string; iconfontId: number; colors: string[] }> = {};
  for (const [key, lang] of [['logo_en', 'en'], ['logo_zh', 'zh']] as const) {
    const logo = logos[key];
    if (!logo || !logo.box) throw new Error(`official ${key} missing from the source`);
    const pad = Math.round((logo.box.y1 - logo.box.y0) * 0.04); // a hairline of air so antialiasing never clips
    const x = Math.floor(logo.box.x0 - pad), y = Math.floor(logo.box.y0 - pad);
    const w = Math.ceil(logo.box.x1 + pad) - x, h = Math.ceil(logo.box.y1 + pad) - y;
    const viewBox = `${x} ${y} ${w} ${h}`;
    // Intrinsic size: 32 px tall, so an <img> without CSS sizing still renders at a sane header size.
    const svg = serializeSvg({ el: 'svg', a: { viewBox }, c: logo.nodes }, { width: String(Math.round((32 * w) / h)), height: '32' });
    const file = `alibaba-cloud-logo-${lang}.svg`;
    writeFileSync(join(outBrand, file), `${svg}\n`);
    brandMeta[lang] = { file: `brand/${file}`, viewBox, aspect: Math.round((w / h) * 1000) / 1000, name: logo.name, iconfontId: logo.iconfontId ?? 0, colors: logo.literal };
  }
  const brandTs = [
    banner('Official Alibaba Cloud logos (iconfont.cn collection 21408), sanitized, official colours kept. Files live in apps/web/public/brand/.'),
    `/** aspect = width / height of the cropped drawing. The file's intrinsic size is 32 px tall; size it with CSS height. */`,
    `export interface BrandLogo { file: string; viewBox: string; aspect: number; name: string; iconfontId: number; colors: readonly string[] }\n`,
    `/** Paths are relative to the app's public root: use import.meta.env.BASE_URL + file. */`,
    `export const LOGOS: Readonly<Record<'en' | 'zh', BrandLogo>> = ${JSON.stringify(brandMeta, null, 2)};`,
    '',
  ].join('\n');
  writeFileSync(join(outSrc, 'brand.generated.ts'), brandTs);
}

const out = {
  official: official.length,
  officialMulticolor: official.filter((o) => o.multicolor).map((o) => o.key),
  source: fromSource ? sourcePath : 'snapshot (official.generated.ts)',
  logos: Object.keys(logos),
  fallback: fallback.length,
  mapped: Object.keys(mapping.entries).length,
  outOfGrid: [...official, ...fallback].filter((i) => i.box && (i.box.x0 < -1 || i.box.y0 < -1 || i.box.x1 > 1025 || i.box.y1 > 1025)).map((i) => i.key),
};
console.log(JSON.stringify(out, null, 2));
if (log.length) console.log(log.join('\n'));
