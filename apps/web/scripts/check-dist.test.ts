// check-dist.mjs fails the build when the production bundle shows that a second model vendor is involved (the owner's
// decision) or when a source map ships. This drives the script over small fake dist folders.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(new URL('./check-dist.mjs', import.meta.url));
// assembled so this file stays clean for the very check it tests
const W1 = 'Cl' + 'aude';
const W2 = 'anth' + 'ropic';

function run(files: Record<string, string | Buffer>): { code: number; out: string } {
  const dir = mkdtempSync(path.join(tmpdir(), 'check-dist-'));
  for (const [rel, body] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    writeFileSync(path.join(dir, rel), body);
  }
  try {
    return { code: 0, out: execFileSync(process.execPath, [SCRIPT, dir], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) };
  } catch (e) {
    const x = e as { status?: number; stdout?: string };
    return { code: x.status ?? 1, out: x.stdout ?? '' };
  }
}

test('a clean build passes', () => {
  const r = run({ 'index.html': '<!doctype html><title>Architecture Builder</title>', 'assets/index-abc.js': 'console.log("Qwen is reading the brief")' });
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /no hidden word/);
});

test('the vendor name fails the build in a script, a stylesheet, a page, a data file, any case', () => {
  for (const [rel, body] of [
    ['assets/index-abc.js', `const s = "Finished by ${W1}"`],
    ['assets/app.css', `/* ${W1.toUpperCase()} */ a{}`],
    ['index.html', `<title>${W2}</title>`],
    ['assets/data.json', `{"x":"${W1.toLowerCase()}"}`],
  ] as const) {
    const r = run({ 'index.html': '<!doctype html>', [rel]: body });
    assert.equal(r.code, 1, rel);
    assert.match(r.out, new RegExp(`FAIL ${rel.replace('.', '\.')}`));
  }
});

test('a binary asset and a file name are scanned too, as UTF-16 text as well', () => {
  assert.equal(run({ 'assets/x.wasm': Buffer.concat([Buffer.from([0, 1, 2]), Buffer.from(W1, 'latin1'), Buffer.from([3])]) }).code, 1);
  assert.equal(run({ 'assets/x.woff2': Buffer.from(W2, 'utf16le') }).code, 1);
  assert.equal(run({ [`assets/${W1.toLowerCase()}-chunk.js`]: 'x' }).code, 1);
});

test('a source map or a sourceMappingURL fails the build', () => {
  assert.equal(run({ 'assets/index.js.map': '{}' }).code, 1);
  assert.equal(run({ 'assets/index.js': '//# sourceMappingURL=index.js.map' }).code, 1);
});
