// Latency and prompt-cache test matrix for Model Studio on the Singapore endpoint (Phase 0 spike).
// Plain fetch + SSE parsing, no SDK. Every call appends one JSON line to results/<cell>.jsonl.
// The key comes from DASHSCOPE_API_KEY and is only ever placed in the Authorization header: never printed or stored.
//
//   node spikes/latency/run.ts smoke                       plumbing, /models round trip, token calibration
//   node spikes/latency/run.ts cold                        1: 10 cold calls each at ~12k and ~24k (fresh nonce per call)
//   node spikes/latency/run.ts warm                        2: implicit cache, 30 warm calls each at ~12k and ~24k
//   node spikes/latency/run.ts explicit                    3: cache_control ephemeral at ~24k: discrimination test + 30 hits
//   node spikes/latency/run.ts decay --gap 5.5             4: idle-gap decay, implicit and explicit tracks (minutes)
//   node spikes/latency/run.ts diagram [--cache explicit]  5: e-commerce diagram turns, 8x qwen3.8-max + 4x qwen3.8-flash
//        [--n-max 8] [--n-flash 4] [--n-37 0] [--size 12000|0]  (size 0 = the bare ~1.2k probe prompt, as in research/probes;
//        --n-37 adds qwen3.7-max runs with enable_thinking:false, alias only)
//   node spikes/latency/run.ts params                      6: reasoning_effort:"none" vs enable_thinking:false; qwen3.7-max
//   node spikes/latency/run.ts concurrency [--cache X]     7: 3 rounds of 4 parallel warm ~24k calls
//   node spikes/latency/run.ts flash                       extra: qwen3.8-flash cold/warm TTFT at ~12k (fallback sizing)
//   node spikes/latency/run.ts soak [--n 40]               extra: n explicit + n implicit warm calls at ~12k, interleaved
//   node spikes/latency/run.ts control                     extra: 2 cold calls with the earlier probes' repetitive 24k filler
//   node spikes/latency/run.ts history                     extra: is chat history after the system block cached (implicit vs markers)?
//   node spikes/latency/run.ts late [--subs cell/sub,...]  extra: re-probe earlier warm prefixes after a long idle gap
//   node spikes/latency/run.ts spend                       spend so far, from the JSONL files
//
// LAT_BASE_URL overrides the endpoint (for example the workspace-dedicated https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1).
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSystemPrompt, ECOMMERCE_ASK, estimateTokens, materialStats, PROBE_SYSTEM, SHORT_ASKS } from './prompts.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RESULTS = path.join(HERE, 'results');
const BASE = (process.env.LAT_BASE_URL || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1').replace(/\/$/, '');
const KEY = process.env.DASHSCOPE_API_KEY ?? '';
const BUDGET_USD = 4;
const HARD_STOP_USD = 3.8; // refuse new calls beyond this, leaving room for calls already in flight
const MAX_INFLIGHT = 4;
const MAX = 'qwen3.8-max';
const FLASH = 'qwen3.8-flash';
const SESSION = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '') + '-' + randomBytes(2).toString('hex');

// ---------- prices (USD per 1M tokens, Singapore) and cost ----------

interface Price { in: number; out: number; implicitHit: number; explicitHit: number; explicitCreate: number }
export const PRICES: Record<string, Price> = {
  'qwen3.8-max': { in: 2, out: 6, implicitHit: 0.25, explicitHit: 0.17, explicitCreate: 2.5 },
  'qwen3.8-flash': { in: 0.15, out: 0.47, implicitHit: 0.016, explicitHit: 0.016, explicitCreate: 0.1875 },
  // Cache prices for qwen3.7-max were not researched; bill everything at the full input price (conservative).
  'qwen3.7-max': { in: 2.5, out: 7.5, implicitHit: 2.5, explicitHit: 2.5, explicitCreate: 3.125 },
};

type CacheMode = 'implicit' | 'explicit';
type Thinking = 'off' | 'effort-none';

interface Usage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  prompt_tokens_details?: { cached_tokens?: number; cache_creation_input_tokens?: number; cache_creation?: Record<string, number>; cache_type?: string; [k: string]: unknown };
  completion_tokens_details?: { reasoning_tokens?: number; [k: string]: unknown };
  [k: string]: unknown;
}

export function creationTokens(u: Usage | null): number {
  const d = u?.prompt_tokens_details;
  if (!d) return 0;
  if (typeof d.cache_creation_input_tokens === 'number') return d.cache_creation_input_tokens;
  if (d.cache_creation && typeof d.cache_creation === 'object') return Object.values(d.cache_creation).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
  return 0;
}

/** List-price cost of one call. In explicit mode a miss with no creation field is billed as a creation (conservative). */
export function costOf(model: string, mode: CacheMode, u: Usage | null): number {
  if (!u) return 0;
  const p = PRICES[model] ?? PRICES[MAX];
  const prompt = u.prompt_tokens ?? 0;
  const cached = u.prompt_tokens_details?.cached_tokens ?? 0;
  let created = creationTokens(u);
  let plain = Math.max(0, prompt - cached - created);
  if (mode === 'explicit' && created === 0 && cached === 0) { created = plain; plain = 0; }
  const hit = mode === 'explicit' ? p.explicitHit : p.implicitHit;
  return (cached * hit + created * p.explicitCreate + plain * p.in + (u.completion_tokens ?? 0) * p.out) / 1e6;
}

