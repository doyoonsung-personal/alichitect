// Summarises results/*.jsonl into the Markdown tables used in REPORT.md. Read-only; no network.
//   node spikes/latency/analyze.ts
// Percentiles use linear interpolation between closest ranks (numpy's default). Times are seconds.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Rec } from './run.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RESULTS = path.join(HERE, 'results');

const all: Rec[] = existsSync(RESULTS)
  ? readdirSync(RESULTS).filter((f) => f.endsWith('.jsonl')).flatMap((f) => readFileSync(path.join(RESULTS, f), 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l) as Rec))
  : [];
all.sort((a, b) => a.startEpochMs - b.startEpochMs);

const pct = (xs: number[], p: number): number => {
  const s = [...xs].sort((a, b) => a - b);
  if (!s.length) return NaN;
  const i = (s.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return s[lo] + (s[hi] - s[lo]) * (i - lo);
};
const sec = (ms: number): string => (Number.isFinite(ms) ? (ms / 1000).toFixed(2) : '-');
const med = (xs: number[]): number => pct(xs, 0.5);
const nums = (rs: Rec[], f: (r: Rec) => number | null | undefined): number[] => rs.map(f).filter((x): x is number => typeof x === 'number' && Number.isFinite(x));
const table = (head: string[], rows: Array<Array<string | number>>): string =>
  [`| ${head.join(' | ')} |`, `|${head.map((_h, i) => (i === 0 ? '---' : '---:')).join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');
const serverMs = (r: Rec): number | null => (r.headers && r.headers['req-cost-time'] ? Number(r.headers['req-cost-time']) : null);
const isHit = (r: Rec): boolean => (r.cachedTokens ?? 0) >= 0.5 * (r.promptTokens ?? Infinity);
const ok = (r: Rec): boolean => r.status === 200 && !r.error;
const kst = (iso: string): string => new Date(Date.parse(iso) + 9 * 3600e3).toISOString().slice(0, 19).replace('T', ' ');
const parseLine = (l: string): { t?: string } | null => { try { return JSON.parse(l); } catch { return null; } };

function ttftRow(label: string, rs: Rec[]): Array<string | number> {
  const t = nums(rs, (r) => r.firstContentMs);
  const tot = nums(rs, (r) => r.totalMs);
  return [
    label, rs.length,
    Math.round(med(nums(rs, (r) => r.promptTokens))),
    Math.round(med(nums(rs, (r) => r.cachedTokens))),
    `${rs.filter(isHit).length}/${rs.length}`,
    sec(pct(t, 0.5)), sec(pct(t, 0.9)), sec(pct(t, 0.95)), sec(Math.max(...t)),
    sec(pct(tot, 0.5)), sec(Math.max(...tot)),
    sec(med(nums(rs, serverMs))),
    rs.filter((r) => !ok(r)).length,
  ];
}
const TTFT_HEAD = ['cell', 'n', 'prompt tok (p50)', 'cached tok (p50)', 'hits', 'TTFT p50', 'p90', 'p95', 'max', 'total p50', 'total max', 'server TTFB p50', 'errors'];

const out: string[] = [];
const by = (cell: string, sub?: string): Rec[] => all.filter((r) => r.cell === cell && (sub == null || r.sub === sub));
const main = all.filter((r) => r.cell !== 'smoke');

// ---------- window ----------
const first = main[0];
const last = main.reduce((a, r) => (r.endEpochMs > a.endEpochMs ? r : a), main[0]);
out.push('## Measurement window');
out.push(`- ${main.length} calls (plus ${by('smoke').length} smoke calls), host(s): ${[...new Set(main.map((r) => r.host))].join(', ')}`);
out.push(`- UTC ${first.startedAt.slice(0, 19).replace('T', ' ')} to ${new Date(last.endEpochMs).toISOString().slice(0, 19).replace('T', ' ')}; KST ${kst(first.startedAt)} to ${kst(new Date(last.endEpochMs).toISOString())} (${new Date(first.startEpochMs).toUTCString().slice(0, 3)})`);
const ttfbGap = Math.max(...nums(main.filter(ok), (r) => (r.firstContentMs != null && r.firstByteMs != null ? r.firstContentMs - r.firstByteMs : null)));
const hdrGap = Math.max(...nums(main.filter(ok), (r) => (r.firstByteMs != null && r.headersMs != null ? r.firstByteMs - r.headersMs : null)));
out.push(`- First byte vs first content token: max difference ${ttfbGap} ms; headers vs first byte: max ${hdrGap} ms (the server sends headers with the first token).`);
const overhead = nums(main.filter(ok), (r) => (serverMs(r) != null && r.headersMs != null ? r.headersMs - (serverMs(r) as number) : null));
out.push(`- Client-observed TTFB minus server req-cost-time (network + TLS + client): p50 ${Math.round(med(overhead))} ms, p95 ${Math.round(pct(overhead, 0.95))} ms, max ${Math.round(Math.max(...overhead))} ms.`);

// ---------- main TTFT table ----------
out.push('\n## TTFT by cell (seconds; TTFT = first content token)');
const rows: Array<Array<string | number>> = [
  ttftRow('1 cold 12k (nonce)', by('cold', 'cold-12k')),
  ttftRow('1 cold 24k (nonce)', by('cold', 'cold-24k')),
  ttftRow('2 warm implicit 12k', by('warm', 'implicit-12k').filter((r) => !r.label.includes('+hedge'))),
  ttftRow('2 warm implicit 24k', by('warm', 'implicit-24k').filter((r) => !r.label.includes('+hedge'))),
  ttftRow('3 warm explicit 24k', by('explicit', 'explicit-24k').filter((r) => !r.label.includes('+hedge'))),
  ttftRow('7 concurrent x4 implicit 24k', by('concurrency', 'implicit-x4')),
  ttftRow('7 concurrent x4 explicit 24k', by('concurrency', 'explicit-x4')),
  ttftRow('soak explicit 12k', by('soak', 'explicit-12k')),
  ttftRow('soak implicit 12k', by('soak', 'implicit-12k')),
  ttftRow('flash cold 12k', by('flash', 'flash-cold-12k')),
  ttftRow('flash warm implicit 12k', by('flash', 'flash-implicit-12k')),
  ttftRow('control: old filler 24k cold', by('control', 'old-filler-24k-cold')),
];
out.push(table(TTFT_HEAD, rows));

// Aggregates over every sequential qwen3.8-max call, split by actual cache state.
const seqMax = main.filter((r) => r.model === 'qwen3.8-max' && r.cell !== 'concurrency' && !r.label.includes('+hedge') && ok(r) && r.maxTokens === 32 && r.thinkingParam === 'enable_thinking:false');
const big = (r: Rec): boolean => (r.promptTokens ?? 0) >= 20000;
const mid = (r: Rec): boolean => (r.promptTokens ?? 0) >= 10000 && (r.promptTokens ?? 0) < 20000;
out.push('\nAll sequential qwen3.8-max calls (max_completion_tokens 32), grouped by the cache state the usage reported:');
out.push(table(TTFT_HEAD, [
  ttftRow('any cold ~12k', seqMax.filter((r) => mid(r) && (r.cachedTokens ?? 0) === 0)),
  ttftRow('any cold ~24k', seqMax.filter((r) => big(r) && (r.cachedTokens ?? 0) === 0)),
  ttftRow('any hit ~12k', seqMax.filter((r) => mid(r) && isHit(r))),
  ttftRow('any hit ~24k', seqMax.filter((r) => big(r) && isHit(r))),
]));

// ---------- stalls ----------
out.push('\n## Stalls and slow calls');
const warmAll = main.filter((r) => isHit(r));
const stalls = warmAll.filter((r) => (r.firstContentMs ?? Infinity) > 10000 || r.timedOut);
out.push(`- Warm calls (cache hit per usage): ${warmAll.length}. Warm TTFT over 10 s: ${stalls.length}.`);
for (const r of stalls) out.push(`  - ${r.startedAt} ${r.cell}/${r.sub} ${r.label}: TTFT ${sec(r.firstContentMs ?? NaN)} s, server ${serverMs(r)} ms, id ${r.respId}`);
const slow = main.filter((r) => ok(r) && (r.firstContentMs ?? 0) > 3000);
out.push(`- Any call with TTFT over 3 s: ${slow.length} of ${main.filter(ok).length}.`);
for (const r of slow) out.push(`  - ${r.startedAt} ${r.cell}/${r.sub} ${r.label} (${r.model}, prompt ${r.promptTokens}, cached ${r.cachedTokens}): TTFT ${sec(r.firstContentMs ?? NaN)} s, server req-cost-time ${serverMs(r)} ms`);
const errs = main.filter((r) => !ok(r));
out.push(`- Errors, timeouts or non-200: ${errs.length}.${errs.map((r) => ` ${r.cell}/${r.label} HTTP ${r.status} ${r.error}`).join(';')}`);
out.push(`- Hedges fired (no token after 10 s): ${main.filter((r) => r.label.includes('+hedge')).length}.`);
const mid429 = main.filter((r) => r.status === 429).length;
out.push(`- HTTP 429: ${mid429}.`);

// ---------- cache behaviour ----------
out.push('\n## Cache decay (qwen3.8-max; decay cell at ~24k, late probes at the size shown in "cached after")');
const decayRows: Array<Array<string | number>> = [];
for (const r of by('decay').filter((x) => x.label === 'probe')) {
  const verifyEnd = Number(r.meta.verifyEndEpochMs);
  decayRows.push([`${r.meta.gapTargetMin} min`, r.cacheMode, ((r.startEpochMs - verifyEnd) / 60000).toFixed(2), String(r.meta.verifyCached), `${r.cachedTokens}`, r.creationTokens ? String(r.creationTokens) : '0', isHit(r) ? 'warm' : 'cold', sec(r.firstContentMs ?? NaN), r.startedAt.slice(11, 19)]);
}
for (const r of by('late')) decayRows.push([`${r.meta.idleMin} min (late)`, r.cacheMode, Number(r.meta.idleMin).toFixed(2), '-', `${r.cachedTokens} of ${r.promptTokens}`, r.creationTokens ? String(r.creationTokens) : '0', isHit(r) ? 'warm' : 'cold', sec(r.firstContentMs ?? NaN), r.startedAt.slice(11, 19)]);
decayRows.sort((a, b) => Number(a[2]) - Number(b[2]) || String(a[1]).localeCompare(String(b[1])));
out.push(table(['gap', 'mode', 'actual idle (min)', 'cached before', 'cached after', 'created after', 'result', 'TTFT after', 'UTC'], decayRows));

// ---------- explicit cache confirmation ----------
out.push('\n## Explicit cache confirmation (explicit cell, in order)');
for (const r of by('explicit').slice(0, 4)) out.push(`- ${r.label} (${r.cacheMode}): ${JSON.stringify(r.usage?.prompt_tokens_details)}`);
const keys = [...new Set(all.filter((r) => r.cacheMode === 'explicit').flatMap((r) => r.usageKeys))].sort();
out.push(`- usage keys seen with cache_control: ${keys.join(', ')}`);

// ---------- chat history caching ----------
out.push('\n## Chat history caching (system ~12k + 2 real exchanges + current graph, qwen3.8-max)');
out.push(table(['variant', 'turn', 'prompt tok', 'cached', 'created', 'uncached', 'input USD', 'TTFT'], by('history').map((r) => {
  const created = r.creationTokens ?? 0;
  const cached = r.cachedTokens ?? 0;
  const p = r.promptTokens ?? 0;
  const inUsd = r.costUsd - (r.completionTokens ?? 0) * 6 / 1e6;
  return [r.sub, r.label, p, cached, created, p - cached - created, inUsd.toFixed(4), sec(r.firstContentMs ?? NaN)];
})));

// ---------- diagram turns ----------
out.push('\n## Diagram turns (e-commerce ask, max_completion_tokens 4096)');
const dRows: Array<Array<string | number>> = [];
const dGroups = [...new Set(by('diagram').map((r) => r.sub))];
for (const g of dGroups) {
  const rs = by('diagram', g);
  const fo = nums(rs, (r) => r.firstLineMs);
  const fn = nums(rs, (r) => r.firstNodeMs);
  const tot = nums(rs, (r) => r.totalMs);
  const outTok = nums(rs, (r) => r.completionTokens);
  const rate = nums(rs, (r) => (r.completionTokens && r.firstContentMs != null ? r.completionTokens / ((r.totalMs - r.firstContentMs) / 1000) : null));
  const done = rs.filter((r) => { const ls = r.lines ?? []; const lastOp = ls.length ? parseLine(ls[ls.length - 1][1]) : null; return lastOp?.t === 'done'; }).length;
  const lineGap = Math.max(...rs.map((r) => { const ls = r.lines ?? []; let m = 0; for (let i = 1; i < ls.length; i++) m = Math.max(m, ls[i][0] - ls[i - 1][0]); return m; }));
  dRows.push([g, rs.length, Math.round(med(nums(rs, (r) => r.promptTokens))), `${rs.filter(isHit).length}/${rs.length}`, sec(med(fo)), sec(Math.max(...fo)), sec(med(fn)), sec(med(tot)), sec(Math.max(...tot)), Math.round(med(outTok)), Math.round(med(nums(rs, (r) => r.ops ?? null))), `${done}/${rs.length}`, Math.round(med(rate)), sec(Math.max(...nums(rs, (r) => r.maxGapMs))), sec(lineGap)]);
}
out.push(table(['model / cache', 'n', 'prompt tok', 'hits', 'first op p50', 'first op max', 'first node p50', 'total p50', 'total max', 'out tok p50', 'ops p50', 'ends with done', 'tok/s p50', 'max chunk gap', 'max line gap'], dRows));
out.push('\nPer run:');
out.push(table(['model / cache', 'run', 'cached', 'TTFT', 'first op', 'total', 'out tok', 'ops', 'last op', 'UTC'], by('diagram').map((r) => {
  const ls = r.lines ?? [];
  const lastOp = ls.length ? parseLine(ls[ls.length - 1][1]) : null;
  return [r.sub, r.label, r.cachedTokens ?? '-', sec(r.firstContentMs ?? NaN), sec(r.firstLineMs ?? NaN), sec(r.totalMs), r.completionTokens ?? '-', r.ops ?? '-', lastOp?.t ?? 'cut mid-line', r.startedAt.slice(11, 19)];
})));

// ---------- parameters ----------
out.push('\n## Parameters');
out.push(table(['sub', 'label', 'HTTP', 'TTFT', 'total', 'prompt', 'cached', 'reasoning chars', 'reasoning tok', 'finish', 'content head'], by('params').map((r) => [r.sub, r.label, r.status ?? '-', sec(r.firstContentMs ?? NaN), sec(r.totalMs), r.promptTokens ?? '-', r.cachedTokens ?? '-', r.reasoningChars, r.reasoningTokens ?? '-', r.finish ?? '-', '`' + r.content.slice(0, 40).replace(/\|/g, '/').replace(/\n/g, ' ') + '`'])));

// ---------- concurrency ----------
out.push('\n## Concurrency (4 parallel warm 24k calls per round)');
const cRows: Array<Array<string | number>> = [];
for (const mode of ['implicit', 'explicit']) {
  for (const round of [1, 2, 3]) {
    const rs = by('concurrency', `${mode}-x4`).filter((r) => r.meta.round === round);
    if (!rs.length) continue;
    const t = nums(rs, (r) => r.firstContentMs);
    cRows.push([mode, round, t.map((x) => sec(x)).join(', '), sec(Math.max(...t)), `${rs.filter(isHit).length}/4`, rs.filter((r) => !ok(r)).length]);
  }
}
out.push(table(['mode', 'round', 'TTFT of the 4', 'max', 'hits', 'errors'], cRows));

// ---------- spend ----------
out.push('\n## Spend at list price (USD)');
const spend: Record<string, { n: number; usd: number; inTok: number; cached: number; outTok: number }> = {};
for (const r of all) {
  const k = r.cell;
  spend[k] = spend[k] ?? { n: 0, usd: 0, inTok: 0, cached: 0, outTok: 0 };
  spend[k].n++;
  spend[k].usd += r.costUsd;
  spend[k].inTok += r.promptTokens ?? 0;
  spend[k].cached += r.cachedTokens ?? 0;
  spend[k].outTok += r.completionTokens ?? 0;
}
const sRows = Object.entries(spend).map(([k, v]) => [k, v.n, v.inTok, v.cached, v.outTok, v.usd.toFixed(4)]);
const tot = Object.values(spend).reduce((a, v) => ({ n: a.n + v.n, usd: a.usd + v.usd, inTok: a.inTok + v.inTok, cached: a.cached + v.cached, outTok: a.outTok + v.outTok }), { n: 0, usd: 0, inTok: 0, cached: 0, outTok: 0 });
sRows.push(['**total**', tot.n, tot.inTok, tot.cached, tot.outTok, `**${tot.usd.toFixed(4)}**`]);
out.push(table(['cell', 'calls', 'prompt tokens', 'cached tokens', 'output tokens', 'USD'], sRows));
const m37 = all.filter((r) => r.model === 'qwen3.7-max');
out.push(`\nqwen3.7-max calls are billed above with cached tokens at the full $2.5/M input price (its cache price was not researched): $${m37.reduce((s, r) => s + r.costUsd, 0).toFixed(4)} for ${m37.length} calls, ${m37.reduce((s, r) => s + (r.cachedTokens ?? 0), 0)} of them cached tokens.`);

console.log(out.join('\n'));
