// Checks the production build (npm run build -> dist/) before it is deployed as the Worker's static assets:
//  1. none of the test and demo tools is in it (src/app/tools.ts): no window.__ab handle, no routing log, none of the
//     synthetic replay sessions (stub-*, asks-*, chinese-fix), and no ?replay= / ?speed= switch;
//  2. it fits Workers static-asset limits: at most 20,000 files (the Free plan; Paid allows 100,000) and 25 MiB a file.
// Prints the file count, the total size and the largest files. Exits 1 on a finding.
//   node scripts/check-dist.mjs [dist-dir]
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = path.resolve(process.argv[2] ?? fileURLToPath(new URL('../dist', import.meta.url)));
const MAX_FILES = 20_000;
const MAX_FILE = 25 * 1024 * 1024;

const files = [];
(function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else files.push({ p, rel: path.relative(DIST, p).split(path.sep).join('/'), size: statSync(p).size });
  }
})(DIST);

const findings = [];
for (const f of files) {
  if (/(^|\/)(stub-|asks-|chinese-fix)[\w-]*\.js$/.test(f.rel)) findings.push(`${f.rel}: a synthetic replay session is in the build`);
  if (f.size > MAX_FILE) findings.push(`${f.rel}: ${(f.size / 1048576).toFixed(1)} MiB is over the 25 MiB file limit`);
  if (/\.(js|mjs|html)$/.test(f.rel)) {
    const text = readFileSync(f.p, 'utf8');
    if (/__ab(Canvas)?\b/.test(text)) findings.push(`${f.rel}: window.__ab handle`);
    if (/["'`]replay["'`]\s*\)/.test(text) && /["'`]speed["'`]\s*\)/.test(text)) findings.push(`${f.rel}: ?replay= and ?speed= switches`);
  }
}
if (files.length > MAX_FILES) findings.push(`${files.length} files is over the ${MAX_FILES} file limit`);

const total = files.reduce((n, f) => n + f.size, 0);
const big = [...files].sort((a, b) => b.size - a.size).slice(0, 3).map((f) => `${f.rel} ${(f.size / 1024).toFixed(0)} KiB`);
process.stdout.write(`dist: ${files.length} files, ${(total / 1048576).toFixed(1)} MiB (limits: ${MAX_FILES} files on Free, 100000 on Paid; 25 MiB a file). Largest: ${big.join('; ')}\n`);
if (findings.length) {
  process.stdout.write(findings.map((x) => `FAIL ${x}\n`).join(''));
  process.exit(1);
}
process.stdout.write('dist: no test or demo tools in the build\n');