function spentUsd(): number {
  if (!existsSync(RESULTS)) return 0;
  let s = 0;
  for (const f of readdirSync(RESULTS)) {
    if (!f.endsWith('.jsonl')) continue;
    for (const ln of readFileSync(path.join(RESULTS, f), 'utf8').split('\n')) {
      if (!ln.trim()) continue;
      try { s += JSON.parse(ln).costUsd || 0; } catch { /* partial line from a concurrent writer */ }
    }
  }
  return s;
}

// ---------- one streamed call ----------

interface CallSpec {
  cell: string;
  sub: string;
  label: string;
  model: string;
  system: string;
  prefixTag: string; // nonce of the system prompt; same tag + size = same bytes
  sizeTarget: number;
  cacheMode: CacheMode;
  user: string;
  maxTokens: number;
  thinking: Thinking;
  timeoutMs: number;
  hedgeAfterMs?: number; // fire one identical request if no token has arrived by then (the original keeps running)
  collectLines?: boolean; // record NDJSON line arrival times (diagram turns)
  noPace?: boolean; // skip the cross-process pacer (deliberately parallel calls and hedges)
  messages?: unknown[]; // full message list (multi-turn cells); otherwise [system, user] is built from system/user/cacheMode
  meta?: Record<string, unknown>;
}

export interface Rec {
  v: 1;
  session: string;
  cell: string;
  sub: string;
  label: string;
  model: string;
  cacheMode: CacheMode;
  thinkingParam: string;
  maxTokens: number;
  sizeTarget: number;
  prefixTag: string;
  prefixId: string;
  promptChars: number;
  user: string;
  host: string;
  startedAt: string;
  startEpochMs: number;
  endEpochMs: number;
  headersMs: number | null;
  firstByteMs: number | null;
  firstEventMs: number | null;
  firstContentMs: number | null;
  firstReasoningMs: number | null;
  firstLineMs: number | null;
  firstNodeMs: number | null;
  totalMs: number;
  status: number | null;
  error: string | null;
  timedOut: boolean;
  finish: string | null;
  events: number;
  maxGapMs: number;
  maxGapAtMs: number | null;
  usage: Usage | null;
  usageKeys: string[];
  promptTokens: number | null;
  cachedTokens: number | null;
  creationTokens: number | null;
  completionTokens: number | null;
  reasoningTokens: number | null;
  reasoningChars: number;
  reasoningSample: string;
  costUsd: number;
  respId: string | null;
  headers: Record<string, string>;
  content: string;
  lines?: Array<[number, string]>;
  ops?: number;
  badLines?: number;
  hedged: boolean;
  meta: Record<string, unknown>;
}

const KEEP_HEADERS = ['x-request-id', 'x-dashscope-request-id', 'req-cost-time', 'req-arrive-time', 'resp-start-time', 'x-envoy-upstream-service-time', 'x-dashscope-call-gateway', 'x-dashscope-finished', 'x-dashscope-timeout', 'server', 'date', 'content-type'];
const pickHeaders = (h: Headers): Record<string, string> => Object.fromEntries(KEEP_HEADERS.flatMap((k) => (h.get(k) != null ? [[k, String(h.get(k))]] : [])));

const flatKeys = (o: unknown, pre = ''): string[] => (o && typeof o === 'object' ? Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => (v && typeof v === 'object' ? flatKeys(v, pre + k + '.') : [pre + k])) : []);

let inflight = 0;
const waiters: Array<() => void> = [];
async function acquire(): Promise<void> {
  if (inflight < MAX_INFLIGHT) { inflight++; return; }
  await new Promise<void>((res) => waiters.push(res));
  inflight++;
}
function release(): void {
  inflight--;
  const w = waiters.shift();
  if (w) w();
}

/**
 * Cross-process pacing for big prompts: cells may run in parallel processes, so the last start time of a call with a
 * prompt of 10k+ tokens is kept in results/.pace and every big call starts at least PACE_MS after the previous one.
 */
const PACE_FILE = path.join(RESULTS, '.pace');
const PACE_MS = 2500;
async function globalPace(): Promise<void> {
  mkdirSync(RESULTS, { recursive: true });
  for (;;) {
    let last = 0;
    try { last = Number(readFileSync(PACE_FILE, 'utf8')) || 0; } catch { /* first call */ }
    const wait = last + PACE_MS - Date.now();
    if (wait <= 0) { writeFileSync(PACE_FILE, String(Date.now())); return; }
    await sleep(wait + Math.floor(Math.random() * 50));
  }
}

