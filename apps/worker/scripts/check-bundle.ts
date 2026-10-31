// Bundles the Worker exactly as `wrangler deploy` would (--dry-run, nothing is uploaded) and checks that no module in
// it imports a Node built-in: the Worker runs without nodejs_compat, so packages/core and apps/server code it pulls in
// must stay browser-safe (fetch, Web Crypto, streams). Prints every repo module in the bundle and the bundle size.
//   node scripts/check-bundle.ts            (npm run check:bundle; needs apps/web/dist, which wrangler uploads as assets)
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = path.join(ROOT, '.wrangler', 'check');
const env: NodeJS.ProcessEnv = { ...process.env, WRANGLER_SEND_METRICS: 'false' };
// a dry run needs no account: never hand it credentials
for (const k of ['CLOUDFLARE_API_KEY', 'CLOUDFLARE_EMAIL', 'CLOUDFLARE_API_TOKEN']) delete env[k];
const bin = path.join(ROOT, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
execFileSync(process.execPath, [bin, 'deploy', '--dry-run', '--env=', '--outdir', OUT, '--metafile', path.join(OUT, 'meta.json')], { cwd: ROOT, env, stdio: ['ignore', 'ignore', 'inherit'] });

const meta = JSON.parse(readFileSync(path.join(OUT, 'meta.json'), 'utf8')) as { inputs: Record<string, { imports?: Array<{ path: string; external?: boolean }> }> };
const NODE = /^node:|^(fs|path|os|crypto|http|https|net|tls|url|child_process|stream|buffer|util|zlib)(\/|$)/;
const bad: string[] = [];
const repo: string[] = [];
for (const [file, info] of Object.entries(meta.inputs)) {
  if (!file.includes('node_modules')) repo.push(file.split(path.sep).join('/'));
  for (const im of info.imports ?? []) if (NODE.test(im.path)) bad.push(`${file} imports ${im.path}`);
}
const shared = repo.filter((f) => !f.startsWith('src/'));
console.log(`modules from packages/core and apps/server in the Worker (${shared.length}):\n  ${shared.join('\n  ')}`);
console.log(`bundle: ${(statSync(path.join(OUT, 'index.js')).size / 1024).toFixed(0)} KiB (before gzip)`);
if (bad.length) {
  console.error(`NOT Workers-compatible:\n  ${bad.join('\n  ')}`);
  process.exit(1);
}
console.log('no Node built-in imports: Workers-compatible');
