import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createFontSet, parseSlices } from './fonts.ts';
import { nodeFontSource } from './fonts-node.ts';
import { isWoff, woffToSfnt } from './woff.ts';

const css = (family: string): string => readFileSync(new URL(`../../node_modules/@fontsource/noto-sans-${family}/400.css`, import.meta.url), 'utf8');

test('the slice tables list the Latin slices and the numbered CJK slices with their unicode ranges', () => {
  const kr = parseSlices(css('kr'), 'kr');
  const ids = kr.map((s) => s.id);
  assert.ok(ids.includes('latin') && ids.includes('latin-ext'));
  assert.ok(kr.length > 100, 'about 120 slices');
  const hangul = kr.find((s) => s.ranges.some(([lo, hi]) => 0xac00 >= lo && 0xac00 <= hi));
  assert.ok(hangul, 'the first Hangul syllable is in some slice');
  const sc = parseSlices(css('sc'), 'sc');
  assert.ok(sc.some((s) => s.ranges.some(([lo, hi]) => 0x4e2d >= lo && 0x4e2d <= hi)), '中 is in a Chinese slice');
});

test('Latin text loads only Latin faces: a few tens of KB, not the CJK slices', async () => {
  const fonts = createFontSet(nodeFontSource());
  fonts.width('Application Load Balancer (ALB), 99.9%', 12, 400);
  fonts.width('Role in this design', 12, 500);
  fonts.width('Proposal', 12, 700);
  assert.equal(fonts.missing, true, 'the first pass has no faces yet');
  await fonts.load();
  const st = fonts.stats();
  assert.equal(st.faces, 3, 'latin at 400, 500 and 700');
  assert.ok(st.bytes < 120_000, `${st.bytes} bytes`);
  assert.ok(fonts.width('Application Load Balancer', 12, 400) > 100, 'real widths after loading');
  assert.equal(fonts.missing, false);
  assert.ok(fonts.runs('Hello', 400).every((r) => r.face.startsWith('kr')));
});

test('Korean text loads Korean slices and splits runs between Hangul and Latin faces', async () => {
  const fonts = createFontSet(nodeFontSource());
  const text = '아키텍처 ALB 서버';
  fonts.runs(text, 400);
  await fonts.load();
  const runs = fonts.runs(text, 400);
  assert.ok(runs.length >= 3, 'Hangul, Latin, Hangul');
  assert.equal(runs.map((r) => r.text).join(''), text);
  assert.ok(runs.every((r) => r.face && r.width > 0));
  assert.equal(fonts.missing, false);
});

test('Chinese text prefers the Chinese family; simplified-only characters are covered', async () => {
  const fonts = createFontSet(nodeFontSource());
  const text = '这个设计将数据保存在新加坡';
  fonts.runs(text, 400);
  await fonts.load();
  const runs = fonts.runs(text, 400);
  assert.ok(runs.every((r) => r.face.startsWith('sc')), runs.map((r) => r.face).join());
  assert.equal(runs.map((r) => r.text).join(''), text, 'nothing replaced');
});

test('a character no slice covers is replaced by a stand-in, so measuring and drawing agree', async () => {
  const fonts = createFontSet(nodeFontSource());
  fonts.runs('ECS → ACK 😀', 400);
  await fonts.load();
  const shown = fonts.runs('ECS → ACK 😀', 400).map((r) => r.text).join('');
  assert.ok(!shown.includes('😀'), 'the emoji has no glyph');
  assert.ok(shown.includes('?'));
  assert.equal(fonts.clean('a\tb\nc'), 'a b c');
});

test('medium CJK text is drawn with the regular face, bold with the bold one', async () => {
  const fonts = createFontSet(nodeFontSource());
  fonts.runs('요구 사항', 500);
  fonts.runs('요구 사항', 700);
  await fonts.load();
  const medium = fonts.runs('요구', 500)[0].face;
  const regular = fonts.runs('요구', 400)[0].face;
  const bold = fonts.runs('요구', 700)[0].face;
  assert.equal(medium, regular);
  assert.notEqual(bold, regular);
});

test('woffToSfnt turns a WOFF into an uncompressed font with the same tables', async () => {
  const woff = new Uint8Array(readFileSync(new URL('../../node_modules/@fontsource/noto-sans-kr/files/noto-sans-kr-latin-400-normal.woff', import.meta.url)));
  assert.ok(isWoff(woff));
  const sfnt = await woffToSfnt(woff);
  assert.ok(!isWoff(sfnt));
  const tag = String.fromCharCode(...sfnt.subarray(0, 4));
  assert.ok(tag === 'OTTO' || tag === '\0\x01\0\0' || tag === 'true', `flavor ${JSON.stringify(tag)}`);
  const n = (woff[12] << 8) | woff[13];
  assert.equal((sfnt[4] << 8) | sfnt[5], n);
  assert.ok(sfnt.length > woff.length, 'inflated');
});
