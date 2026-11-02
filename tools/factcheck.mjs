// Fact-check pass for research reports: Qwen Flash extracts the claims, then GPT (Codex, live web, read-only) checks them
// against the cited pages, grouped by page so each page is opened once.
//   node tools/factcheck.mjs <round> <report.md> [<report.md> ...] [--jobs 4] [--medium-cap 20]
// Writes research/ai-workflows/claims/<report>.json, research/ai-workflows/verify/<round>-N.prompt.md and
// research/ai-workflows/verify/<round>.jobs (name=job-id pairs for tools/codex-wait.mjs). Prints nothing secret.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const COMPANION = 'C:/Users/mendo/.claude/plugins/cache/openai-codex/codex/1.0.6/scripts/codex-companion.mjs';
const DIR = 'research/ai-workflows';
const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(name); if (i < 0) return dflt; const v = args[i + 1]; args.splice(i, 2); return Number(v); };
const JOBS = opt('--jobs', 4);
const MEDIUM_CAP = opt('--medium-cap', 20);
const [round, ...reports] = args;
if (!round || !reports.length) { console.error('usage: node tools/factcheck.mjs <round> <report.md> ... [--jobs 4] [--medium-cap 20]'); process.exit(2); }
mkdirSync(`${DIR}/claims`, { recursive: true });
mkdirSync(`${DIR}/verify`, { recursive: true });

// 1. Extract claims with Qwen Flash (one batch, skips reports already extracted).
const tmp = path.join(os.tmpdir(), `factcheck-${round}`);
mkdirSync(tmp, { recursive: true });
const ids = reports.map((r) => path.basename(r, '.md'));
const tasks = [];
reports.forEach((r, i) => {
  const out = `${DIR}/claims/${ids[i]}.json`;
  if (existsSync(out)) return;
  const body = readFileSync(r, 'utf8').split(/^## Searches run/m)[0];
  const f = path.join(tmp, `${ids[i]}.body.md`);
  writeFileSync(f, body);
  tasks.push(JSON.stringify({ id: `claims-${ids[i]}`, prompt: readFileSync(`${DIR}/extract-claims.md`, 'utf8'), files: [f], out, model: 'qwen3.8-flash', json: true, maxTokens: 24000 }));
});
if (tasks.length) {
  const batch = path.join(tmp, 'claims.jsonl');
  writeFileSync(batch, tasks.join('\n') + '\n');
  execFileSync(process.execPath, ['tools/qwen/ask.ts', '--batch', batch, '--concurrency', '4'], { stdio: 'inherit' });
}

// 2. Pick the claims to check: every high-weight claim, plus up to MEDIUM_CAP medium ones per report that cite a URL.
const picked = [];
ids.forEach((id) => {
  const f = `${DIR}/claims/${id}.json`;
  if (!existsSync(f)) { console.error(`no claims for ${id}`); return; }
  const claims = JSON.parse(readFileSync(f, 'utf8')).claims ?? [];
  const tag = id.split('-').map((p) => p.replace(/[^a-z0-9]/gi, '').slice(0, 3)).join('');
  const high = claims.filter((c) => c.weight === 'high');
  const medium = claims.filter((c) => c.weight !== 'high' && c.url).slice(0, MEDIUM_CAP);
  for (const c of [...high, ...medium]) picked.push({ ...c, id: `${tag}-${String(c.id).replace(/^c/, '')}`, url: c.url || '(no URL cited)' });
});

// 3. Group by page and pack page groups into prompts of similar size. The verify prompt allows 30 page opens per job,
//    fallback searches included, so a job gets at most PAGE_CAP cited pages and more jobs are added when needed.
const PAGE_CAP = 24;
const groups = {};
for (const c of picked) (groups[c.url] ??= []).push(c);
const nJobs = Math.max(JOBS, Math.ceil(Object.keys(groups).length / PAGE_CAP));
const slots = Array.from({ length: nJobs }, () => ({ pages: 0, claims: [] }));
for (const [, cs] of Object.entries(groups).sort((a, b) => b[1].length - a[1].length)) {
  slots.sort((a, b) => a.pages - b.pages || a.claims.length - b.claims.length);
  slots[0].pages++;
  slots[0].claims.push(...cs);
}
const buckets = slots.map((s) => s.claims);
const header = readFileSync(`${DIR}/verify-prompt.md`, 'utf8');
const pairs = [];
buckets.forEach((b, i) => {
  if (!b.length) return;
  const byUrl = {};
  for (const c of b) (byUrl[c.url] ??= []).push(c);
  const body = Object.entries(byUrl).map(([url, cs]) => `\nPage: ${url}\n` + cs.map((c) => `- ${c.id}: ${c.claim}`).join('\n')).join('\n');
  const name = `${round}-${i + 1}`;
  const file = `${DIR}/verify/${name}.prompt.md`;
  writeFileSync(file, header.replace('Another model researched Alibaba Cloud facts', 'Another model researched facts') + body + '\n');
  const out = execFileSync(process.execPath, [COMPANION, 'task', '--background', '--effort', 'medium', '--prompt-file', file], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  const job = (out.match(/task-[a-z0-9]+-[a-z0-9]+/) || [])[0];
  console.log(`${name}: ${b.length} claims, ${Object.keys(byUrl).length} pages -> ${job ?? 'NOT STARTED'}`);
  if (job) pairs.push(`${name}=${job}`);
});
writeFileSync(`${DIR}/verify/${round}.jobs`, pairs.join(' ') + '\n');
console.log(`${picked.length} claims from ${ids.length} reports; jobs in ${DIR}/verify/${round}.jobs`);
