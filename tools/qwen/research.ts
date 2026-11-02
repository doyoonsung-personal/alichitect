// Deep research through Qwen: the Responses API with long reasoning and Model Studio's web_search tool, the setup the
// 8AI news routine uses for its research beats. For multi-source research briefs that Claude then verifies; quick
// one-fact lookups stay with search.ts.
//
//   node tools/qwen/research.ts --prompt-file brief.md --out report.md [--effort xhigh] [--min-searches 3]
//   node tools/qwen/research.ts --batch briefs.jsonl [--out-dir dir] [--concurrency 3] [--force]
//
// Batch files hold one JSON task per line: {"id", "prompt" or "promptFile", "instructions"?, "out"?, "effort"?, "minSearches"?}.
// Thinking at effort xhigh plus searches runs for minutes, so every call is streamed. Qwen sometimes answers from
// memory after zero searches (tool_choice is accepted but ignored); such answers are re-asked. Long research streams
// drop now and then; those are retried. The report gets the searches run and the source URLs appended.
// Results lean towards the China site (aliyun.com): confirm international availability on alibabacloud.com.
// Reads DASHSCOPE_API_KEY from the environment and never prints it. Usage goes to tools/qwen/usage.jsonl.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { costOf } from '../../packages/core/src/pricing.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const USAGE_LOG = path.join(HERE, 'usage.jsonl');
const BASE_URL = process.env.QWEN_BASE_URL ?? 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';
const MODEL = 'qwen3.8-max';
const EFFORTS = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'];

const INSTRUCTIONS = [
  'You are a careful research analyst. Search the web several times from different angles before answering, and answer only from what you find.',
  'Your own knowledge of products, prices and model names may be out of date: never state such a fact unless a search result supports it.',
  'Cite the source URL right after every fact, in brackets. Prefer primary sources (official docs, product pages, vendor engineering blogs, papers) over news and blogs.',
  'For Alibaba Cloud, prefer the international site (alibabacloud.com) and say when a fact comes only from the China site (aliyun.com), because availability and prices differ.',
  'Mark anything you could not confirm as "unconfirmed". Write in English, in Markdown.',
].join(' ');

interface Task { id?: string; prompt?: string; promptFile?: string; instructions?: string; out?: string; effort?: string; minSearches?: number }
interface Usage { prompt_tokens: number; cached_tokens: number; completion_tokens: number; reasoning_tokens: number; cost_usd: number | null }
interface Result { text: string; queries: string[]; sources: string[]; usage: Usage; ms: number; truncated: string | null }

class RetryableError extends Error {}

// Model Studio's content filter blocks the same input again on a retry, so a block is final.
const BLOCKED = /data_inspection|inspection_failed|moderation|inappropriate content/i;
const retryable = (msg: string) => (BLOCKED.test(msg) ? new Error('blocked by the content filter: ' + msg) : new RetryableError(msg));
const MAX_OUTPUT_TOKENS = Number(process.env.QWEN_RESEARCH_MAX_OUTPUT ?? 65_536);
const OVERALL_MIN = Number(process.env.QWEN_RESEARCH_TIMEOUT_MIN ?? 75);
const SEARCH_FEE_USD = 10 / 1000;

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const args: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) args[a.slice(2)] = true;
    else { args[a.slice(2)] = next; i++; }
  }
  return args;
}