async function callOnce(spec: CallSpec, slow?: { afterMs: number; fire: () => void }): Promise<Rec> {
  if (!spec.noPace && estimateTokens(spec.system) >= 10000) await globalPace();
  const body: Record<string, unknown> = {
    model: spec.model,
    messages: spec.messages ?? [
      { role: 'system', content: spec.cacheMode === 'explicit' ? [{ type: 'text', text: spec.system, cache_control: { type: 'ephemeral' } }] : spec.system },
      { role: 'user', content: spec.user },
    ],
    stream: true,
    stream_options: { include_usage: true },
    max_completion_tokens: spec.maxTokens,
  };
  if (spec.thinking === 'off') body.enable_thinking = false;
  else body.reasoning_effort = 'none';

  const rec: Rec = {
    v: 1, session: SESSION, cell: spec.cell, sub: spec.sub, label: spec.label, model: spec.model, cacheMode: spec.cacheMode,
    thinkingParam: spec.thinking === 'off' ? 'enable_thinking:false' : 'reasoning_effort:none', maxTokens: spec.maxTokens,
    sizeTarget: spec.sizeTarget, prefixTag: spec.prefixTag, prefixId: createHash('sha256').update(spec.system).digest('hex').slice(0, 16),
    promptChars: spec.messages ? JSON.stringify(spec.messages).length : spec.system.length + spec.user.length, user: spec.user, host: new URL(BASE).host,
    startedAt: '', startEpochMs: 0, endEpochMs: 0, headersMs: null, firstByteMs: null, firstEventMs: null, firstContentMs: null,
    firstReasoningMs: null, firstLineMs: null, firstNodeMs: null, totalMs: 0, status: null, error: null, timedOut: false, finish: null,
    events: 0, maxGapMs: 0, maxGapAtMs: null, usage: null, usageKeys: [], promptTokens: null, cachedTokens: null, creationTokens: null,
    completionTokens: null, reasoningTokens: null, reasoningChars: 0, reasoningSample: '', costUsd: 0, respId: null, headers: {},
    content: '', hedged: false, meta: spec.meta ?? {},
  };
  const lines: Array<[number, string]> = [];
  let content = '';
  let pending = '';
  await acquire();
  const t0 = performance.now();
  rec.startedAt = new Date().toISOString();
  rec.startEpochMs = Date.now();
  const since = (): number => Math.round(performance.now() - t0);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), spec.timeoutMs);
  const slowTimer = slow ? setTimeout(() => { if (rec.firstContentMs == null && rec.firstReasoningMs == null) slow.fire(); }, slow.afterMs) : null;
  const pushLine = (ms: number, raw: string): void => {
    const ln = raw.trim();
    if (!ln) return;
    lines.push([ms, ln]);
    try {
      const o = JSON.parse(ln);
      if (rec.firstLineMs == null) rec.firstLineMs = ms;
      if (rec.firstNodeMs == null && o && o.t === 'node') rec.firstNodeMs = ms;
    } catch { /* counted as a bad line below */ }
  };
  try {
    const res = await fetch(BASE + '/chat/completions', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify(body),
    });
    rec.headersMs = since();
    rec.status = res.status;
    rec.headers = pickHeaders(res.headers);
    if (!res.ok || !res.body) {
      rec.error = (await res.text()).slice(0, 800);
    } else {
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      let lastEvent: number | null = null;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        const now = since();
        if (rec.firstByteMs == null) rec.firstByteMs = now;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, nl).replace(/\r$/, '');
          buf = buf.slice(nl + 1);
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (!data || data === '[DONE]') continue;
          let j: any;
          try { j = JSON.parse(data); } catch { continue; }
          rec.events++;
          if (rec.firstEventMs == null) rec.firstEventMs = now;
          if (lastEvent != null && rec.firstContentMs != null && now - lastEvent > rec.maxGapMs) { rec.maxGapMs = now - lastEvent; rec.maxGapAtMs = now; }
          lastEvent = now;
          if (j.error) rec.error = JSON.stringify(j.error).slice(0, 500);
          if (j.id && !rec.respId) rec.respId = String(j.id);
          if (j.usage) rec.usage = j.usage;
          const ch = j.choices && j.choices[0];
          if (!ch) continue;
          if (ch.finish_reason) rec.finish = ch.finish_reason;
          const d = ch.delta || {};
          if (d.reasoning_content) {
            if (rec.firstReasoningMs == null) rec.firstReasoningMs = now;
            rec.reasoningChars += d.reasoning_content.length;
            if (rec.reasoningSample.length < 200) rec.reasoningSample += d.reasoning_content;
          }
          if (d.content) {
            if (rec.firstContentMs == null) rec.firstContentMs = now;
            content += d.content;
            if (spec.collectLines) {
              pending += d.content;
              let k: number;
              while ((k = pending.indexOf('\n')) >= 0) { pushLine(now, pending.slice(0, k)); pending = pending.slice(k + 1); }
            }
          }
        }
      }
    }
  } catch (e) {
    rec.timedOut = ctrl.signal.aborted;
    rec.error = rec.timedOut ? `client timeout after ${spec.timeoutMs} ms` : String(e).slice(0, 300);
  } finally {
    clearTimeout(timer);
    if (slowTimer) clearTimeout(slowTimer);
    rec.totalMs = since();
    rec.endEpochMs = Date.now();
    release();
  }
  if (spec.collectLines && pending.trim()) pushLine(rec.totalMs, pending);
  const u = rec.usage;
  rec.usageKeys = flatKeys(u);
  rec.promptTokens = u?.prompt_tokens ?? null;
  rec.cachedTokens = u ? (u.prompt_tokens_details?.cached_tokens ?? 0) : null;
  rec.creationTokens = u ? creationTokens(u) : null;
  rec.completionTokens = u?.completion_tokens ?? null;
  rec.reasoningTokens = u ? (u.completion_tokens_details?.reasoning_tokens ?? 0) : null;
  rec.costUsd = costOf(spec.model, spec.cacheMode, u);
  rec.content = spec.collectLines ? content : content.slice(0, 300);
  if (spec.collectLines) {
    rec.lines = lines;
    rec.ops = lines.filter(([, l]) => { try { JSON.parse(l); return true; } catch { return false; } }).length;
    rec.badLines = lines.length - rec.ops;
  }
  return rec;
}

