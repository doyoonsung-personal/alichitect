// Offload helper: send a well-specified task to Qwen on Model Studio and save the answer.
//
//   node tools/qwen/ask.ts --prompt-file task.md [--files a.ts,b.md] [--system-file sys.md] [--out draft.ts] [--code]
//   node tools/qwen/ask.ts --model qwen3.8-flash --json --prompt "..."
//   node tools/qwen/ask.ts --batch tasks.jsonl [--out-dir dir] [--concurrency 4] [--force]
//   node tools/qwen/ask.ts --usage
//
// Batch files hold one JSON task per line: {"id", "prompt", "system"?, "files"?, "out"?, "model"?, "json"?, "think"?, "code"?}.
// Defaults: qwen3.8-max, thinking off (its default thinking runs for minutes), streamed, retries with backoff.
// Usage and cost go to tools/qwen/usage.jsonl. Reads DASHSCOPE_API_KEY from the environment and never prints it.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { costOf } from '../../packages/core/src/pricing.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const USAGE_LOG = path.join(HERE, 'usage.jsonl');
const BASE_URL = process.env.QWEN_BASE_URL ?? 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';
const DEFAULT_MODEL = 'qwen3.8-max';

// Prices come from packages/core/src/pricing.ts (one table for the whole project).

interface Task {
  id?: string;
  prompt: string;
  system?: string;
  files?: string[];
  out?: string;
  model?: string;
  json?: boolean;
  think?: number;
  code?: boolean;
  maxTokens?: number;
  temperature?: number;
}

interface Usage {
  prompt_tokens: number;
  cached_tokens: number;
  completion_tokens: number;
  reasoning_tokens: number;
  cost_usd: number | null;
}

interface Result { text: string; usage: Usage; ms: number; model: string }

class RetryableError extends Error {}

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

function withFiles(prompt: string, files: string[] | undefined): string {
  if (!files?.length) return prompt;
  const parts = files.map((f) => `\n\n--- FILE: ${f} ---\n${readFileSync(f, 'utf8')}`);
  const packed = prompt + parts.join('');
  if (packed.length > 400_000) process.stderr.write(`[qwen] warning: prompt is ${Math.round(packed.length / 1000)}k chars\n`);
  return packed;
}

function costOfUsage(model: string, u: Omit<Usage, 'cost_usd'>): number {
  return costOf(model, { prompt_tokens: u.prompt_tokens, completion_tokens: u.completion_tokens, prompt_tokens_details: { cached_tokens: u.cached_tokens } });
}

function firstCodeBlock(text: string): string {
  const m = text.match(/```[\w.+-]*\r?\n([\s\S]*?)```/);
  return m ? m[1] : text;
}

async function streamOnce(key: string, body: Record<string, unknown>, model: string): Promise<Result> {
  const t0 = performance.now();
  const ctrl = new AbortController();
  let timer = setTimeout(() => ctrl.abort(new Error('no first byte within 45 s')), 45_000);
  const bump = () => {
    clearTimeout(timer);
    timer = setTimeout(() => ctrl.abort(new Error('stream idle for 90 s')), 90_000);
  };
  let text = '';
  const usage: Usage = { prompt_tokens: 0, cached_tokens: 0, completion_tokens: 0, reasoning_tokens: 0, cost_usd: null };
  try {
    const res = await fetch(BASE_URL + '/chat/completions', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 400);
      const msg = `HTTP ${res.status}: ${detail}`;
      throw res.status === 429 || res.status >= 500 ? new RetryableError(msg) : new Error(msg);
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
        const data = line.slice(5).trim();
        if (!data || data === '[DONE]') continue;
        let j;
        try { j = JSON.parse(data); } catch { continue; }
        if (j.usage) {
          usage.prompt_tokens = j.usage.prompt_tokens ?? 0;
          usage.cached_tokens = j.usage.prompt_tokens_details?.cached_tokens ?? 0;
          usage.completion_tokens = j.usage.completion_tokens ?? 0;
          usage.reasoning_tokens = j.usage.completion_tokens_details?.reasoning_tokens ?? 0;
        }
        const delta = j.choices?.[0]?.delta?.content;
        if (delta) text += delta;
      }
    }
  } catch (e) {
    if (e instanceof RetryableError) throw e;
    if (ctrl.signal.aborted) throw new RetryableError(String((ctrl.signal.reason as Error)?.message ?? e));
    if (e instanceof TypeError) throw new RetryableError(`network: ${e.message}`); // fetch failed, DNS, reset
    throw e;
  } finally {
    clearTimeout(timer);
  }
  usage.cost_usd = costOfUsage(model, usage);
  return { text, usage, ms: Math.round(performance.now() - t0), model };
}

