// Report for eval/claude-check.ts results.
//   node eval/claude-check-report.ts <results dir> [--baseline <Qwen results dir>] [--json]
// Compares the Claude-as-primary runs (mode format) with the Qwen runs of the same cases, or lists the timings of a rescue
// run (mode rescue). Pure reading of runs.jsonl; no network.
import path from 'node:path';
import { readJsonl } from './claude-check.ts';
import { percentile } from './lib.ts';
import type { RunRecord, TurnRecord } from './records.ts';

const BASELINE = path.join(import.meta.dirname, 'results', '2026-10-31T18-06-03-p1b-final-full');

const sum = (xs: number[]): number => xs.reduce((s, x) => s + x, 0);
const mean = (xs: number[]): number | null => (xs.length ? sum(xs) / xs.length : null);
const pct = (n: number, d: number): string => (d ? `${((100 * n) / d).toFixed(0)}% (${n}/${d})` : 'n/a');
const ms = (x: number | null): string => (x === null ? '-' : `${Math.round(x)}`);
const usd = (x: number | null): string => (x === null ? '-' : `$${x.toFixed(4)}`);

interface Agg {
  conversations: number;
  convPass: number;
  turns: number;
  turnPass: number;
  byType: Record<string, { checks: number; passed: number }>;
  formatFail: number;
  badLines: number;
  escapes: number;
  repairTurns: number;
  warnPre: Record<string, number>;
  firstOp: number[];
  firstSay: number[];
  firstNode: number[];
  total: number[];
  turnMs: number[];
  cost: number[];
  out: number[];
  asks: number;
  assumes: number;
  askTurns: number;
  assumeTurns: number;
  sayLangFails: number;
  badSamples: string[];
  apiErrors: string[];
  refusals: number;
  rescueOk: number;
  rescueN: number;
  cachedShare: number[];
}

function aggregate(runs: RunRecord[]): Agg {
  const a: Agg = { conversations: runs.length, convPass: 0, turns: 0, turnPass: 0, byType: {}, formatFail: 0, badLines: 0, escapes: 0, repairTurns: 0, warnPre: {}, firstOp: [], firstSay: [], firstNode: [], total: [], turnMs: [], cost: [], out: [], asks: 0, assumes: 0, askTurns: 0, assumeTurns: 0, sayLangFails: 0, badSamples: [], apiErrors: [], refusals: 0, rescueOk: 0, rescueN: 0, cachedShare: [] };
  for (const r of runs) {
    if (r.pass) a.convPass++;
    if (r.apiError) a.apiErrors.push(`${r.id}: ${r.apiError}`);
    for (const t of r.turns as TurnRecord[]) {
      a.turns++;
      if (t.pass) a.turnPass++;
      for (const x of t.assertions) {
        const b = (a.byType[x.type] ??= { checks: 0, passed: 0 });
        b.checks++;
        if (x.pass) b.passed++;
        if (x.type === 'format' && !x.pass) a.formatFail++;
        if ((x.type === 'sayLang' || x.type === 'whyLang' || x.type === 'askLang') && !x.pass) a.sayLangFails++;
      }
      const s = t.stats;
      a.badLines += s.badLines;
      a.escapes += s.escapes;
      if (s.repair) a.repairTurns++;
      for (const w of s.warningsBefore) a.warnPre[w.code] = (a.warnPre[w.code] ?? 0) + 1;
      if (s.firstOpMs !== null) a.firstOp.push(s.firstOpMs);
      if (s.firstSayMs !== null) a.firstSay.push(s.firstSayMs);
      if (s.firstNodeMs !== null) a.firstNode.push(s.firstNodeMs);
      a.total.push(s.totalMs);
      a.turnMs.push(s.turnMs);
      a.cost.push(s.costUsd);
      a.out.push(s.completionTokens);
      if (s.promptTokens > 0) a.cachedShare.push(s.cachedTokens / s.promptTokens);
      if ((t.questions ?? []).length) {
        a.asks += t.questions!.length;
        a.askTurns++;
      }
      if ((t.assumptions ?? []).length) {
        a.assumes += t.assumptions!.length;
        a.assumeTurns++;
      }
      if (s.rescue) {
        a.rescueN++;
        if (s.rescue.ok) a.rescueOk++;
        if (s.rescue.error?.code === 'refusal') a.refusals++;
      }
      // Lines of the raw content that are not JSON: the op-format incompatibilities, first 3 per run kept.
      const bad = t.content.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('{'));
      for (const l of bad) if (a.badSamples.length < 12) a.badSamples.push(`${r.id}: ${l.slice(0, 120)}`);
    }
  }
  return a;
}