async function respondOnce(key: string, instructions: string, input: string, effort: string): Promise<Result> {
  const t0 = performance.now();
  const ctrl = new AbortController();
  // Reasoning streams can sit quiet between search rounds, so the idle limit is generous; the overall cap stops a hung call.
  // xhigh briefs ran 25-29 min with about 230 searches on 2026-11-02, so a 30 min cap cut the larger ones off.
  const overall = setTimeout(() => ctrl.abort(new Error(`no result within ${OVERALL_MIN} min`)), OVERALL_MIN * 60_000);
  let idle = setTimeout(() => ctrl.abort(new Error('no first byte within 90 s')), 90_000);
  const bump = () => {
    clearTimeout(idle);
    idle = setTimeout(() => ctrl.abort(new Error('stream idle for 5 min')), 5 * 60_000);
  };
  let final: Record<string, any> | null = null;
  try {
    const res = await fetch(BASE_URL + '/responses', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, instructions, input, reasoning: { effort }, tools: [{ type: 'web_search' }], max_output_tokens: MAX_OUTPUT_TOKENS, stream: true }),
    });
    if (!res.ok) {
      const msg = `HTTP ${res.status}: ${(await res.text()).slice(0, 400)}`;
      throw res.status === 429 || res.status >= 500 ? retryable(msg) : new Error(msg);
    }
    const reader = res.body!.getReader();
    const dec = new TextDecoder();
    let buf = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      bump();
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (!line.startsWith('data:')) continue;
        let j;
        try { j = JSON.parse(line.slice(5)); } catch { continue; }
        if (j.type === 'response.completed' || j.type === 'response.failed' || j.type === 'response.incomplete') final = j.response;
        else if (j.type === 'error') throw retryable('stream error: ' + (j.error?.code ?? '') + ' ' + (j.error?.message ?? j.message ?? 'unknown'));
      }
    }
  } catch (e) {
    if (e instanceof RetryableError || BLOCKED.test((e as Error).message)) throw e;
    if (ctrl.signal.aborted) throw new RetryableError(String((ctrl.signal.reason as Error)?.message ?? e));
    if (e instanceof TypeError) throw new RetryableError(`network: ${e.message}`); // fetch failed, DNS, reset
    throw e;
  } finally {
    clearTimeout(idle);
    clearTimeout(overall);
  }
  if (!final) throw new RetryableError('stream ended without a result');
  const detail = JSON.stringify(final.error ?? final.incomplete_details ?? {}).slice(0, 300);
  if (final.status === 'failed') throw retryable(`response failed: ${detail}`);

  const out: Result = { text: '', queries: [], sources: [], usage: { prompt_tokens: 0, cached_tokens: 0, completion_tokens: 0, reasoning_tokens: 0, cost_usd: null }, ms: 0, truncated: null };
  const seen = new Set<string>();
  for (const item of final.output ?? []) {
    if (item.type === 'web_search_call' && item.action) {
      for (const q of item.action.queries ?? [item.action.query]) if (q) out.queries.push(q);
      for (const s of item.action.sources ?? []) if (s?.url && !seen.has(s.url)) { seen.add(s.url); out.sources.push(s.url); }
    }
    if (item.type === 'message') for (const c of item.content ?? []) if (c.type === 'output_text') out.text += c.text;
  }
  // An incomplete answer (usually the output limit, reasoning included) hits the same limit on a re-run, so keep what came.
  if (final.status !== 'completed') {
    if (!out.text.trim()) throw new RetryableError(`response ${final.status} with no text: ${detail}`);
    out.truncated = `${final.status}: ${detail}`;
  }
  const u = final.usage ?? {};
  out.usage.prompt_tokens = u.input_tokens ?? 0;
  out.usage.cached_tokens = u.input_tokens_details?.cached_tokens ?? 0;
  out.usage.completion_tokens = u.output_tokens ?? 0;
  out.usage.reasoning_tokens = u.output_tokens_details?.reasoning_tokens ?? 0;
  // Tokens plus the web_search fee: $10 per 1,000 calls in Singapore (model-studio/web-search, checked 2026-11-02).
  // Only searches that return results are billed, so counting every query is a slight overstatement.
  out.usage.cost_usd = costOf(MODEL, { prompt_tokens: out.usage.prompt_tokens, completion_tokens: out.usage.completion_tokens, prompt_tokens_details: { cached_tokens: out.usage.cached_tokens } })
    + out.queries.length * SEARCH_FEE_USD;
  out.ms = Math.round(performance.now() - t0);
  return out;
}

async function research(task: Task, label: string): Promise<Result> {
  const key = process.env.DASHSCOPE_API_KEY;
  if (!key) throw new Error('DASHSCOPE_API_KEY is not set');
  const prompt = task.prompt ?? (task.promptFile ? readFileSync(task.promptFile, 'utf8') : '');
  if (!prompt.trim()) throw new Error('empty prompt');
  const effort = task.effort ?? 'xhigh';
  if (!EFFORTS.includes(effort)) throw new Error(`effort must be one of ${EFFORTS.join(', ')}`);
  const min = task.minSearches ?? 3;
  const instructions = task.instructions ? INSTRUCTIONS + '\n\n' + task.instructions : INSTRUCTIONS;
  let input = prompt, r: Result | null = null;
  for (let round = 1; round <= 3; round++) {
    for (let attempt = 1; ; attempt++) {
      try {
        r = await respondOnce(key, instructions, input, effort);
        appendFileSync(USAGE_LOG, JSON.stringify({ ts: new Date().toISOString(), label, model: MODEL, ms: r.ms, ...r.usage, effort, searches: r.queries.length, research: true, ...(r.truncated ? { truncated: true } : {}) }) + '\n');
        break;
      } catch (e) {
        if (!(e instanceof RetryableError) || attempt >= 5) throw e;
        const wait = 15_000 * 2 ** (attempt - 1);
        process.stderr.write(`[qwen-research] ${label}: ${(e as Error).message}; retrying in ${wait / 1000} s\n`);
        await new Promise((res) => setTimeout(res, wait));
      }
    }
    if (r!.queries.length >= min) return r!;
    process.stderr.write(`[qwen-research] ${label}: answered after ${r!.queries.length} searches (need ${min}); asking again\n`);
    input = prompt + `\n\nYou answered after only ${r!.queries.length} web searches. Your memory of these facts may be out of date: run at least ${min} web searches from different angles now, and answer only from what you find.`;
  }
  return r!;
}

