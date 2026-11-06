// Compile and exercise the host after physically removing the optional module in
// a disposable copy. Never edit the active checkout or copy local credentials.
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const source = resolve(fileURLToPath(new URL('..', import.meta.url)));
const moduleName = process.argv[2] ?? 'business-case';
if (!['business-case', 'bd-brief'].includes(moduleName)) throw new Error('Choose business-case or bd-brief');
const capability = moduleName === 'business-case' ? 'businessCase' : 'bdBrief';
const component = moduleName === 'business-case' ? 'BusinessCaseEntry' : 'BdBriefEntry';
const envPrefix = moduleName === 'business-case' ? 'BUSINESS_CASE_' : 'BD_BRIEF_';
const retainedModule = moduleName === 'business-case' ? 'bd-brief' : 'business-case';
const target = mkdtempSync(join(tmpdir(), `alichitect-${moduleName}-removal-`));
console.log(`Removing ${moduleName}; retaining ${retainedModule}. Disposable copy: ${target}`);
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
for (const module of ['business-case', 'bd-brief']) {
  for (const p of [`packages/${module}`, `apps/web/src/features/${module}`, `apps/worker/src/features/${module}`]) addTree(join(source, p));
}
for (const dir of ['apps/worker/test', 'apps/worker/migrations']) {
  for (const name of readdirSync(join(source, dir))) {
    if (/^(?:business-case|bd-brief|bd-discovery|0010_business_case|0011_bd_briefs|0012_bd_discovery)/.test(name)) paths.add(`${dir}/${name}`);
  }
}
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
edit('apps/web/src/shell/Header.tsx', s => s.replace(new RegExp(`^import \\{ ${component} \\}.*\\r?\\n`, 'm'), '').replace(new RegExp(`^\\s*<${component} \\/>\\r?\\n`, 'm'), ''));
edit('apps/web/src/stream/account.ts', s => s.replace(new RegExp(`${capability}\\?: boolean;? ?`), '').replace(new RegExp(`^.*v\\.features\\.${capability}.*\\r?\\n`, 'm'), ''));
edit('apps/web/src/stream/account.test.ts', s => s
  .replace(/\ntest\('combined optional module capabilities[\s\S]*?\n\}\);\r?\n/, '\n')
  .replace(moduleName === 'business-case' ? /\ntest\('optional feature capabilities[\s\S]*?\n\}\);\r?\n/ : /\ntest\('the optional bd-brief capability[\s\S]*?\n\}\);\r?\n/, '\n'));
edit('apps/worker/src/env.ts', s => s.replace(new RegExp(`^.*${envPrefix}\\w+\\?: string;\\r?\\n`, 'gm'), ''));
edit('apps/worker/wrangler.jsonc', s => s.replace(new RegExp(`^.*"${envPrefix}\\w+".*\\r?\\n`, 'gm'), ''));
edit('apps/worker/src/index.ts', s => {
  const withoutImports = s.replace(new RegExp(`^import .*features/${moduleName}/.*\\r?\\n`, 'gm'), '')
    .replace(new RegExp(`^.*\\.\\.\\.\\(${capability}Eligible\\(env, me\\).*\\r?\\n`, 'm'), '');
  return moduleName === 'business-case'
    ? withoutImports.replace(/^  if \(path === '\/api\/features\/business-case'[\s\S]*?^  \}\r?\n/m, '')
    : withoutImports.replace(/^import .*BD_BRIEF_API_PREFIX.*\r?\n/m, '').replace(/^.*if \(path === BD_BRIEF_API_PREFIX.*\r?\n/m, '');
});
if (moduleName === 'bd-brief') {
  edit('apps/web/src/landing/Landing.tsx', s => s.replace(/^import \{ BdBriefEntry \}.*\r?\n/m, '').replace(/^\s*<BdBriefEntry discovery \/>\r?\n/m, ''));
  edit('apps/web/scripts/alias.mjs', s => s.replace(/^.*'@ali\/bd-brief\/'.*\r?\n/m, ''));
  edit('apps/web/vite.config.ts', s => s.replace(/^const bdBrief .*\r?\n/m, '').replace(/,?\s*'@ali\/bd-brief': bdBrief,?/, ''));
  edit('apps/web/tsconfig.json', s => {
    const config = JSON.parse(s);
    delete config.compilerOptions.paths['@ali/bd-brief/*'];
    config.include = config.include.filter(p => !p.includes('bd-brief'));
    return JSON.stringify(config, null, 2) + '\n';
  });
} else {
  // This integration fixture intentionally requires both modules. Keep the
  // independent BD dispatch tests when rehearsing worksheet removal.
  edit('apps/worker/test/bd-brief-seam.test.ts', s => s.replace(/\ntest\('combined trial advertises and serves both modules only to the allowlisted admin'[\s\S]*?\n\}\);\r?\n/, '\n'));
}
edit('package.json', s => {
  const pkg = JSON.parse(s);
  pkg.scripts.test = pkg.scripts.test.replace(` "packages/${moduleName}/test/**/*.test.ts"`, '');
  return JSON.stringify(pkg, null, 2) + '\n';
});
const removedTests = readdirSync(join(target, 'apps/worker/test')).filter(name => name.startsWith(moduleName) || (moduleName === 'bd-brief' && name.startsWith('bd-discovery'))).map(name => `apps/worker/test/${name}`);
// Migrations remain as historical records. Neither module may require dropping its
// tables to detach its code; the other module stays present in this rehearsal.
for (const p of [`packages/${moduleName}`, `apps/web/src/features/${moduleName}`, `apps/worker/src/features/${moduleName}`, ...removedTests]) {
  const dest = resolve(target, p);
  if (!dest.startsWith(resolve(target) + sep)) throw new Error('Unsafe removal target');
  rmSync(dest, { recursive: true, force: true });
}
const checks = [
  ['Web typecheck after removal', 'apps/web', ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json']],
  ['Web production build after removal', 'apps/web', ['node_modules/vite/bin/vite.js', 'build']],
  ['Existing proposal renderer build after removal', 'apps/web', ['scripts/export/build-worker.mjs']],
  ['Worker typecheck after removal', 'apps/worker', ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json']],
  [`Retained ${retainedModule} domain tests`, '.', ['--test', '--test-concurrency=1', `packages/${retainedModule}/test/*.test.ts`]],
  [`Retained ${retainedModule} web tests`, 'apps/web', ['--import', './scripts/alias.mjs', '--test', '--test-concurrency=1', `src/features/${retainedModule}/*.test.ts`]],
  [`Retained ${retainedModule} Worker tests`, 'apps/worker', ['--test', '--test-concurrency=1',
    ...readdirSync(join(target, 'apps/worker/test')).filter(name => name.startsWith(retainedModule) && name.endsWith('.test.ts')).map(name => `test/${name}`)]],
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
