// Allowlist SVG sanitizer for untrusted icon sources (the iconfont collection JSON and drafted fallback glyphs).
// It never evaluates or renders its input: a small tokenizer reads tags, keeps only allowlisted elements with
// allowlisted attributes whose values pass strict patterns, and drops everything else together with its subtree
// (scripts, styles, foreignObject, use/href, event handlers, text, comments, doctypes, entities, unknown elements).
// The output is a plain tree that the build re-serializes itself, so nothing from the source is copied verbatim.

export type AllowedElement = 'svg' | 'g' | 'path' | 'circle' | 'ellipse' | 'rect' | 'polygon' | 'polyline';

export interface SvgNode {
  el: AllowedElement;
  a: Record<string, string>;
  c?: SvgNode[];
}

export interface SanitizeReport {
  root: SvgNode | null;
  dropped: string[]; // what was removed, for logs and tests: 'element:script', 'attr:path@onclick', 'value:path@d'
}

export const ALLOWED_ELEMENTS: readonly AllowedElement[] = ['svg', 'g', 'path', 'circle', 'ellipse', 'rect', 'polygon', 'polyline'];

const PAINT = ['fill', 'fill-rule', 'fill-opacity', 'clip-rule', 'opacity'];

export const ALLOWED_ATTRIBUTES: Readonly<Record<AllowedElement, readonly string[]>> = {
  svg: ['viewBox', 'fill'],
  g: [...PAINT, 'transform'],
  path: ['d', ...PAINT, 'transform'],
  circle: ['cx', 'cy', 'r', ...PAINT, 'transform'],
  ellipse: ['cx', 'cy', 'rx', 'ry', ...PAINT, 'transform'],
  rect: ['x', 'y', 'width', 'height', 'rx', 'ry', ...PAINT, 'transform'],
  polygon: ['points', ...PAINT, 'transform'],
  polyline: ['points', ...PAINT, 'transform'],
};

