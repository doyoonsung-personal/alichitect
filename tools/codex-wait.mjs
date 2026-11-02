// Waits for Codex companion background jobs to finish and saves each one's result as Markdown.
//   node tools/codex-wait.mjs <out-dir> <name>=<job-id> [<name>=<job-id> ...]
// Run it with run_in_background: it exits when every job has finished, failed or been cancelled, which is the signal.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const COMPANION = 'C:/Users/mendo/.claude/plugins/cache/openai-codex/codex/1.0.6/scripts/codex-companion.mjs';
const [outDir, ...pairs] = process.argv.slice(2);
const jobs = pairs.map((p) => { const [name, id] = p.split('='); return { name, id, done: false }; });
mkdirSync(outDir, { recursive: true });

const run = (args) => execFileSync(process.execPath, [COMPANION, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 });

for (;;) {
  for (const j of jobs.filter((x) => !x.done)) {
    let status = 'unknown';
    try { status = JSON.parse(run(['status', j.id, '--json'])).job?.status ?? 'unknown'; } catch { continue; }
    if (status === 'running' || status === 'queued' || status === 'unknown') continue;
    j.done = true;
    let text = '';
    try { text = run(['result', j.id]); } catch (e) { text = `(could not read the result: ${e.message})`; }
    writeFileSync(path.join(outDir, `${j.name}.md`), text);
    console.log(`${new Date().toISOString()} ${j.name} ${status} -> ${path.join(outDir, `${j.name}.md`)} (${text.length} chars)`);
  }
  if (jobs.every((x) => x.done)) break;
  await new Promise((r) => setTimeout(r, 60_000));
}