async function ask(task: Task, label: string): Promise<Result> {
  const key = process.env.DASHSCOPE_API_KEY;
  if (!key) throw new Error('DASHSCOPE_API_KEY is not set');
  const model = task.model ?? DEFAULT_MODEL;
  const prompt = withFiles(task.prompt, task.files);
  let system = task.system ?? '';
  if (task.json && !/json/i.test(system + prompt)) system = (system ? system + '\n' : '') + 'Respond with valid JSON only.';
  const messages: Array<{ role: string; content: string }> = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: prompt });
  const body: Record<string, unknown> = {
    model,
    messages,
    stream: true,
    stream_options: { include_usage: true },
    enable_thinking: Boolean(task.think),
    max_completion_tokens: task.maxTokens ?? 16_384,
  };
  if (task.think) body.thinking_budget = task.think;
  if (task.json) body.response_format = { type: 'json_object' };
  if (task.temperature !== undefined) body.temperature = task.temperature;

  for (let attempt = 1; ; attempt++) {
    try {
      const r = await streamOnce(key, body, model);
      appendFileSync(USAGE_LOG, JSON.stringify({ ts: new Date().toISOString(), label, model, ms: r.ms, ...r.usage }) + '\n');
      if (task.code) r.text = firstCodeBlock(r.text);
      return r;
    } catch (e) {
      if (!(e instanceof RetryableError) || attempt >= 4) throw e;
      const wait = 2000 * 2 ** (attempt - 1);
      process.stderr.write(`[qwen] ${label}: ${(e as Error).message}; retrying in ${wait / 1000} s\n`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

function summary(label: string, r: Result): string {
  const u = r.usage;
  const cost = u.cost_usd === null ? 'cost n/a' : `$${u.cost_usd.toFixed(4)}`;
  return `[qwen] ${label} · ${r.model} · ${u.prompt_tokens} in (${u.cached_tokens} cached) · ${u.completion_tokens} out · ${cost} · ${(r.ms / 1000).toFixed(1)} s`;
}

function printUsage(): void {
  if (!existsSync(USAGE_LOG)) { console.log('No Qwen usage logged yet.'); return; }
  const totals: Record<string, { calls: number; prompt: number; cached: number; completion: number; cost: number }> = {};
  for (const line of readFileSync(USAGE_LOG, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const u = JSON.parse(line);
    const t = (totals[u.model] ??= { calls: 0, prompt: 0, cached: 0, completion: 0, cost: 0 });
    t.calls++; t.prompt += u.prompt_tokens; t.cached += u.cached_tokens; t.completion += u.completion_tokens; t.cost += u.cost_usd ?? 0;
  }
  for (const [model, t] of Object.entries(totals)) {
    console.log(`${model}: ${t.calls} calls, ${t.prompt} prompt tokens (${t.cached} cached), ${t.completion} output tokens, list-price value $${t.cost.toFixed(3)}`);
  }
}

async function runBatch(file: string, outDir: string, concurrency: number, force: boolean): Promise<void> {
  const tasks: Task[] = readFileSync(file, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
  let next = 0, ok = 0, skipped = 0, failed = 0, cost = 0;
  const worker = async () => {
    while (next < tasks.length) {
      const task = tasks[next++];
      const id = task.id ?? `task-${next}`;
      const out = task.out ?? path.join(outDir, `${id}.txt`);
      if (!force && existsSync(out)) { skipped++; continue; }
      try {
        const r = await ask(task, id);
        mkdirSync(path.dirname(out), { recursive: true });
        writeFileSync(out, r.text);
        cost += r.usage.cost_usd ?? 0;
        ok++;
        process.stderr.write(summary(id, r) + ` -> ${out}\n`);
      } catch (e) {
        failed++;
        process.stderr.write(`[qwen] ${id} failed: ${(e as Error).message}\n`);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));
  process.stderr.write(`[qwen] batch done: ${ok} ok, ${skipped} skipped (output exists), ${failed} failed, list-price value $${cost.toFixed(3)}\n`);
  if (failed) process.exitCode = 1;
}

const args = parseArgs(process.argv.slice(2));
if (args.usage) {
  printUsage();
} else if (typeof args.batch === 'string') {
  const outDir = typeof args['out-dir'] === 'string' ? args['out-dir'] : path.join(HERE, 'out', path.basename(args.batch, '.jsonl'));
  await runBatch(args.batch, outDir, Number(args.concurrency ?? 4), Boolean(args.force));
} else {
  const prompt = typeof args['prompt-file'] === 'string' ? readFileSync(args['prompt-file'], 'utf8')
    : typeof args.prompt === 'string' ? args.prompt
    : readFileSync(0, 'utf8');
  const system = typeof args['system-file'] === 'string' ? readFileSync(args['system-file'], 'utf8')
    : typeof args.system === 'string' ? args.system : undefined;
  const task: Task = {
    prompt,
    system,
    files: typeof args.files === 'string' ? args.files.split(',').map((f) => f.trim()).filter(Boolean) : undefined,
    model: typeof args.model === 'string' ? args.model : undefined,
    json: Boolean(args.json),
    think: args.think ? Number(args.think) : undefined,
    code: Boolean(args.code),
    maxTokens: args['max-tokens'] ? Number(args['max-tokens']) : undefined,
    temperature: args.temperature !== undefined ? Number(args.temperature) : undefined,
  };
  const label = typeof args.label === 'string' ? args.label : 'ask';
  try {
    const r = await ask(task, label);
    if (typeof args.out === 'string') {
      mkdirSync(path.dirname(path.resolve(args.out)), { recursive: true });
      writeFileSync(args.out, r.text);
    } else {
      process.stdout.write(r.text + (r.text.endsWith('\n') ? '' : '\n'));
    }
    process.stderr.write(summary(label, r) + (typeof args.out === 'string' ? ` -> ${args.out}` : '') + '\n');
  } catch (e) {
    process.stderr.write(`[qwen] ${label} failed: ${(e as Error).message}\n`);
    process.exitCode = 1;
  }
}