function row(name: string, a: Agg): string[] {
  const lat = (xs: number[]): string => `${ms(percentile(xs, 0.5))} / ${ms(percentile(xs, 0.9))}`;
  return [
    `| ${name} | ${pct(a.convPass, a.conversations)} | ${pct(a.turnPass, a.turns)} | ${lat(a.firstOp)} | ${lat(a.total)} | ${lat(a.turnMs)} | ${usd(mean(a.cost))} | ${ms(mean(a.out))} |`,
  ];
}

function typeTable(c: Agg, q: Agg | null): string[] {
  const types = Object.keys(c.byType).sort();
  const out = ['| assertion | Claude | Qwen (same cases) |', '| --- | ---: | ---: |'];
  for (const t of types) {
    const x = c.byType[t];
    const y = q?.byType[t];
    out.push(`| ${t} | ${x.passed}/${x.checks} | ${y ? `${y.passed}/${y.checks}` : '-'} |`);
  }
  return out;
}

function main(): void {
  const argv = process.argv.slice(2);
  const dir = path.resolve(argv.find((x) => !x.startsWith('--')) ?? '.');
  const bi = argv.indexOf('--baseline');
  const baseDir = bi >= 0 ? path.resolve(argv[bi + 1]) : BASELINE;
  const runs = readJsonl<RunRecord & { extra?: Array<{ cut?: { lines: number; cutAtMs: number | null; cut: boolean }; statusTimes: Array<{ code: string; provider?: string; atMs: number }> }> }>(path.join(dir, 'runs.jsonl'));
  const mode = path.basename(dir).includes('rescue') ? 'rescue' : 'format';
  const out: string[] = [];
  if (mode === 'format') {
    const ids = new Set(runs.map((r) => r.case));
    const baseRuns = readJsonl<RunRecord>(path.join(baseDir, 'runs.jsonl')).filter((r) => ids.has(r.case));
    const c = aggregate(runs);
    const q = aggregate(baseRuns);
    out.push(`# Claude as primary: ${runs.length} conversations, ${c.turns} turns (Qwen baseline: ${baseRuns.length} conversations, ${q.turns} turns of the same cases, ${path.basename(baseDir)})`, '');
    out.push('| model | conv pass | turn pass | first op ms p50 / p90 | main stream ms p50 / p90 | turn ms p50 / p90 | cost per turn | output tokens per turn |', '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
    out.push(...row('claude-opus-5-5 (effort low)', c), ...row('qwen3.8-max', q), '');
    out.push(`total Claude cost ${usd(sum(c.cost))} over ${c.turns} turns; cache share of prompt tokens: mean ${mean(c.cachedShare) === null ? '-' : (100 * mean(c.cachedShare)!).toFixed(0) + '%'}`, '');
    out.push(`op-format: bad lines Claude ${c.badLines} vs Qwen ${q.badLines}; format-assertion failures ${c.formatFail} vs ${q.formatFail}; \\u escapes ${c.escapes} vs ${q.escapes}; turns needing a follow-up (repair/continue) ${c.repairTurns}/${c.turns} vs ${q.repairTurns}/${q.turns}`);
    out.push(`language adherence (sayLang/whyLang/askLang failures): Claude ${c.sayLangFails} vs Qwen ${q.sayLangFails}`);
    out.push(`asks: Claude ${c.asks} questions in ${c.askTurns} turns, ${c.assumes} assumptions in ${c.assumeTurns} turns; Qwen (3 runs, divide by 3) ${q.asks} in ${q.askTurns} turns, ${q.assumes} in ${q.assumeTurns} turns`);
    out.push(`backup stats: ${c.rescueN} whole-turn runs, ok ${c.rescueOk}, refusals ${c.refusals}; api errors ${c.apiErrors.length}`);
    if (c.apiErrors.length) out.push(...c.apiErrors.map((e) => '  - ' + e));
    out.push('', '## Pre-repair warnings by code (turns)', '');
    const codes = new Set([...Object.keys(c.warnPre), ...Object.keys(q.warnPre)]);
    out.push('| code | Claude | Qwen (3 runs) |', '| --- | ---: | ---: |');
    for (const k of [...codes].sort((x, y) => (c.warnPre[y] ?? 0) - (c.warnPre[x] ?? 0))) out.push(`| ${k} | ${c.warnPre[k] ?? 0} | ${q.warnPre[k] ?? 0} |`);
    out.push('', '## Assertions', '', ...typeTable(c, q));
    out.push('', '## Failing conversations', '');
    for (const r of runs.filter((x) => !x.pass)) {
      const f = r.turns.flatMap((t) => t.assertions.filter((x) => !x.pass).map((x) => `turn ${t.index + 1} ${x.type}: ${x.detail ?? ''}`.slice(0, 220)));
      out.push(`- ${r.id}${r.apiError ? ' [API ' + r.apiError + ']' : ''}`, ...f.map((x) => '    ' + x));
    }
    if (c.badSamples.length) out.push('', '## Non-JSON lines in the raw content', '', ...c.badSamples.map((s) => '- ' + s));
    // Cold versus warm cost: the first turn of the run pays the cache write.
    const costs = runs.flatMap((r) => r.turns.map((t) => t.stats.costUsd)).sort((x, y) => x - y);
    out.push('', `cost per turn: min ${usd(costs[0])}, p50 ${usd(costs[Math.floor((costs.length - 1) * 0.5)])}, p90 ${usd(costs[Math.floor((costs.length - 1) * 0.9)])}, max ${usd(costs[costs.length - 1])}`);
    const stops = new Map<string, number>();
    for (const r of runs) for (const t of r.turns) stops.set(String(t.stats.finishReason), (stops.get(String(t.stats.finishReason)) ?? 0) + 1);
    out.push(`stop reasons: ${[...stops.entries()].map(([k, v]) => `${k} ${v}`).join(', ')}`);
  } else {
    out.push(`# Rescue check: ${runs.length} runs`, '');
    out.push('| run | cut after lines (cut at ms) | Qwen ops before cut | Claude ops | rescue | cut -> first Claude op ms | Claude call ms | turn ms | Claude cost | final nodes / edges | errors | partial nodes kept | pass |', '| --- | --- | ---: | ---: | --- | ---: | ---: | ---: | ---: | --- | ---: | --- | --- |');
    for (const r of runs) {
      const t = r.turns[0];
      if (!t) {
        out.push(`| ${r.id} | - | - | - | - | - | - | - | - | - | - | - | API ${r.apiError} |`);
        continue;
      }
      const ex = r.extra?.[0];
      const s = t.stats;
      const resc = s.rescue;
      const g = t.graph as { nodes?: Record<string, unknown>; edges?: Record<string, unknown> | unknown[] };
      const nNodes = Object.keys(g.nodes ?? {}).length;
      const nEdges = Array.isArray(g.edges) ? g.edges.length : Object.keys(g.edges ?? {}).length;
      const errs = s.warningsAfter.filter((w) => w.severity === 'error').length;
      const partial = t.content.split('\n').filter((l) => l.includes('"t":"node"')).map((l) => {
        try {
          return (JSON.parse(l) as { id: string }).id;
        } catch {
          return '';
        }
      }).filter(Boolean);
      const kept = partial.filter((id) => (g.nodes ?? {})[id] !== undefined).length;
      const fb = ex?.statusTimes.find((x) => x.code === 'fallback' && x.provider === 'claude');
      out.push(`| ${r.id} | ${ex?.cut?.lines ?? '-'} (${ms(ex?.cut?.cutAtMs ?? null)}) | ${s.ops} | ${resc?.ops ?? 0} | ${resc ? resc.kind + (resc.ok ? ' ok' : ' NOT ok') + (resc.servedModel ? ' served ' + resc.servedModel : '') : 'none'} | ${resc ? ms(resc.firstOpMs) + (fb ? ' (rescue starts at ' + ms(fb.atMs) + ')' : '') : '-'} | ${ms(resc?.totalMs ?? null)} | ${ms(s.turnMs)} | ${usd(resc?.costUsd ?? null)} | ${nNodes} / ${nEdges} | ${errs} | ${kept}/${partial.length} | ${t.pass ? 'yes' : 'NO'} |`);
    }
    out.push('', 'Failed assertions:');
    for (const r of runs) for (const t of r.turns) for (const x of t.assertions) if (!x.pass) out.push(`- ${r.id} ${x.type}: ${x.detail ?? ''}`.slice(0, 260));
  }
  console.log(out.join('\n'));
}

main();