const s1 = (ms: number | null): string => (ms == null ? '-' : (ms / 1000).toFixed(2) + 's');

function logRec(r: Rec): void {
  const created = r.creationTokens ? ` created ${r.creationTokens}` : '';
  const extra = r.lines ? ` ops ${r.ops} bad ${r.badLines} firstOp ${s1(r.firstLineMs)}` : '';
  const think = r.reasoningChars ? ` REASONING ${r.reasoningChars}ch` : '';
  console.log(`${r.startedAt.slice(11, 19)}Z ${r.cell}/${r.sub} ${r.label} HTTP ${r.status ?? '-'} hdr ${s1(r.headersMs)} ttfb ${s1(r.firstByteMs)} ttft ${s1(r.firstContentMs)} total ${s1(r.totalMs)} prompt ${r.promptTokens ?? '-'} cached ${r.cachedTokens ?? '-'}${created} out ${r.completionTokens ?? '-'}${think}${extra} $${r.costUsd.toFixed(4)}${r.error ? ' ERR ' + r.error.slice(0, 160) : ''}`);
}

function write(r: Rec): void {
  mkdirSync(RESULTS, { recursive: true });
  appendFileSync(path.join(RESULTS, r.cell + '.jsonl'), JSON.stringify(r) + '\n');
}

const sleep = (ms: number): Promise<void> => new Promise((res) => setTimeout(res, Math.max(0, ms)));

let pendingEstimate = 0;
function estimateCost(spec: CallSpec): number {
  const p = PRICES[spec.model] ?? PRICES[MAX];
  return (estimateTokens(spec.system + spec.user) * Math.max(p.in, p.explicitCreate) + spec.maxTokens * p.out) / 1e6;
}

/** Budget-guarded call that writes its record; optionally hedges once with an identical request. */
async function call(spec: CallSpec): Promise<Rec> {
  const est = estimateCost(spec);
  const spent = spentUsd() + pendingEstimate;
  if (spent + est > HARD_STOP_USD) throw new Error(`budget guard: spent ~$${spent.toFixed(3)} + next ~$${est.toFixed(3)} exceeds $${HARD_STOP_USD} (budget $${BUDGET_USD})`);
  pendingEstimate += est;
  const hedge: { p?: Promise<Rec> } = {};
  try {
    const slow = spec.hedgeAfterMs
      ? { afterMs: spec.hedgeAfterMs, fire: () => { hedge.p = call({ ...spec, label: spec.label + '+hedge', hedgeAfterMs: undefined, noPace: true, meta: { ...(spec.meta ?? {}), hedgeOf: spec.label } }); } }
      : undefined;
    const rec = await callOnce(spec, slow);
    rec.hedged = !!hedge.p;
    write(rec);
    logRec(rec);
    if (hedge.p) await hedge.p;
    if (rec.status === 429) { console.log('429: backing off 20 s'); await sleep(20000); }
    return rec;
  } finally {
    pendingEstimate -= est;
  }
}

function pacer(minGapMs: number): () => Promise<void> {
  let last = 0;
  return async () => {
    await sleep(last + minGapMs - Date.now());
    last = Date.now();
  };
}

let askIdx = 0;
function nextAsk(): string {
  const i = askIdx++;
  const a = SHORT_ASKS[i % SHORT_ASKS.length];
  return i < SHORT_ASKS.length ? a : `${a} (take ${Math.floor(i / SHORT_ASKS.length) + 1})`;
}

const sys = (size: number, tag: string): string => (size ? buildSystemPrompt(size, tag).text : PROBE_SYSTEM);
const baseSpec = (cell: string, sub: string, size: number, tag: string, mode: CacheMode = 'implicit', model = MAX): Omit<CallSpec, 'label' | 'user'> => ({
  cell, sub, model, system: sys(size, tag), prefixTag: tag, sizeTarget: size, cacheMode: mode, maxTokens: 32, thinking: 'off', timeoutMs: 180000,
});

// ---------- cells ----------

