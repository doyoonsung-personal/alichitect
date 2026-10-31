// Sanitizer tests: hostile SVG input must come out as allowlisted geometry only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeSvg, serializeSvg, ALLOWED_ATTRIBUTES, ALLOWED_ELEMENTS, type SvgNode } from '../sanitize.ts';

function walk(n: SvgNode, f: (n: SvgNode) => void) { f(n); for (const c of n.c ?? []) walk(c, f); }
function clean(src: string): string {
  const { root } = sanitizeSvg(src);
  assert.ok(root, 'expected a root');
  return serializeSvg(root);
}
function assertAllowlisted(root: SvgNode | null) {
  assert.ok(root);
  walk(root, (n) => {
    assert.ok(ALLOWED_ELEMENTS.includes(n.el), `element ${n.el}`);
    for (const k of Object.keys(n.a)) assert.ok(ALLOWED_ATTRIBUTES[n.el].includes(k), `attribute ${n.el}@${k}`);
  });
}

test('keeps plain iconfont geometry and drops presentation attributes', () => {
  const src = '<svg class="icon" style="width: 1em;fill: currentColor;" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M10 10h100v100z" fill="#FF6A00" /></svg>';
  assert.equal(clean(src), '<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path d="M10 10h100v100z" fill="#FF6A00"/></svg>');
});

test('removes scripts with their content, even when the content looks like tags', () => {
  const src = '<svg viewBox="0 0 10 10"><script>var s = "<path d=\'M0 0h9\'/>"; alert(1)</script><path d="M1 1h2v2z"/></svg>';
  const out = clean(src);
  assert.doesNotMatch(out, /script|alert/i);
  assert.equal((out.match(/<path/g) ?? []).length, 1);
});

test('drops event handlers, href, xlink:href and style attributes', () => {
  const src = '<svg viewBox="0 0 10 10" onload="alert(1)"><path d="M1 1h2v2z" onclick="x()" style="fill:red" href="#a" xlink:href="javascript:alert(1)"/></svg>';
  const r = sanitizeSvg(src);
  assertAllowlisted(r.root);
  const out = serializeSvg(r.root!);
  assert.doesNotMatch(out, /onload|onclick|style|href|javascript/i);
  assert.ok(r.dropped.includes('attr:path@onclick'));
});

test('drops unknown and dangerous elements with their subtrees', () => {
  const src = `<svg viewBox="0 0 10 10">
    <foreignObject><div xmlns="http://www.w3.org/1999/xhtml"><img src="x" onerror="alert(1)"/></div><path d="M0 0h1"/></foreignObject>
    <style>path{fill:url(javascript:alert(1))}</style>
    <use href="#x"/><image href="http://example.com/x.png"/><a href="javascript:alert(1)"><path d="M0 0h5v5z"/></a>
    <animate attributeName="href" to="javascript:alert(1)"/><set attributeName="onload" to="alert(1)"/>
    <text>hi</text><defs><linearGradient id="g"/></defs><mask id="m"><rect width="1" height="1"/></mask>
    <g><circle cx="5" cy="5" r="2"/></g>
  </svg>`;
  const r = sanitizeSvg(src);
  assertAllowlisted(r.root);
  const out = serializeSvg(r.root!);
  assert.doesNotMatch(out, /foreignObject|style|use|image|<a|animate|<set|text|defs|mask|javascript|onerror|href/i);
  assert.equal(out, '<svg viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg"><g><circle cx="5" cy="5" r="2"/></g></svg>');
});

test('unbalanced markup inside a dropped subtree fails closed: everything after it is dropped', () => {
  const r = sanitizeSvg('<svg viewBox="0 0 1 1"><foreignObject><img src=x onerror=alert(1)></foreignObject><path d="M0 0h1v1z"/></svg>');
  assert.equal(r.root?.c, undefined);
});

test('is case-sensitive about element names, so SCRIPT and Path are unknown and dropped', () => {
  const out = clean('<svg viewBox="0 0 10 10"><SCRIPT>alert(1)</SCRIPT><Path d="M0 0h1"/><path d="M1 1h1v1z"/></svg>');
  assert.equal(out, '<svg viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg"><path d="M1 1h1v1z"/></svg>');
});

test('rejects values that are not plain numbers, path data, hex colours or simple transforms', () => {
  const src = `<svg viewBox="0 0 10 10">
    <path d="M0 0 url(javascript:alert(1))"/>
    <path d="M1 1h2v2z" fill="url(#g)"/>
    <path d="M1 1h2v2z" fill="red; background:url(x)"/>
    <rect x="1" y="1" width="calc(1px)" height="2"/>
    <circle cx="1" cy="1" r="1" transform="translate(1,1) url(x)"/>
    <circle cx="2" cy="2" r="1" transform="translate(1 1) rotate(45)" fill-rule="evenodd" opacity="0.5"/>
  </svg>`;
  const r = sanitizeSvg(src);
  assertAllowlisted(r.root);
  const out = serializeSvg(r.root!);
  assert.doesNotMatch(out, /url|javascript|calc|red/);
  assert.match(out, /<circle cx="2" cy="2" r="1" transform="translate\(1 1\) rotate\(45\)" fill-rule="evenodd" opacity="0.5"\/>/);
  assert.ok(r.dropped.includes('value:path@d'));
  assert.ok(r.dropped.includes('empty:rect'), 'a rect without a valid width is dropped');
});

test('skips comments, CDATA, processing instructions and doctypes without expanding entities', () => {
  const src = `<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY x "<script>alert(1)</script>">]><!-- <script>alert(2)</script> -->
    <svg viewBox="0 0 10 10"><![CDATA[<script>alert(3)</script>]]><path d="M1 1h1v1z" fill="&x;"/></svg>`;
  const out = clean(src);
  assert.equal(out, '<svg viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg"><path d="M1 1h1v1z"/></svg>');
});

test('takes only the first root svg and ignores anything after it', () => {
  const r = sanitizeSvg('<svg viewBox="0 0 1 1"><path d="M0 0h1v1z"/></svg><svg viewBox="0 0 1 1"><path d="M0 0h1"/></svg><script>x</script>');
  assert.equal(r.root?.c?.length, 1);
  assert.ok(r.dropped.some((d) => d.startsWith('after-root')));
});

test('a nested svg element is dropped', () => {
  const out = clean('<svg viewBox="0 0 1 1"><svg onload="x"><path d="M0 0h1v1z"/></svg></svg>');
  assert.equal(out, '<svg viewBox="0 0 1 1" xmlns="http://www.w3.org/2000/svg"></svg>');
});

test('unterminated or garbage markup yields at most what came before it', () => {
  assert.equal(sanitizeSvg('<svg viewBox="0 0 1 1"><path d="M0 0h1v1z"/><path d="M0 0').root?.c?.length, 1);
  assert.equal(sanitizeSvg('not svg at all').root, null);
  assert.equal(sanitizeSvg('<html><body><svg viewBox="0 0 1 1"></svg></body></html>').root, null, 'svg inside html is inside a dropped subtree');
});

test('serializeSvg refuses values that could break out of an attribute', () => {
  assert.throws(() => serializeSvg({ el: 'svg', a: { viewBox: '0 0 1 1"><script>' } }));
});
