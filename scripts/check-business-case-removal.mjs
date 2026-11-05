// Compile and exercise the host after physically removing the optional module in
// a disposable copy. Never edit the active checkout or copy local credentials.
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const source = resolve(fileURLToPath(new URL('..', import.meta.url)));
const target = mkdtempSync(join(tmpdir(), 'alichitect-business-case-removal-'));
const paths = new Set(execFileSync('git', ['ls-files', '-z'], { cwd: source, encoding: 'utf8' }).split('\0').filter(Boolean));
// Include the module while it is being developed, before it has been staged.
function addTree(root) {
  if (!existsSync(root)) return;
  for (const e of readdirSync(root, { withFileTypes: true })) {
    const p = join(root, e.name);
    if (e.isDirectory() && e.name !== 'node_modules') addTree(p);
    else if (e.isFile()) paths.add(relative(source, p).split(sep).join('/'));
  }
}
for (const p of ['packages/business-case', 'apps/web/src/features/business-case', 'apps/worker/src/features/business-case']) addTree(join(source, p));
for (const p of ['apps/worker/test/business-case.test.ts', 'apps/worker/migrations/0010_business_case.sql']) if (existsSync(join(source, p))) paths.add(p);
for (const p of paths) {
  if (!/^(?:apps\/|packages\/|eval\/|package\.json$)/.test(p) || /(?:^|\/)(?:node_modules|\.env[^/]*|\.dev\.vars[^/]*)(?:\/|$)/.test(p)) continue;
  const src = join(source, p), dest = join(target, p);
  if (!existsSync(src) || !lstatSync(src).isFile()) continue;
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
}
for (const p of ['node_modules', 'apps/web/node_modules', 'apps/worker/node_modules', 'apps/server/node_modules', 'packages/core/node_modules']) {
  if (existsSync(join(source, p))) {
    mkdirSync(dirname(join(target, p)), { recursive: true });
    symlinkSync(join(source, p), join(target, p), process.platform === 'win32' ? 'junction' : 'dir');
  }
}
function edit(file, replace) {
  const path = join(target, file), before = readFileSync(path, 'utf8'), after = replace(before);
  if (before === after) throw new Error(`Removal hook did not match: ${file}`);
  writeFileSync(path, after);
}
edit('apps/web/src/shell/Header.tsx', s => s.replace(/^import \{ BusinessCaseEntry \}.*\r?\n/m, '').replace(/^\s*<BusinessCaseEntry \/>\r?\n/m, ''));
edit('apps/web/src/stream/account.ts', s => s.replace(/^\s*\/\*\* Optional capabilities:.*\r?\n\s*features\?:.*\r?\n/m, '').replace(/^\s*features: \{ businessCase:.*\r?\n/m, ''));
edit('apps/web/src/stream/account.test.ts', s => s.replace(/\ntest\('optional feature capabilities[\s\S]*?\n\}\);\r?\n/, '\n'));
edit('apps/worker/src/env.ts', s => s.replace(/^\s*\/\*\* Optional isolated business-case.*\r?\n\s*BUSINESS_CASE_ENABLED\?: string;\r?\n/m, ''));
edit('apps/worker/src/index.ts', s => s.replace(/^import \{ businessCaseEnabled \}.*\r?\n/m, '').replace(/^\s*\.\.\.\(businessCaseEnabled\(env\).*\r?\n/m, '')
  .replace(/^  if \(path === '\/api\/features\/business-case'[\s\S]*?^  \}\r?\n/m, ''));
edit('package.json', s => {
  const pkg = JSON.parse(s);
  pkg.scripts.test = pkg.scripts.test.replace(' "packages/business-case/test/**/*.test.ts"', '');
  return JSON.stringify(pkg, null, 2) + '\n';
});
for (const p of ['packages/business-case', 'apps/web/src/features/business-case', 'apps/worker/src/features/business-case', 'apps/worker/test/business-case.test.ts']) {
  const dest = resolve(target, p);
  if (!dest.startsWith(resolve(target) + sep)) throw new Error('Unsafe removal target');
  rmSync(dest, { recursive: true, force: true });
}
const checks = [
  ['Web typecheck after removal', 'apps/web', ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json']],
  ['Web production build after removal', 'apps/web', ['node_modules/vite/bin/vite.js', 'build']],
  ['Existing proposal renderer build after removal', 'apps/web', ['scripts/export/build-worker.mjs']],
  ['Worker typecheck after removal', 'apps/worker', ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json']],
  ['Host account, routes, pricing, proposals and MCP after removal', 'apps/worker', ['--test', '--test-concurrency=1', 'test/routes.test.ts', 'test/pricing.test.ts', 'test/proposal.test.ts', 'test/mcp.test.ts', 'test/mcp-workshop.test.ts']],
];
for (const [label, cwd, args] of checks) {
  try {
    const output = execFileSync(process.execPath, args, { cwd: join(target, cwd), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const count = output.match(/# tests \d+/)?.[0];
    console.log(`PASS ${label}${count ? ` (${count})` : ''}`);
  } catch (e) {
    console.error(`FAIL ${label}\n${e.stdout ?? ''}\n${e.stderr ?? ''}\nCopy retained at ${target}`);
    process.exitCode = 1;
    break;
  }
}
console.log(`Disposable removal rehearsal retained at ${target}`);
