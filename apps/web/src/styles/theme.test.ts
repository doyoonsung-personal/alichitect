// The two themes in tokens.css: the dark layer defines every colour role the light :root does, its media-query copy
// (System on a dark device) is the same list, and the pairs the app draws pass WCAG 2.2 AA in both themes: text 4.5:1,
// controls, focus rings, frame borders and edge strokes 3:1 against what they sit on.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const CSS = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/** The declarations of the first rule whose selector is exactly `selector` (braces balanced). */
function block(selector: string): Map<string, string> {
  const at = CSS.indexOf(`${selector} {`);
  assert.ok(at >= 0, `${selector} not found`);
  let i = CSS.indexOf('{', at) + 1;
  const start = i;
  for (let depth = 1; depth > 0; i++) depth += CSS[i] === '{' ? 1 : CSS[i] === '}' ? -1 : 0;
  const body = CSS.slice(start, i - 1);
  const out = new Map<string, string>();
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out.set(m[1], m[2].trim().replace(/\s+/g, ' '));
  const scheme = /color-scheme:\s*(\w+)/.exec(body);
  if (scheme) out.set('color-scheme', scheme[1]);
  return out;
}

const LIGHT = block(':root');
const DARK = block(':root[data-theme="dark"]');
const SYSTEM_DARK = block('  :root:not([data-theme="light"])');

const isColour = (v: string): boolean => /#[0-9a-f]{3,8}\b|rgba?\(/i.test(v);
/** Every token whose light value is a colour or a plain reference to one. Composites built from other tokens (the focus
 * ring: var(--sheet) and var(--action)) follow the theme by themselves. */
function colourRoles(): string[] {
  return [...LIGHT.entries()].filter(([k, v]) => isColour(v) || (/^var\(--[\w-]+\)$/.test(v) && isColour(resolve(LIGHT, k)))).map(([k]) => k);
}

function resolve(theme: Map<string, string>, name: string, seen = new Set<string>()): string {
  const v = theme.get(name);
  if (v === undefined) throw new Error(`${name} undefined`);
  if (seen.has(name)) throw new Error(`${name} is circular`);
  seen.add(name);
  return v.replace(/var\((--[\w-]+)\)/g, (_, ref: string) => resolve(theme, ref, seen));
}

const lightTheme = LIGHT;
const darkTheme = new Map([...LIGHT, ...DARK]);

