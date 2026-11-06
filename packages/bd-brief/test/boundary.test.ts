// Import-boundary guard (plan §4 dependency rules, §11 removability): no existing
// platform module may import bd-brief except the module's own feature directories
// and the small allowlisted host composition points. Also asserts this package's
// src/ stays dependency-free: no react, no node built-ins, no @ali/core, no imports
// reaching outside the package.

import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const REPO_ROOT = join(fileURLToPath(import.meta.url), '..', '..', '..', '..');

const WALK_DIRS = ['apps/web/src', 'apps/worker/src', 'packages/core/src', 'apps/server/src', 'eval'];
const SKIP_DIRS = new Set(['node_modules', 'dist', '.wrangler']);

/** Directories that legitimately reference bd-brief (the module itself). */
const FEATURE_PREFIXES = ['apps/web/src/features/bd-brief/', 'apps/worker/src/features/bd-brief/', 'packages/bd-brief/'];
/** Host composition points the coordinator owns (plan §3 seams). They may or may
 * not contain the import yet; the test only rejects UNALLOWED imports. */
const ALLOWLIST_FILES = new Set([
  'apps/web/src/shell/Header.tsx',
  'apps/web/src/landing/Landing.tsx', // first-meeting entry, before architecture discovery
  'apps/worker/src/index.ts',
  'apps/web/vite.config.ts',
  'apps/web/scripts/alias.mjs',
]);

function walk(dir: string, out: string[]): void {
  if (!existsSync(dir)) return; // a missing source dir is not a boundary violation
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (st.isFile() && /\.(ts|tsx)$/.test(entry)) out.push(full);
  }
}

function toRepoPosix(abs: string): string {
  return relative(REPO_ROOT, abs).split(sep).join('/');
}

/** Static import/export/require specifiers that mention bd-brief. */
const BD_BRIEF_IMPORT = /(?:\bfrom\s*|\bimport\s*|\brequire\s*\(\s*|\bimport\s*\(\s*)['"][^'"]*bd-brief[^'"]*['"]/;

test('no platform file outside the allowlist imports bd-brief', () => {
  const files: string[] = [];
  for (const d of WALK_DIRS) walk(join(REPO_ROOT, d), files);
  assert.ok(files.length > 0, 'boundary walk must actually see source files');
  const violations: string[] = [];
  for (const f of files) {
    const rel = toRepoPosix(f);
    if (FEATURE_PREFIXES.some((p) => rel.startsWith(p))) continue;
    if (ALLOWLIST_FILES.has(rel)) continue;
    if (BD_BRIEF_IMPORT.test(readFileSync(f, 'utf8'))) violations.push(rel);
  }
  assert.deepEqual(violations, [], `bd-brief must not be imported from: ${violations.join(', ')}`);
});

test('allowlisted seams are the only non-feature places a bd-brief import may appear', () => {
  // Guard the guard: the allowlist must stay the small composition-point set from
  // the plan, so a future edit cannot quietly widen it to whole directories.
  assert.equal(ALLOWLIST_FILES.size, 5);
  for (const f of ALLOWLIST_FILES) assert.ok(!f.includes('*'));
});

test('packages/bd-brief/src stays dependency-free and self-contained', () => {
  const srcDir = join(REPO_ROOT, 'packages/bd-brief/src');
  const files: string[] = [];
  walk(srcDir, files);
  assert.ok(files.length >= 6, 'expected the module source files to exist');
  const SPECIFIER = /(?:\bfrom\s*|\bimport\s*|\brequire\s*\(\s*|\bimport\s*\(\s*)['"]([^'"]+)['"]/g;
  const violations: string[] = [];
  for (const f of files) {
    const rel = toRepoPosix(f);
    const text = readFileSync(f, 'utf8');
    for (const m of text.matchAll(SPECIFIER)) {
      const spec = m[1];
      if (spec.startsWith('./')) {
        // relative imports must stay inside the package and use the .ts convention
        if (spec.includes('..')) violations.push(`${rel}: escapes the package via ${spec}`);
        else if (!spec.endsWith('.ts')) violations.push(`${rel}: relative import without .ts extension: ${spec}`);
      } else {
        // no bare specifiers at all: no react, no node:*, no @ali/core, no npm deps
        violations.push(`${rel}: external import ${spec}`);
      }
    }
  }
  assert.deepEqual(violations, [], violations.join('\n'));
});

test('packages/bd-brief/src uses no node built-ins even without import syntax', () => {
  const srcDir = join(REPO_ROOT, 'packages/bd-brief/src');
  const files: string[] = [];
  walk(srcDir, files);
  for (const f of files) {
    const text = readFileSync(f, 'utf8');
    assert.ok(!/\bprocess\.(env|exit|cwd)/.test(text), `${toRepoPosix(f)} must not read process globals`);
    assert.ok(!/\brequire\s*\(\s*['"]node:/.test(text), `${toRepoPosix(f)} must not require node built-ins`);
  }
});