async function cellSmoke(): Promise<void> {
  console.log('material', materialStats(), 'session', SESSION, 'host', new URL(BASE).host);
  for (let i = 0; i < 3; i++) {
    const t0 = performance.now();
    const res = await fetch(BASE + '/models', { headers: { Authorization: 'Bearer ' + KEY } });
    const ms = Math.round(performance.now() - t0);
    const text = await res.text();
    console.log(`GET /models HTTP ${res.status} ${ms} ms, ${text.length} bytes${i === 0 ? '; header names: ' + [...res.headers.keys()].join(',') : ''}`);
  }
  for (const size of [12000, 24000]) {
    const b = buildSystemPrompt(size, `cal${size / 1000}k-${SESSION}`);
    const r = await call({ cell: 'smoke', sub: `calibrate-${size / 1000}k`, label: 'flash', model: FLASH, system: b.text, prefixTag: `cal${size / 1000}k-${SESSION}`, sizeTarget: size, cacheMode: 'implicit', user: 'Reply with ok.', maxTokens: 1, thinking: 'off', timeoutMs: 120000 });
    if (r.promptTokens) console.log(`calibration ${size}: chars ${b.text.length}, est ${b.estTokens}, actual ${r.promptTokens}, chars/token ${(b.text.length / r.promptTokens).toFixed(3)}`);
  }
  const r = await call({ cell: 'smoke', sub: 'tiny-max', label: 'tiny', model: MAX, system: 'You are terse.', prefixTag: 'tiny', sizeTarget: 10, cacheMode: 'implicit', user: 'Reply with the single word ok.', maxTokens: 8, thinking: 'off', timeoutMs: 60000 });
  console.log('tiny usage', JSON.stringify(r.usage), 'headers', JSON.stringify(r.headers));
}

async function cellCold(): Promise<void> {
  const pace = pacer(3000);
  for (let i = 0; i < 10; i++) {
    for (const size of [12000, 24000]) {
      await pace();
      const tag = `cold${size / 1000}k-${i}-${SESSION}-${randomBytes(3).toString('hex')}`;
      await call({ ...baseSpec('cold', `cold-${size / 1000}k`, size, tag), label: `c${i + 1}`, user: nextAsk(), timeoutMs: 240000 });
    }
  }
}

async function cellWarm(): Promise<void> {
  const specs = [12000, 24000].map((size) => baseSpec('warm', `implicit-${size / 1000}k`, size, `warm${size / 1000}k-${SESSION}`));
  const pace = pacer(3000);
  for (const s of specs) { await pace(); await call({ ...s, sub: s.sub + '-warmup', label: 'warmup', user: nextAsk() }); }
  for (let i = 0; i < 30; i++) {
    for (const s of specs) { await pace(); await call({ ...s, label: `w${i + 1}`, user: nextAsk(), hedgeAfterMs: 10000 }); }
  }
}

async function cellExplicit(): Promise<void> {
  // Discrimination test: warm a fresh prefix implicitly, then send the same bytes with cache_control.
  // If the marker is honoured, the first marked call is a creation (explicit and implicit caches are mutually exclusive).
  const tag = `expl24k-${SESSION}`;
  const imp = baseSpec('explicit', 'probe-implicit', 24000, tag, 'implicit');
  const exp = baseSpec('explicit', 'explicit-24k', 24000, tag, 'explicit');
  const pace = pacer(3000);
  await pace(); const a = await call({ ...imp, label: 'implicit-1', user: nextAsk() });
  await pace(); const b = await call({ ...imp, label: 'implicit-2', user: nextAsk() });
  await pace(); const c = await call({ ...exp, sub: 'explicit-first', label: 'marked-1', user: nextAsk() });
  for (const r of [a, b, c]) console.log(r.label, 'usage', JSON.stringify(r.usage));
  for (let i = 0; i < 30; i++) {
    await pace();
    const r = await call({ ...exp, label: `e${i + 1}`, user: nextAsk(), hedgeAfterMs: 10000 });
    if (i === 0) console.log(r.label, 'usage', JSON.stringify(r.usage));
  }
}

async function cellDecay(gapMin: number): Promise<void> {
  if (!(gapMin > 0 && gapMin <= 8)) throw new Error('--gap must be in (0, 8] minutes');
  const t0 = Date.now();
  const deadline = t0 + 8.9 * 60000;
  const gapMs = Math.round(gapMin * 60000);
  const modes: CacheMode[] = ['implicit', 'explicit'];
  await Promise.all(modes.map(async (mode, idx) => {
    await sleep(idx * 3500); // keep 24k calls at least 3 s apart
    const tag = `decay${gapMin}m-${mode}-${SESSION}`;
    const s = { ...baseSpec('decay', `${mode}-${gapMin}m`, 24000, tag, mode), timeoutMs: 25000 };
    await call({ ...s, label: 'create', user: nextAsk(), meta: { gapTargetMin: gapMin, step: 'create' } });
    const v = await call({ ...s, label: 'verify', user: nextAsk(), meta: { gapTargetMin: gapMin, step: 'verify' } });
    const probeAt = v.endEpochMs + gapMs;
    if (probeAt + 20000 > deadline) { console.log(`${mode}: probe would end after the 8.9 min deadline; skipped`); return; }
    console.log(`${mode}: idle ${gapMin} min until ${new Date(probeAt).toISOString().slice(11, 19)}Z`);
    await sleep(probeAt - Date.now());
    await call({ ...s, label: 'probe', user: nextAsk(), timeoutMs: 20000, meta: { gapTargetMin: gapMin, step: 'probe', verifyEndEpochMs: v.endEpochMs, verifyCached: v.cachedTokens } });
  }));
  console.log(`decay ${gapMin} min done in ${((Date.now() - t0) / 60000).toFixed(2)} min`);
}

