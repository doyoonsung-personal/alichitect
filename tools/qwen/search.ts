// Web search through Qwen (Model Studio's built-in search), for cheap first-pass lookups that Claude then verifies.
//   node tools/qwen/search.ts --query "Is Agent Sandbox a feature of Alibaba Cloud ACS?"
//   node tools/qwen/search.ts --query "..." --json --out notes.json
// Uses the native multimodal-generation endpoint, the one that returns the search results (titles and URLs) beside
// the answer; compatible mode searches too but hides the sources. Results lean towards the China site (aliyun.com),
// so check international availability on alibabacloud.com before relying on a fact.
// Reads DASHSCOPE_API_KEY from the environment and never prints it. Usage goes to tools/qwen/usage.jsonl.

import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const USAGE_LOG = path.join(HERE, 'usage.jsonl');
const URL_NATIVE = (process.env.QWEN_NATIVE_URL ?? 'https://dashscope-intl.aliyuncs.com/api/v1') + '/services/aigc/multimodal-generation/generation';
const PRICES: Record<string, { input: number; output: number }> = {
  'qwen3.8-max': { input: 2, output: 6 },
  'qwen3.8-flash': { input: 0.15, output: 0.47 },
};

const SYSTEM = 'Answer from the search results only. Prefer the international site (alibabacloud.com) over the China site (aliyun.com) and say which site each fact comes from, because availability differs. Cite results as [n]. If the results do not answer the question, say so.';

interface Source { index: number; title: string; url: string; site?: string }
interface Found { answer: string; sources: Source[]; usage: { prompt_tokens: number; completion_tokens: number }; ms: number; model: string }

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) { out[a.slice(2)] = next; i++; } else out[a.slice(2)] = true;
  }
  return out;
}

async function searchOnce(key: string, query: string, model: string, strategy: string): Promise<Found> {
  const t0 = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new Error('no answer within 120 s')), 120_000);
  try {
    const res = await fetch(URL_NATIVE, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        input: { messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: query }] },
        parameters: {
          result_format: 'message',
          enable_thinking: false,
          max_tokens: 1500,
          enable_search: true,
          search_options: { forced_search: true, enable_source: true, enable_citation: true, search_strategy: strategy },
        },
      }),
    });
    const j = (await res.json().catch(() => ({}))) as Record<string, any>;
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status} ${j.code ?? ''} ${String(j.message ?? '').slice(0, 200)}`);
      (err as Error & { retryable?: boolean }).retryable = res.status === 429 || res.status >= 500;
      throw err;
    }
    const out = j.output ?? {};
    const content = out.choices?.[0]?.message?.content;
    const answer = Array.isArray(content) ? content.map((c: { text?: string }) => c.text ?? '').join('') : String(content ?? '');
    const sources: Source[] = (out.search_info?.search_results ?? []).map((s: Record<string, any>) => ({
      index: Number(s.index), title: String(s.title ?? ''), url: String(s.url ?? ''), site: s.site_name ? String(s.site_name) : undefined,
    }));
    const usage = { prompt_tokens: Number(j.usage?.input_tokens ?? 0), completion_tokens: Number(j.usage?.output_tokens ?? 0) };
    return { answer, sources, usage, ms: Date.now() - t0, model };
  } finally {
    clearTimeout(timer);
  }
}

async function search(query: string, model: string, strategy: string, label: string): Promise<Found> {
  const key = process.env.DASHSCOPE_API_KEY;
  if (!key) throw new Error('DASHSCOPE_API_KEY is not set');
  for (let attempt = 1; ; attempt++) {
    try {
      const r = await searchOnce(key, query, model, strategy);
      const p = PRICES[model] ?? { input: 3, output: 15 };
      const cost = (r.usage.prompt_tokens * p.input + r.usage.completion_tokens * p.output) / 1e6;
      appendFileSync(USAGE_LOG, JSON.stringify({ ts: new Date().toISOString(), label, model, ms: r.ms, ...r.usage, cached_tokens: 0, reasoning_tokens: 0, cost_usd: cost, search: true }) + '\n');
      return r;
    } catch (e) {
      const retryable = (e as { retryable?: boolean }).retryable || (e as Error).name === 'AbortError' || e instanceof TypeError;
      if (!retryable || attempt >= 4) throw e;
      const wait = 2000 * 2 ** (attempt - 1);
      process.stderr.write(`[qwen-search] ${label}: ${(e as Error).message}; retrying in ${wait / 1000} s\n`);
      await new Promise((res) => setTimeout(res, wait));
    }
  }
}

const args = parseArgs(process.argv.slice(2));
const query = typeof args.query === 'string' ? args.query : typeof args.prompt === 'string' ? args.prompt : '';
if (!query) {
  process.stderr.write('usage: node tools/qwen/search.ts --query "..." [--json] [--out file] [--model qwen3.8-max] [--strategy pro|turbo] [--label name]\n');
  process.exit(2);
}
const label = typeof args.label === 'string' ? args.label : 'search';
try {
  const r = await search(query, typeof args.model === 'string' ? args.model : 'qwen3.8-max', typeof args.strategy === 'string' ? args.strategy : 'pro', label);
  const text = args.json
    ? JSON.stringify({ query, answer: r.answer, sources: r.sources }, null, 1)
    : `${r.answer}\n\nSources:\n${r.sources.map((s) => `[${s.index}] ${s.title} - ${s.url}`).join('\n') || '(none returned)'}\n`;
  if (typeof args.out === 'string') {
    mkdirSync(path.dirname(path.resolve(args.out)), { recursive: true });
    writeFileSync(args.out, text);
  } else process.stdout.write(text);
  process.stderr.write(`[qwen-search] ${label} · ${r.model} · ${r.sources.length} sources · ${r.usage.prompt_tokens} in · ${r.usage.completion_tokens} out · ${(r.ms / 1000).toFixed(1)} s\n`);
} catch (e) {
  process.stderr.write(`[qwen-search] ${label} failed: ${(e as Error).message}\n`);
  process.exit(1);
}