function report(r: Result): string {
  const body = (r.truncated ? `> TRUNCATED (${r.truncated}): the answer stops early.\n\n` : '') + r.text.trimEnd();
  const q = r.queries.map((x) => `- ${x}`).join('\n') || '- (none)';
  const s = r.sources.map((x) => `- ${x}`).join('\n') || '- (none returned)';
  return `${body}\n\n---\n\n## Searches run (${r.queries.length})\n\n${q}\n\n## Sources returned by search (${r.sources.length})\n\n${s}\n`;
}

function summary(label: string, r: Result): string {
  const u = r.usage;
  const cost = u.cost_usd === null ? 'cost n/a' : `$${u.cost_usd.toFixed(4)}`;
  return `[qwen-research] ${label}${r.truncated ? ' (TRUNCATED)' : ''} · ${u.prompt_tokens} in (${u.cached_tokens} cached) · ${u.completion_tokens} out (${u.reasoning_tokens} reasoning) · ${r.queries.length} searches · ${r.sources.length} sources · ${cost} · ${(r.ms / 60_000).toFixed(1)} min`;
}

async function runBatch(file: string, outDir: string, concurrency: number, force: boolean): Promise<void> {
  const tasks: Task[] = readFileSync(file, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
  let next = 0, ok = 0, skipped = 0, failed = 0, cost = 0;
  const worker = async () => {
    while (next < tasks.length) {
      const task = tasks[next++];
      const id = task.id ?? `task-${next}`;
      const out = task.out ?? path.join(outDir, `${id}.md`);
      if (!force && existsSync(out)) { skipped++; continue; }
      try {
        const r = await research(task, id);
        mkdirSync(path.dirname(out), { recursive: true });
        writeFileSync(out, report(r));
        cost += r.usage.cost_usd ?? 0;
        ok++;
        process.stderr.write(summary(id, r) + ` -> ${out}\n`);
      } catch (e) {
        failed++;
        process.stderr.write(`[qwen-research] ${id} failed: ${(e as Error).message}\n`);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));
  process.stderr.write(`[qwen-research] batch done: ${ok} ok, ${skipped} skipped (output exists), ${failed} failed, cost (tokens and searches) $${cost.toFixed(3)}\n`);
  if (failed) process.exitCode = 1;
}

const args = parseArgs(process.argv.slice(2));
if (typeof args.batch === 'string') {
  const outDir = typeof args['out-dir'] === 'string' ? args['out-dir'] : path.join(HERE, 'out', path.basename(args.batch, '.jsonl'));
  await runBatch(args.batch, outDir, Number(args.concurrency ?? 3), Boolean(args.force));
} else {
  const task: Task = {
    prompt: typeof args.prompt === 'string' ? args.prompt : undefined,
    promptFile: typeof args['prompt-file'] === 'string' ? args['prompt-file'] : undefined,
    instructions: typeof args.instructions === 'string' ? args.instructions : undefined,
    effort: typeof args.effort === 'string' ? args.effort : undefined,
    minSearches: args['min-searches'] ? Number(args['min-searches']) : undefined,
  };
  if (!task.prompt && !task.promptFile) {
    process.stderr.write('usage: node tools/qwen/research.ts --prompt-file brief.md [--out report.md] [--effort xhigh] [--min-searches 3] [--label name]\n       node tools/qwen/research.ts --batch briefs.jsonl [--out-dir dir] [--concurrency 3] [--force]\n');
    process.exit(2);
  }
  const label = typeof args.label === 'string' ? args.label : 'research';
  try {
    const r = await research(task, label);
    if (typeof args.out === 'string') {
      mkdirSync(path.dirname(path.resolve(args.out)), { recursive: true });
      writeFileSync(args.out, report(r));
    } else process.stdout.write(report(r));
    process.stderr.write(summary(label, r) + (typeof args.out === 'string' ? ` -> ${args.out}` : '') + '\n');
  } catch (e) {
    process.stderr.write(`[qwen-research] ${label} failed: ${(e as Error).message}\n`);
    process.exitCode = 1;
  }
}