/** Real diagram turns. size 12000 = probe prompt padded to ~12k tokens; size 0 = the bare ~1.2k probe prompt of the earlier probes. */
async function cellDiagram(mode: CacheMode, nMax: number, nFlash: number, size: number, n37 = 0): Promise<void> {
  const tag = size ? `diag${size / 1000}k-${mode}-${SESSION}` : 'probe-system';
  const suffix = size ? '' : '-probe1k';
  const track = async (model: string, n: number): Promise<void> => {
    const pace = pacer(3000);
    for (let i = 0; i < n; i++) {
      await pace();
      const s = size ? baseSpec('diagram', `${model}-${mode}`, size, tag, mode, model) : { ...baseSpec('diagram', `${model}-${mode}${suffix}`, 0, tag, mode, model), system: PROBE_SYSTEM, sizeTarget: 1250 };
      await call({ ...s, label: `run${i + 1}`, user: ECOMMERCE_ASK, maxTokens: 4096, timeoutMs: 300000, collectLines: true });
    }
  };
  // qwen3.7-max is called by its alias only; its -preview and dated snapshots are thinking-only.
  await Promise.all([track(MAX, nMax), track(FLASH, nFlash), track('qwen3.7-max', n37)]);
}

async function cellParams(): Promise<void> {
  const tag = `params12k-${SESSION}`;
  const s = baseSpec('params', 'warmup', 12000, tag);
  const pace = pacer(3000);
  await pace(); await call({ ...s, label: 'warmup', user: nextAsk() });
  const order: Thinking[] = ['off', 'effort-none', 'off', 'effort-none'];
  for (const [i, th] of order.entries()) {
    await pace();
    await call({ ...s, sub: th === 'off' ? 'max-enable_thinking-false' : 'max-reasoning_effort-none', label: `${th}-${i + 1}`, thinking: th, user: nextAsk() });
  }
  // qwen3.7-max alias only; its -preview and dated snapshots are thinking-only and are never used.
  const users = [ECOMMERCE_ASK, nextAsk()];
  for (const [i, u] of users.entries()) {
    await pace();
    await call({ cell: 'params', sub: 'qwen3.7-max-enable_thinking-false', label: `m37-${i + 1}`, model: 'qwen3.7-max', system: PROBE_SYSTEM, prefixTag: 'probe-system', sizeTarget: 1300, cacheMode: 'implicit', user: u, maxTokens: 32, thinking: 'off', timeoutMs: 120000 });
  }
}

async function cellConcurrency(mode: CacheMode): Promise<void> {
  const tag = `conc24k-${mode}-${SESSION}`;
  const s = baseSpec('concurrency', `${mode}-x4`, 24000, tag, mode);
  await call({ ...s, sub: `${mode}-warmup`, label: 'create', user: nextAsk() });
  await sleep(3000);
  await call({ ...s, sub: `${mode}-warmup`, label: 'verify', user: nextAsk() });
  for (let round = 1; round <= 3; round++) {
    await sleep(20000);
    await Promise.all([0, 1, 2, 3].map((k) => call({ ...s, label: `r${round}-${k + 1}`, user: nextAsk(), noPace: true, meta: { round, slot: k + 1 } })));
  }
}

async function cellFlash(): Promise<void> {
  const pace = pacer(2500);
  for (let i = 0; i < 5; i++) {
    await pace();
    const tag = `fcold12k-${i}-${SESSION}-${randomBytes(3).toString('hex')}`;
    await call({ ...baseSpec('flash', 'flash-cold-12k', 12000, tag, 'implicit', FLASH), label: `c${i + 1}`, user: nextAsk() });
  }
  const s = baseSpec('flash', 'flash-implicit-12k', 12000, `fwarm12k-${SESSION}`, 'implicit', FLASH);
  await pace(); await call({ ...s, sub: 'flash-implicit-12k-warmup', label: 'warmup', user: nextAsk() });
  for (let i = 0; i < 10; i++) { await pace(); await call({ ...s, label: `w${i + 1}`, user: nextAsk(), hedgeAfterMs: 10000 }); }
}

/** Extra: tail sampling at the app's real prompt size (~12k), explicit and implicit interleaved, hedged at 10 s. */
async function cellSoak(n: number): Promise<void> {
  const specs = (['explicit', 'implicit'] as CacheMode[]).map((mode) => baseSpec('soak', `${mode}-12k`, 12000, `soak12k-${mode}-${SESSION}`, mode));
  const pace = pacer(3000);
  for (const s of specs) { await pace(); await call({ ...s, sub: s.sub + '-warmup', label: 'warmup', user: nextAsk() }); }
  for (let i = 0; i < n; i++) {
    for (const s of specs) { await pace(); await call({ ...s, label: `s${i + 1}`, user: nextAsk(), hedgeAfterMs: 10000 }); }
  }
}

