import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { COLOR, TOKEN_OF } from './tokens.ts';

test('the PDF stays light whatever theme the page shows: it draws from these constants, never from the page styles', () => {
  const dir = new URL('./', import.meta.url);
  for (const f of readdirSync(dir).filter((n) => /\.tsx?$/.test(n) && !n.endsWith('.test.ts'))) {
    const src = readFileSync(new URL(f, dir), 'utf8');
    assert.doesNotMatch(src, /getComputedStyle|var\(--|data-theme|prefers-color-scheme|matchMedia/, `${f} reads the page's theme`);
  }
  // a document: white paper and ink, the light :root values (the dark layer comes later in tokens.css)
  assert.equal(COLOR.sheet, '#ffffff');
  assert.equal(COLOR.ink, '#181818');
});

test('the PDF colours match src/styles/tokens.css', () => {
  const css = readFileSync(new URL('../styles/tokens.css', import.meta.url), 'utf8');
  for (const [key, token] of Object.entries(TOKEN_OF)) {
    const at = css.indexOf(`  ${token}: #`);
    assert.ok(at >= 0, `${token} not found as a hex value in tokens.css`);
    const hex = /#[0-9a-fA-F]{6}/.exec(css.slice(at))![0];
    assert.equal(COLOR[key as keyof typeof COLOR].toLowerCase(), hex.toLowerCase(), `${key} drifted from ${token}`);
  }
});
