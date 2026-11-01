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

test('the coding tool\'s product name passes; model ids and the vendor fail, even right beside it', () => {
  // the product the catalog lists compatibility with: allowed in text, in any case, as UTF-16, and in a data file
  const PRODUCT = `${W1} Code`;
  for (const [rel, body] of [
    ['assets/index-abc.js', `const s = "Works with ${PRODUCT} and Qoder"`],
    ['assets/catalog-abc.js', `{"note":"${PRODUCT.toLowerCase()} and ${W1}-Code both read the rules file"}`],
    ['index.html', `<p>${PRODUCT.toUpperCase()}</p>`],
  ] as const) {
    const r = run({ 'index.html': '<!doctype html>', [rel]: body });
    assert.equal(r.code, 0, `${rel}: ${r.out}`);
  }
  assert.equal(run({ 'assets/x.woff2': Buffer.from(`compatible with ${PRODUCT}`, 'utf16le') }).code, 0, 'UTF-16 product name');
  // what would reveal the backend: a model id, a model family name, the vendor (alone, in a provider id, or crediting the product)
  const lower = W1.toLowerCase();
  for (const body of [
    `${lower}-sonnet-4-5`,
    `${lower}-opus-4-1-20250805`,
    `${lower}-3-5-haiku-20241022`,
    `us.${W2}.${lower}-sonnet-4-20250514-v1:0`,
    `${W1} Opus`,
    `${W1}, the model`,
    `${PRODUCT} by ${W2.toUpperCase()}`,
    `model: "${lower}"`,
  ]) {
    const r = run({ 'index.html': '<!doctype html>', 'assets/index-abc.js': `const m = ${JSON.stringify(body)}` });
    assert.equal(r.code, 1, `should fail: ${body}`);
  }
  assert.equal(run({ 'assets/x.wasm': Buffer.from(`${lower}-sonnet-4`, 'utf16le') }).code, 1, 'UTF-16 model id');
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