/**
 * Extra control: the repetitive-filler 24k prompt of the earlier probes (scratchpad probe2.mjs, which measured 13.9 s cold),
 * rebuilt verbatim after a fresh nonce line, to tell prompt content apart from the load at that time.
 */
async function cellControl(): Promise<void> {
  const words = 'region vpc latency throughput replication failover snapshot encryption tenant quota scaling cache index stream queue gateway policy audit metric alert backup archive shard replica edge origin certificate'.split(' ');
  const filler = (i: number): string => Array.from({ length: 70 }, (_, k) => words[(i * 7 + k * 3) % words.length]).join(' ');
  const synthetic = Array.from({ length: 250 }, (_, i) => `prod_${String(i).padStart(3, '0')} | Synthetic Product ${i} | tier${i % 7} | ${filler(i)}`).join('\n');
  const pace = pacer(3000);
  for (let i = 0; i < 2; i++) {
    await pace();
    const tag = `oldfiller-${i}-${SESSION}-${randomBytes(3).toString('hex')}`;
    const system = `Session ${tag}.\n` + PROBE_SYSTEM + '\n\nEXTENDED CATALOG:\n' + synthetic;
    await call({ cell: 'control', sub: 'old-filler-24k-cold', label: `k${i + 1}`, model: MAX, system, prefixTag: tag, sizeTarget: 24000, cacheMode: 'implicit', user: 'Reply with exactly {"t":"done","summary":"ok"}', maxTokens: 32, thinking: 'off', timeoutMs: 240000 });
  }
}

/**
 * Extra: does the chat history after the system block get cached? The app's layout is system (catalog) -> history ->
 * current graph + newest ask. Real turns from research/probes/streams.json; two calls per variant differ only in the last ask.
 *   implicit   no marker
 *   explicit1  marker on the system block only
 *   explicit2  markers on the system block and on the last history message
 */
async function cellHistory(): Promise<void> {
  const st = JSON.parse(readFileSync(path.join(HERE, '..', '..', 'research', 'probes', 'streams.json'), 'utf8')) as { ask: string; baseState: unknown; streams: Array<{ label: string; lineTimes: Array<[number, string]> }> };
  const content = (label: string): string => (st.streams.find((s) => s.label === label)?.lineTimes ?? []).map(([, l]) => l).join('\n');
  const mark = (text: string): unknown[] => [{ type: 'text', text, cache_control: { type: 'ephemeral' } }];
  const asks = ['oh I also want WAF', 'add a read replica for PolarDB'];
  const pace = pacer(3000);
  for (const variant of ['implicit', 'explicit1', 'explicit2']) {
    const tag = `hist12k-${variant}-${SESSION}`;
    const system = sys(12000, tag);
    for (const [i, ask] of asks.entries()) {
      const b4 = content('B4_dw');
      const messages = [
        { role: 'system', content: variant === 'implicit' ? system : mark(system) },
        { role: 'user', content: st.ask },
        { role: 'assistant', content: content('F_max_nothink') },
        { role: 'user', content: 'add a data warehouse so our analysts can build BI dashboards on order data' },
        { role: 'assistant', content: variant === 'explicit2' ? mark(b4) : b4 },
        { role: 'user', content: 'CURRENT DIAGRAM:\n' + JSON.stringify(st.baseState) + '\n\n' + ask },
      ];
      await pace();
      const r = await call({ cell: 'history', sub: variant, label: `turn${i + 1}`, model: MAX, system, prefixTag: tag, sizeTarget: 12000, cacheMode: variant === 'implicit' ? 'implicit' : 'explicit', user: ask, maxTokens: 32, thinking: 'off', timeoutMs: 120000, messages });
      console.log(variant, r.label, JSON.stringify(r.usage?.prompt_tokens_details));
    }
  }
}

/**
 * Extra, run within 5 minutes of `history`: the next turn of the same session. The history grows by one exchange and the
 * second marker moves to the new last assistant message. Shows whether a moved marker re-bills the whole prefix.
 */
async function cellHistoryGrow(): Promise<void> {
  const st = JSON.parse(readFileSync(path.join(HERE, '..', '..', 'research', 'probes', 'streams.json'), 'utf8')) as { ask: string; baseState: unknown; streams: Array<{ label: string; lineTimes: Array<[number, string]> }> };
  const content = (label: string): string => (st.streams.find((s) => s.label === label)?.lineTimes ?? []).map(([, l]) => l).join('\n');
  const mark = (text: string): unknown[] => [{ type: 'text', text, cache_control: { type: 'ephemeral' } }];
  const prev = readAll().filter((r) => r.cell === 'history');
  const pace = pacer(3000);
  for (const variant of ['implicit', 'explicit2']) {
    const tag = prev.filter((r) => r.sub === variant).sort((a, b) => b.endEpochMs - a.endEpochMs)[0]?.prefixTag;
    if (!tag) { console.log('no history run for', variant); continue; }
    const system = sys(12000, tag);
    const b2 = content('B2_followup_waf_nothink');
    const messages = [
      { role: 'system', content: variant === 'implicit' ? system : mark(system) },
      { role: 'user', content: st.ask },
      { role: 'assistant', content: content('F_max_nothink') },
      { role: 'user', content: 'add a data warehouse so our analysts can build BI dashboards on order data' },
      { role: 'assistant', content: content('B4_dw') },
      { role: 'user', content: 'oh I also want WAF' },
      { role: 'assistant', content: variant === 'explicit2' ? mark(b2) : b2 },
      { role: 'user', content: 'CURRENT DIAGRAM:\n' + JSON.stringify(st.baseState) + '\n\nnow drop the AI chatbot' },
    ];
    await pace();
    const r = await call({ cell: 'history', sub: variant, label: 'turn3-grown', model: MAX, system, prefixTag: tag, sizeTarget: 12000, cacheMode: variant === 'implicit' ? 'implicit' : 'explicit', user: 'now drop the AI chatbot', maxTokens: 32, thinking: 'off', timeoutMs: 120000, messages });
    console.log(variant, r.label, JSON.stringify(r.usage?.prompt_tokens_details));
  }
}

