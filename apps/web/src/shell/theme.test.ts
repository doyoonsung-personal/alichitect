import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { THEME_KEY, applyTheme, parseTheme, readTheme, storeTheme, themeAttr } from './theme.ts';
import type { ThemeDoc } from './theme.ts';

function memory(init: Record<string, string> = {}) {
  const m = new Map(Object.entries(init));
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m };
}

function doc(o: { reduced?: boolean; vt?: boolean; theme?: string } = {}) {
  const attrs = new Map<string, string>(o.theme ? [['data-theme', o.theme]] : []);
  const log: string[] = [];
  const frames: Array<() => void> = [];
  let finish: () => void = () => undefined;
  const d: ThemeDoc = {
    root: {
      setAttribute: (k: string, v: string) => void (attrs.set(k, v), log.push(`set ${k}=${v}`)),
      removeAttribute: (k: string) => void (attrs.delete(k), log.push(`remove ${k}`)),
      getAttribute: (k: string) => attrs.get(k) ?? null,
    },
    reducedMotion: () => !!o.reduced,
    startViewTransition: o.vt
      ? (update) => {
          log.push('view-transition');
          update();
          return { finished: new Promise<void>((r) => (finish = r)) };
        }
      : undefined,
    nextFrame: (fn) => void frames.push(fn),
  };
  return { d, attrs, log, flush: () => { while (frames.length) frames.shift()!(); }, finish: () => finish() };
}

test('anything but light or dark is System', () => {
  assert.equal(parseTheme('light'), 'light');
  assert.equal(parseTheme('dark'), 'dark');
  for (const v of [null, undefined, '', 'system', 'Dark', 'auto', 1]) assert.equal(parseTheme(v), 'system');
  assert.equal(themeAttr('system'), null);
  assert.equal(themeAttr('dark'), 'dark');
});

test('the choice lives under one key; System clears it; blocked storage falls back to System', () => {
  const s = memory();
  assert.equal(readTheme(s), 'system');
  storeTheme(s, 'dark');
  assert.deepEqual([...s.m], [[THEME_KEY, 'dark']]);
  assert.equal(readTheme(s), 'dark');
  storeTheme(s, 'system');
  assert.equal(s.m.size, 0);
  const blocked = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); }, removeItem: () => { throw new Error('denied'); } };
  assert.equal(readTheme(blocked), 'system');
  assert.doesNotThrow(() => storeTheme(blocked, 'light'));
  assert.equal(readTheme(null), 'system');
});

test('the switch cross-fades once through a view transition, with component transitions held off meanwhile', async () => {
  const x = doc({ vt: true });
  applyTheme(x.d, 'dark', { animate: true });
  assert.deepEqual(x.log, ['set data-theme-switching=', 'view-transition', 'set data-theme=dark']);
  assert.equal(x.attrs.has('data-theme-switching'), true);
  x.finish();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(x.attrs.has('data-theme-switching'), false);
  assert.equal(x.attrs.get('data-theme'), 'dark');
});

test('reduced motion, no view transitions, or a change from another tab: the theme simply changes', () => {
  for (const x of [doc({ vt: true, reduced: true, theme: 'dark' }), doc({ theme: 'dark' })]) {
    applyTheme(x.d, 'system', { animate: true });
    assert.ok(!x.log.includes('view-transition'));
    assert.equal(x.attrs.has('data-theme'), false, 'System leaves the media query in charge');
    x.flush();
    assert.equal(x.attrs.has('data-theme-switching'), false);
  }
  const y = doc({ vt: true });
  applyTheme(y.d, 'light');
  assert.ok(!y.log.includes('view-transition'));
  assert.equal(y.attrs.get('data-theme'), 'light');
});

test('choosing the theme already in force does nothing', () => {
  const x = doc({ vt: true, theme: 'dark' });
  applyTheme(x.d, 'dark', { animate: true });
  assert.deepEqual(x.log, []);
});

test('public/theme.js applies the same key before the first paint, and the page loads it before anything else', () => {
  const js = readFileSync(new URL('../../public/theme.js', import.meta.url), 'utf8');
  assert.match(js, new RegExp(`['"]${THEME_KEY.replace('.', '\\.')}['"]`));
  assert.match(js, /try\s*\{/);
  const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  const tag = /<script src="\/theme\.js"><\/script>/.exec(html);
  assert.ok(tag, 'a plain blocking <script src="/theme.js"> (no defer, no module, no inline code)');
  assert.ok(tag.index < html.indexOf('<body'), 'in <head>');
  // run it against a fake document: a stored choice lands on <html>, anything else leaves System
  for (const [stored, want] of [['dark', 'dark'], ['light', 'light'], ['bogus', null], [null, null]] as const) {
    const attrs = new Map<string, string>();
    const fakeDoc = { documentElement: { setAttribute: (k: string, v: string) => attrs.set(k, v) } };
    const fakeStorage = { getItem: (k: string) => (k === THEME_KEY ? stored : null) };
    new Function('document', 'localStorage', js)(fakeDoc, fakeStorage);
    assert.equal(attrs.get('data-theme') ?? null, want, String(stored));
  }
  // and blocked storage does not throw
  assert.doesNotThrow(() => new Function('document', 'localStorage', js)({ documentElement: { setAttribute() {} } }, { getItem() { throw new Error('denied'); } }));
});