const NUM = String.raw`[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?`;
const NUMBER = new RegExp(`^${NUM}$`);
const VIEWBOX = new RegExp(`^${NUM}(?:[\\s,]+${NUM}){3}$`);
const PATH_DATA = /^[MmLlHhVvCcSsQqTtAaZz0-9eE.,+\-\s]*$/;
const POINTS = /^[0-9eE.,+\-\s]*$/;
const TRANSFORM = new RegExp(`^(?:\\s*(?:matrix|translate|scale|rotate|skewX|skewY)\\(\\s*${NUM}(?:[\\s,]+${NUM}){0,5}\\s*\\)\\s*,?)+$`);
const PAINT_VALUE = /^(?:#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6}|none|currentColor)$/;
const RULE = /^(?:nonzero|evenodd)$/;
const MAX_VALUE = 200_000;

function validValue(name: string, value: string): boolean {
  if (value.length > MAX_VALUE) return false;
  switch (name) {
    case 'd': return PATH_DATA.test(value) && /[0-9]/.test(value);
    case 'points': return POINTS.test(value) && /[0-9]/.test(value);
    case 'viewBox': return VIEWBOX.test(value.trim());
    case 'transform': return TRANSFORM.test(value);
    case 'fill': return PAINT_VALUE.test(value.trim());
    case 'fill-rule': case 'clip-rule': return RULE.test(value.trim());
    case 'opacity': case 'fill-opacity': {
      if (!NUMBER.test(value.trim())) return false;
      const n = Number(value);
      return n >= 0 && n <= 1;
    }
    default: return NUMBER.test(value.trim()); // cx cy r rx ry x y width height
  }
}

function isAllowedElement(name: string): name is AllowedElement {
  return (ALLOWED_ELEMENTS as readonly string[]).includes(name);
}

interface Token { kind: 'open' | 'close' | 'selfclose'; name: string; attrs: Array<[string, string]> }

/** Splits markup into tags only. Text, comments, CDATA, processing instructions and doctypes are skipped. */
function tokenize(src: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const lt = src.indexOf('<', i);
    if (lt < 0) break;
    if (src.startsWith('<!--', lt)) { const e = src.indexOf('-->', lt + 4); i = e < 0 ? src.length : e + 3; continue; }
    if (src.startsWith('<![CDATA[', lt)) { const e = src.indexOf(']]>', lt + 9); i = e < 0 ? src.length : e + 3; continue; }
    if (src.startsWith('<?', lt)) { const e = src.indexOf('?>', lt + 2); i = e < 0 ? src.length : e + 2; continue; }
    if (src.startsWith('<!', lt)) {
      // Doctype, possibly with an internal subset in brackets. Entities are never expanded.
      let depth = 0; let j = lt + 2;
      for (; j < src.length; j++) {
        const ch = src[j];
        if (ch === '[') depth++;
        else if (ch === ']') depth--;
        else if (ch === '>' && depth <= 0) break;
      }
      i = j + 1;
      continue;
    }
    // Find the end of the tag, honouring quoted attribute values.
    let j = lt + 1; let quote = '';
    for (; j < src.length; j++) {
      const ch = src[j];
      if (quote) { if (ch === quote) quote = ''; }
      else if (ch === '"' || ch === "'") quote = ch;
      else if (ch === '>') break;
    }
    if (j >= src.length) break; // unterminated tag: drop the rest
    const body = src.slice(lt + 1, j);
    i = j + 1;
    if (body.startsWith('/')) {
      out.push({ kind: 'close', name: body.slice(1).trim().toLowerCase().split(/\s/)[0] ?? '', attrs: [] });
      continue;
    }
    const m = /^([A-Za-z_][\w.:-]*)/.exec(body);
    if (!m) continue; // '<' followed by junk: not a tag
    const selfClose = /\/\s*$/.test(body);
    const rest = body.slice(m[1].length).replace(/\/\s*$/, '');
    const attrs: Array<[string, string]> = [];
    const re = /([^\s=/"'<>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
    for (const a of rest.matchAll(re)) attrs.push([a[1], a[2] ?? a[3] ?? a[4] ?? '']);
    out.push({ kind: selfClose ? 'selfclose' : 'open', name: m[1], attrs });
  }
  return out;
}

/** Sanitizes one SVG document. Returns the root <svg> as a tree, or null when there is none. */
export function sanitizeSvg(src: string): SanitizeReport {
  const dropped: string[] = [];
  const tokens = tokenize(src);
  let root: SvgNode | null = null;
  const stack: SvgNode[] = [];
  let skipDepth = 0; // > 0 while inside a dropped element's subtree
  let rootClosed = false;

  for (const t of tokens) {
    if (skipDepth > 0) {
      if (t.kind === 'open') skipDepth++;
      else if (t.kind === 'close') skipDepth--;
      continue;
    }
    if (t.kind === 'close') {
      if (stack.length > 0) {
        stack.pop();
        if (stack.length === 0) rootClosed = true;
      }
      continue;
    }
    if (rootClosed) { dropped.push(`after-root:${t.name}`); continue; }
    const name = t.name; // case-sensitive: SVG element names are lowercase; 'SCRIPT' or 'Path' is unknown and dropped
    const allowed = isAllowedElement(name) && (stack.length === 0 ? name === 'svg' : name !== 'svg');
    if (!allowed) {
      dropped.push(`element:${name}`);
      if (t.kind === 'open') skipDepth = 1;
      continue;
    }
    const el = name as AllowedElement;
    const a: Record<string, string> = {};
    for (const [rawName, value] of t.attrs) {
      if (!ALLOWED_ATTRIBUTES[el].includes(rawName)) {
        if (!(el === 'svg' && ['xmlns', 'version', 'class', 'width', 'height', 'style'].includes(rawName))) dropped.push(`attr:${el}@${rawName}`);
        continue;
      }
      if (!validValue(rawName, value)) { dropped.push(`value:${el}@${rawName}`); continue; }
      a[rawName] = rawName === 'd' || rawName === 'points' || rawName === 'transform' ? value.replace(/\s+/g, ' ').trim() : value.trim();
    }
    if (el !== 'svg' && el !== 'g' && !hasGeometry(el, a)) { dropped.push(`empty:${el}`); if (t.kind === 'open') skipDepth = 1; continue; }
    const node: SvgNode = { el, a };
    if (stack.length === 0) root = node;
    else { const parent = stack[stack.length - 1]; (parent.c ??= []).push(node); }
    if (t.kind === 'open') stack.push(node);
    else if (stack.length === 0) rootClosed = true;
  }
  return { root, dropped };
}

function hasGeometry(el: AllowedElement, a: Record<string, string>): boolean {
  switch (el) {
    case 'path': return 'd' in a;
    case 'circle': return 'r' in a;
    case 'ellipse': return 'rx' in a && 'ry' in a;
    case 'rect': return 'width' in a && 'height' in a;
    case 'polygon': case 'polyline': return 'points' in a;
    default: return true;
  }
}

/** Serializes a sanitized tree. Values were validated, so no escaping is needed beyond refusing quotes. */
export function serializeSvg(node: SvgNode, extra: Record<string, string> = {}): string {
  const attrs = { ...node.a, ...(node.el === 'svg' ? extra : {}) };
  if (node.el === 'svg') attrs.xmlns = 'http://www.w3.org/2000/svg';
  const parts = Object.entries(attrs).map(([k, v]) => {
    if (/["<>&]/.test(v)) throw new Error(`unsafe value in ${node.el}@${k}`);
    return `${k}="${v}"`;
  });
  const open = `<${node.el}${parts.length ? ' ' + parts.join(' ') : ''}`;
  if (!node.c || node.c.length === 0) return node.el === 'svg' || node.el === 'g' ? `${open}></${node.el}>` : `${open}/>`;
  return `${open}>${node.c.map((c) => serializeSvg(c)).join('')}</${node.el}>`;
}

/** Every distinct fill used in the tree, upper-cased hex or keyword. */
export function fillsOf(node: SvgNode, out = new Set<string>()): Set<string> {
  if (node.a.fill) out.add(node.a.fill.startsWith('#') ? node.a.fill.toUpperCase() : node.a.fill);
  for (const c of node.c ?? []) fillsOf(c, out);
  return out;
}