function readAll(): Rec[] {
  if (!existsSync(RESULTS)) return [];
  return readdirSync(RESULTS).filter((f) => f.endsWith('.jsonl')).flatMap((f) => readFileSync(path.join(RESULTS, f), 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l) as Rec));
}

/** Re-probe the warm prefixes of earlier cells after their natural idle time (cheap long-gap decay points). */
async function cellLate(subs: string): Promise<void> {
  const all = readAll();
  const pick = (cell: string, sub: string): Rec | undefined => all.filter((r) => r.cell === cell && r.sub === sub && r.status === 200).sort((x, y) => y.endEpochMs - x.endEpochMs)[0];
  const targets = subs.split(',').map((cs) => { const [c, s] = cs.split('/'); return pick(c, s); }).filter((r): r is Rec => !!r);
  const pace = pacer(3500);
  for (const t of targets) {
    const lastUse = Math.max(...all.filter((r) => r.prefixTag === t.prefixTag && r.model === t.model).map((r) => r.endEpochMs));
    const system = sys(t.sizeTarget, t.prefixTag);
    const id = createHash('sha256').update(system).digest('hex').slice(0, 16);
    if (id !== t.prefixId) { console.log(`prefix ${t.prefixTag} does not rebuild to the same bytes; skipped`); continue; }
    await pace();
    const idleMin = (Date.now() - lastUse) / 60000;
    await call({ cell: 'late', sub: `${t.cacheMode}-${t.sizeTarget / 1000}k`, label: `after-${idleMin.toFixed(0)}min`, model: t.model, system, prefixTag: t.prefixTag, sizeTarget: t.sizeTarget, cacheMode: t.cacheMode, user: nextAsk() + ' (late probe)', maxTokens: 32, thinking: 'off', timeoutMs: 180000, meta: { lastUseEpochMs: lastUse, idleMin: Number(idleMin.toFixed(2)), fromCell: t.cell } });
  }
}

function cellSpend(): void {
  const by: Record<string, { n: number; usd: number }> = {};
  for (const r of readAll()) { const k = r.cell; by[k] = by[k] ?? { n: 0, usd: 0 }; by[k].n++; by[k].usd += r.costUsd; }
  let total = 0;
  for (const [k, v] of Object.entries(by)) { console.log(`${k.padEnd(12)} ${String(v.n).padStart(4)} calls  $${v.usd.toFixed(4)}`); total += v.usd; }
  console.log(`total        $${total.toFixed(4)} of $${BUDGET_USD} (hard stop $${HARD_STOP_USD})`);
}

// ---------- main ----------

const argv = process.argv.slice(2);
const cell = argv[0];
const opt = (name: string): string | undefined => { const i = argv.indexOf('--' + name); return i >= 0 ? argv[i + 1] : undefined; };
const cacheOpt = (opt('cache') ?? 'implicit') as CacheMode;

if (cell !== 'spend' && !KEY) { console.error('DASHSCOPE_API_KEY is not set'); process.exit(1); }
const cells: Record<string, () => Promise<void> | void> = {
  smoke: cellSmoke,
  cold: cellCold,
  warm: cellWarm,
  explicit: cellExplicit,
  decay: () => cellDecay(Number(opt('gap'))),
  diagram: () => cellDiagram(cacheOpt, Number(opt('n-max') ?? 8), Number(opt('n-flash') ?? 4), Number(opt('size') ?? 12000), Number(opt('n-37') ?? 0)),
  params: cellParams,
  concurrency: () => cellConcurrency(cacheOpt),
  flash: cellFlash,
  soak: () => cellSoak(Number(opt('n') ?? 40)),
  control: cellControl,
  history: cellHistory,
  'history-grow': cellHistoryGrow,
  late: () => cellLate(opt('subs') ?? 'warm/implicit-24k,warm/implicit-12k,explicit/explicit-24k'),
  spend: cellSpend,
};
if (!cells[cell]) { console.error('usage: node run.ts <' + Object.keys(cells).join('|') + '> [--gap min] [--cache implicit|explicit]'); process.exit(2); }
const started = Date.now();
await cells[cell]();
if (cell !== 'spend') console.log(`${cell} finished in ${((Date.now() - started) / 1000).toFixed(1)} s; spend so far $${spentUsd().toFixed(4)}`);