function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}
function lum(hex: string): number {
  const [r, g, b] = rgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

const hexOf = (theme: Map<string, string>, token: string): string => {
  const v = resolve(theme, token);
  assert.match(v, /^#[0-9a-f]{6}$/i, `${token} resolves to a plain hex colour (${v})`);
  return v;
};

test('the dark layer and its System copy are the same list', () => {
  assert.deepEqual([...SYSTEM_DARK.entries()], [...DARK.entries()]);
  assert.equal(DARK.get('color-scheme'), 'dark');
  assert.equal(LIGHT.get('color-scheme'), 'light');
});

test('dark defines every colour role the light theme has, and nothing else', () => {
  const missing = colourRoles().filter((k) => !DARK.has(k));
  assert.deepEqual(missing, [], 'colour roles without a dark value');
  const extra = [...DARK.keys()].filter((k) => k !== 'color-scheme' && !LIGHT.has(k));
  assert.deepEqual(extra, [], 'dark tokens with no light counterpart');
  assert.ok(DARK.has('--dim-opacity'), 'the dim state is tuned for dark too');
});

test('Intelligent Orange stays exactly where it is, in both themes', () => {
  for (const theme of [lightTheme, darkTheme]) {
    assert.equal(resolve(theme, '--brand-orange').toLowerCase(), '#ff6a00');
    assert.equal(resolve(theme, '--brand-icon').toLowerCase(), '#ff6a00');
    assert.equal(resolve(theme, '--cursor').toLowerCase(), '#ff6a00');
    // and no text or control token is orange
    for (const k of ['--ink', '--ink-2', '--ink-3', '--action', '--action-fill', '--warn', '--line-control', '--frame-line', '--edge']) {
      assert.notEqual(resolve(theme, k).toLowerCase(), '#ff6a00', k);
    }
  }
});

type Pair = [fg: string, bg: string, min: number];
const TEXT = 4.5;
const UI = 3;
/** The pairs the CSS draws (src/styles, canvas.css, panel.css, export.css, asks.css, the Worker's pages). */
const PAIRS: Pair[] = [
  // body and secondary text on every ground
  ...['--sheet', '--record', '--surface-2', '--surface-pop', '--card-fill', '--action-soft', '--frame-region-fill', '--frame-vpc-fill', '--frame-band-fill', '--frame-edge-fill'].flatMap(
    (bg): Pair[] => [
      ['--ink', bg, TEXT],
      ['--ink-2', bg, TEXT],
      ['--ink-3', bg, TEXT],
    ],
  ),
  ['--ink-2', '--warn-soft', TEXT], // replay banner
  ['--ink-3', '--warn-soft', TEXT],
  ['--ink', '--danger-soft', TEXT], // error block, broken requirement
  ['--ink-2', '--danger-soft', TEXT],
  ['--ink-3', '--danger-soft', TEXT],
  ['--ink', '--action-soft-2', TEXT], // ::selection, pressed rows
  ['--ink-3', '--edge-label-fill', TEXT], // edge labels
  // links and the text blue
  ...['--sheet', '--record', '--surface-pop', '--card-fill', '--action-soft'].map((bg): Pair => ['--action', bg, TEXT]),
  ...['--sheet', '--surface-pop'].map((bg): Pair => ['--action-hover', bg, TEXT]),
  // the filled primary button
  ['--on-action', '--action-fill', TEXT],
  ['--on-action', '--action-fill-hover', TEXT],
  ['--on-action', '--action-fill-press', TEXT],
  // marks: the latest revision tag, recommended chips, the Worker's step and count squares
  ['--on-ink', '--rev-tag', TEXT],
  ['--on-ink', '--ink-2', TEXT], // tag hover
  ['--on-ink', '--ok', TEXT],
  ['--on-ink', '--danger', TEXT],
  // state text
  ...['--sheet', '--record', '--surface-pop', '--ok-soft'].map((bg): Pair => ['--ok', bg, TEXT]),
  ...['--sheet', '--record', '--surface-pop', '--card-fill', '--warn-soft'].map((bg): Pair => ['--warn', bg, TEXT]),
  ...['--sheet', '--record', '--surface-pop', '--danger-soft'].map((bg): Pair => ['--danger', bg, TEXT]),
  // control borders
  ...['--sheet', '--record', '--surface-pop'].map((bg): Pair => ['--line-control', bg, UI]),
  ...['--sheet', '--record'].map((bg): Pair => ['--rev-tag-old', bg, UI]),
  // focus rings and the highlight ring, wherever a focusable thing sits
  ...['--sheet', '--record', '--surface-pop', '--card-fill', '--frame-region-fill', '--frame-vpc-fill', '--frame-band-fill', '--surface-2'].map((bg): Pair => ['--action', bg, UI]),
  // frame borders against the fills on both sides
  ...['--sheet', '--frame-region-fill', '--frame-vpc-fill', '--frame-band-fill'].map((bg): Pair => ['--frame-line', bg, UI]),
  // edge strokes against every container they cross
  ...['--sheet', '--frame-region-fill', '--frame-vpc-fill', '--frame-band-fill', '--frame-edge-fill'].flatMap((bg): Pair[] => [
    ['--edge', bg, UI],
    ['--edge-path', bg, UI],
  ]),
  // the primary button stands out from the ground it sits on
  ...['--sheet', '--record', '--surface-pop'].map((bg): Pair => ['--action-fill', bg, UI]),
];

for (const [name, theme] of [
  ['light', lightTheme],
  ['dark', darkTheme],
] as const) {
  test(`${name}: every drawn pair passes WCAG 2.2 AA`, () => {
    const fails: string[] = [];
    for (const [fg, bg, min] of PAIRS) {
      const r = contrast(hexOf(theme, fg), hexOf(theme, bg));
      if (r < min) fails.push(`${fg} on ${bg}: ${r.toFixed(2)} < ${min}`);
    }
    assert.deepEqual(fails, []);
  });
}

test('dark is designed, not inverted: grounds lighten as they rise, and the sheet is lighter than the record', () => {
  const L = (k: string): number => lum(hexOf(darkTheme, k));
  assert.ok(L('--record') < L('--sheet'), 'the record recedes under the sheet');
  assert.ok(L('--sheet') < L('--frame-region-fill') && L('--frame-region-fill') < L('--frame-vpc-fill') && L('--frame-vpc-fill') < L('--card-fill'), 'canvas containers step up');
  assert.ok(L('--sheet') < L('--surface-pop'), 'what floats is lighter than what it floats over');
  assert.ok(L('--edge') > L('--frame-line'), 'edges read over frames');
});

// ---------- what the pairs above cannot see: how the stylesheets use the tokens ----------
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
function cssFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? cssFiles(p) : n.endsWith('.css') ? [p] : [];
  });
}
/** Every rule of every stylesheet in src: its selector and its declaration text. */
function rules(): { file: string; selector: string; body: string }[] {
  const out: { file: string; selector: string; body: string }[] = [];
  for (const file of cssFiles(SRC)) {
    const css = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) out.push({ file: file.slice(SRC.length), selector: m[1].trim().replace(/\s+/g, ' '), body: m[2] });
  }
  return out;
}

test('--ink-disabled (2.6:1 on white, 3.1:1 on dark) is only ever the colour of a disabled thing', () => {
  const stray = rules().filter((r) => /var\(--ink-disabled\)/.test(r.body) && !/:disabled|\[disabled\]|\[aria-disabled|__dot|tokens\.css/.test(r.selector + r.file));
  assert.deepEqual(stray.map((r) => `${r.file}: ${r.selector}`), [], 'a link or label in --ink-disabled fails 4.5:1; use --ink-3');
});

test('a chosen segment or pressed button is told apart by a 3:1 rule, not by a soft fill alone (WCAG 1.4.11)', () => {
  const pressed = rules().filter((r) => /\[aria-pressed="true"\]/.test(r.selector) && /background:\s*var\(--action-soft/.test(r.body));
  assert.ok(pressed.length >= 3, 'the segmented control, the replay speed and the ghost toggle');
  const soft = pressed.filter((r) => !/box-shadow:\s*inset 0 -2px 0 var\(--action\)/.test(r.body));
  assert.deepEqual(soft.map((r) => `${r.file}: ${r.selector}`), []);
  // the rule itself clears 3:1 on both sheets and on the soft fills in both themes
  for (const [name, theme] of [['light', lightTheme], ['dark', darkTheme]] as const) {
    for (const bg of ['--sheet', '--record', '--action-soft', '--action-soft-2']) {
      assert.ok(contrast(hexOf(theme, '--action'), hexOf(theme, bg)) >= 3, `${name}: --action on ${bg}`);
    }
  }
});
