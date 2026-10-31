// Summary of an evaluation run: pass rates per case, category and assertion type, pass@N and majority, warning counts
// before and after repair, unknown products, latency percentiles, tokens and cost, reliability counters, language
// findings, multi-turn retention and judge agreement. Pure: takes the stored records, returns plain data.
//   node eval/summarize.ts <results dir>      (rewrites summary.json and summary.md)
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { countBy } from './lib.ts';
import type { EvalCase } from './lib.ts';
import type { JudgeRecord, RunMeta, RunRecord, TurnRecord } from './records.ts';

export interface Dist {
  n: number;
  p50: number | null;
  p95: number | null;
  mean: number | null;
  max: number | null;
}

export interface CaseSummary {
  id: string;
  category: string;
  lang: string;
  title: string;
  runs: number;
  passes: number;
  passRate: number;
  passAtN: boolean;
  majority: boolean;
  failed: Record<string, number>; // failed assertion name -> runs
  failedTypes: string[];
  meanCostUsd: number;
  meanMs: number;
  judge?: { run: number; mean: number; signoff: boolean; scores: [number, number, number, number]; defects: string[]; reasons: string[] };
  runPass: boolean[];
}

export interface Summary {
  meta: RunMeta;
  totals: {
    cases: number;
    conversations: number;
    turns: number;
    casePassRate: number; // pass@1: mean over cases of the share of runs that passed
    passAtN: number; // share of cases where at least one run passed
    majority: number; // share of cases where more than half of the runs passed
    allRuns: number; // share of cases where every run passed
    runPassRate: number;
    turnPassRate: number;
    assertionPassRate: number;
    assertions: number;
    apiFailures: number;
    costUsd: number;
  };
  byCategory: Record<string, { cases: number; runs: number; runPassRate: number; passAtN: number; majority: number; allRuns: number }>;
  byLang: Record<string, { cases: number; runs: number; runPassRate: number; passAtN: number; majority: number; allRuns: number }>;
  byAssertionType: Record<string, { checks: number; passed: number; rate: number; failingCases: string[] }>;
  cases: CaseSummary[];
  warnings: {
    preRepairByCode: Record<string, { total: number; perTurn: number; turns: number }>;
    postRepairByCode: Record<string, { total: number; perTurn: number; turns: number }>;
    preRepairBySeverity: Record<string, number>;
    postRepairBySeverity: Record<string, number>;
    fixesByCode: Record<string, number>;
    unknownProducts: { count: number; top: Array<[string, number]> };
    nonIdProducts: { count: number; top: Array<[string, number]> }; // product strings the model wrote that are not catalog ids (aliases, invented)
  };
  latency: {
    /** First token of the main-stream attempt that produced the result. */
    firstByteMs: Dist;
    /** First token as the user waits for it: failed attempts (stalls, errors) and backoff before the answering attempt included. */
    perceivedFirstByteMs: Dist;
    firstSayMs: Dist;
    firstOpMs: Dist;
    firstNodeMs: Dist;
    streamMs: Dist;
    turnMs: Dist;
    diagramStreamMs: Dist;
    productStreamMs: Dist;
    editStreamMs: Dist;
  };
  tokens: { prompt: number; cached: number; cacheHit: number; completion: number; completionPerTurn: Dist; costPerTurn: Dist; costPerConversation: Dist; costUsd: number };
  reliability: { turns: number; truncatedMain: number; continued: number; repairTurns: number; hedged: number; hedgeWon: number; fallbackUsed: number; retriedAttempts: number; apiFailures: number; badLines: number; escapes: number };
  /** Main-stream failovers to the fallback model: how often, why, how long the stalled attempt took, how fast the fallback answered. */
  failover: { turns: number; rate: number; byReason: Record<string, number>; stalledAttemptMs: Dist; fallbackFirstByteMs: Dist; perceivedFirstByteMs: Dist; turnMs: Dist; followUpFallbacks: number; examples: Array<{ case: string; run: number; turn: number; reasons: string[]; stalledMs: number; fallbackFirstByteMs: number | null }> };
  /** Main streams that ended without done, by cause, and how many the continuation turn rescued. */
  cutoff: { truncated: number; byCause: Record<string, number>; rescued: number; notRescued: number; rescuedPassing: number; turnPassRateExcludingRescued: number; list: Array<{ case: string; run: number; turn: number; cause: string; rescued: boolean; pass: boolean }> };
  /** Machine-checked constraint compliance: the eval's residency and pinned-constraint assertions, and the product's own constraint findings. */
  constraints: {
    residency: { checks: number; passed: number; rate: number; failing: Array<{ case: string; run: number; turn: number; detail: string }>; warnMentions: number; correctedByRepair: number; /** The independent scan (residency-scan.ts); absent in summaries written before it existed. */ scan?: { checks: number; passed: number; failing: Array<{ case: string; run: number; turn: number; detail: string }> } };
    pins: { checks: number; passed: number; rate: number; failing: Array<{ case: string; run: number; turn: number; name: string; detail: string }> };
    avoid: { checks: number; passed: number; rate: number };
    product: { turnsWithConstraints: number; findingsBefore: Record<string, { total: number; turns: number; error: number }>; findingsAfter: Record<string, { total: number; turns: number; error: number }> };
  };
  /** Deterministic repairs (validator fixes) by code, and the single LLM follow-up turn by trigger. */
  repairs: {
    fixesByCode: Record<string, { total: number; turns: number }>;
    followUps: { turns: number; byKind: Record<string, number>; byFindingCode: Record<string, number>; list: Array<{ case: string; run: number; turn: number; kind: string; model: string; findings: string[]; pass: boolean }> };
  };
  i18n: Record<string, { turns: number; completionPerTurn: number | null; ratioVsEnglish: number | null; promptPerTurn: number | null; sayLangPass: number; sayLangChecks: number; whyLangPass: number; whyLangChecks: number; escapes: number }>;
  multiturn: Array<{ case: string; turns: number; perTurnRetention: Array<{ turn: number; checks: number; passed: number }>; finalPassRate: number }>;
  judge: {
    model: string | null;
    judged: number; // cases with a judged run (the lowest judged run per case feeds means, sign-off and the case rows)
    runsJudged: number; // every judged run, including runs 2 and 3 of constraint cases
    /** Every judged run of the constraint cases. */
    constraintRuns: { runs: number; signoff: number | null; overall: number | null; noSignoff: Array<{ case: string; run: number; defects: string[] }> } | null;
    errors: number;
    means: { completeness: number; accuracy: number; rationality: number; readability: number; overall: number } | null;
    signoffRate: number | null;
    byCategory: Record<string, { n: number; overall: number; signoff: number }>;
    agreement: { n: number; agree: number; rate: number | null; tp: number; tn: number; fp: number; fn: number; meanScorePass: number | null; meanScoreFail: number | null; pointBiserial: number | null; disagreements: Array<{ case: string; run: number; assertions: 'pass' | 'fail'; judge: 'yes' | 'no'; failed: string[]; defects: string[] }> } | null;
    costUsd: number;
  };
  failures: Array<{ case: string; category: string; run: number; turn: number; type: string; name: string; detail: string }>;
}

const rate = (a: number, b: number): number => (b ? a / b : 0);
const r3 = (x: number): number => Math.round(x * 1000) / 1000;

/** Linear interpolation between closest ranks, without rounding (costs are fractions of a cent). */
function quantile(sorted: number[], p: number): number {
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

function dist(xs: Array<number | null | undefined>): Dist {
  const v = xs.filter((x): x is number => typeof x === 'number' && Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return { n: 0, p50: null, p95: null, mean: null, max: null };
  const mean = v.reduce((s, x) => s + x, 0) / v.length;
  const r = (x: number): number => (Math.abs(x) >= 100 ? Math.round(x) : Math.round(x * 1e5) / 1e5);
  return { n: v.length, p50: r(quantile(v, 0.5)), p95: r(quantile(v, 0.95)), mean: r(mean), max: v[v.length - 1] };
}

/** First token as the user waits for it: the failed attempts before the answering one, then its first token (retry backoff sleeps are not recorded per attempt and are left out). */
export function perceivedFirstByte(t: TurnRecord): number | null {
  if (t.stats.firstByteMs === null || t.stats.firstByteMs === undefined) return null;
  const earlier = (t.stats.attempts ?? []).slice(0, -1).reduce((s, a) => s + (a.totalMs ?? 0), 0);
  return earlier + t.stats.firstByteMs;
}

/** Why a main stream ended without done: a watchdog, a stream or network error, the token limit, or the model's own stop. */
export function cutoffCause(t: TurnRecord): string {
  const e = t.stats.error?.code;
  if (e) return e;
  if (t.stats.finishReason === 'length') return 'token-limit';
  return t.stats.finishReason ? `model-stop (${t.stats.finishReason})` : 'unknown';
}

const turnKind = (t: TurnRecord): 'diagram' | 'product' | 'none' => (Object.keys(t.graph.nodes).length ? 'diagram' : (t.graph.recs ?? []).length ? 'product' : 'none');

function bucket(runs: RunRecord[], cases: EvalCase[], key: (c: EvalCase) => string): Summary['byCategory'] {
  const out: Summary['byCategory'] = {};
  const byCase = new Map<string, RunRecord[]>();
  for (const r of runs) byCase.set(r.case, [...(byCase.get(r.case) ?? []), r]);
  const groups = new Map<string, EvalCase[]>();
  for (const c of cases) if (byCase.has(c.id)) groups.set(key(c), [...(groups.get(key(c)) ?? []), c]);
  for (const [k, cs] of groups) {
    const rs = cs.flatMap((c) => byCase.get(c.id) ?? []);
    const per = cs.map((c) => byCase.get(c.id) ?? []);
    out[k] = {
      cases: cs.length,
      runs: rs.length,
      runPassRate: r3(rate(rs.filter((r) => r.pass).length, rs.length)),
      passAtN: r3(rate(per.filter((p) => p.some((r) => r.pass)).length, cs.length)),
      majority: r3(rate(per.filter((p) => p.filter((r) => r.pass).length * 2 > p.length).length, cs.length)),
      allRuns: r3(rate(per.filter((p) => p.every((r) => r.pass)).length, cs.length)),
    };
  }
  return out;
}

function codeTable(lists: Array<Array<{ code: string }>>, turns: number): Record<string, { total: number; perTurn: number; turns: number }> {
  const total: Record<string, number> = {};
  const affected: Record<string, number> = {};
  for (const l of lists) {
    const seen = new Set<string>();
    for (const w of l) {
      total[w.code] = (total[w.code] ?? 0) + 1;
      seen.add(w.code);
    }
    for (const c of seen) affected[c] = (affected[c] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(total)
      .sort((a, b) => b[1] - a[1])
      .map(([c, n]) => [c, { total: n, perTurn: r3(n / Math.max(1, turns)), turns: affected[c] }]),
  );
}

export function summarize(runs: RunRecord[], judges: JudgeRecord[], meta: RunMeta, allCases: EvalCase[], catalogIds?: ReadonlySet<string>): Summary {
  const caseIds = new Set(runs.map((r) => r.case));
  const cases = allCases.filter((c) => caseIds.has(c.id));
  const turns: Array<{ run: RunRecord; t: TurnRecord }> = runs.flatMap((run) => run.turns.map((t) => ({ run, t })));
  const nTurns = turns.length;
  const byCase = new Map<string, RunRecord[]>();
  for (const r of runs) byCase.set(r.case, [...(byCase.get(r.case) ?? []), r].sort((a, b) => a.run - b.run));
  // The lowest judged run of each case feeds the case rows, means, sign-off and agreement (comparable with Phase 0, which
  // judged run 1 only); every judged run of a constraint case feeds judge.constraintRuns.
  const judgeByCase = new Map<string, JudgeRecord>();
  for (const j of judges.filter((x) => x.scores).sort((a, b) => b.run - a.run)) judgeByCase.set(j.case, j);

  // assertions
  const byType: Summary['byAssertionType'] = {};
  const failures: Summary['failures'] = [];
  let assertions = 0;
  let assertionsPassed = 0;
  for (const { run, t } of turns) {
    for (const a of t.assertions) {
      assertions++;
      const e = (byType[a.type] ??= { checks: 0, passed: 0, rate: 0, failingCases: [] });
      e.checks++;
      if (a.pass) {
        e.passed++;
        assertionsPassed++;
      } else {
        if (!e.failingCases.includes(run.case)) e.failingCases.push(run.case);
        failures.push({ case: run.case, category: run.category, run: run.run, turn: t.index + 1, type: a.type, name: a.name, detail: (a.detail ?? '').slice(0, 240) });
      }
    }
  }
  for (const e of Object.values(byType)) e.rate = r3(rate(e.passed, e.checks));

  // cases
  const caseRows: CaseSummary[] = cases.map((c) => {
    const rs = byCase.get(c.id) ?? [];
    const failed: Record<string, number> = {};
    const types = new Set<string>();
    for (const r of rs) {
      const names = new Set<string>();
      for (const t of r.turns) for (const a of t.assertions) if (!a.pass) (names.add(a.name), types.add(a.type));
      if (r.apiError) (names.add('api: ' + r.apiError.slice(0, 80)), types.add('api'));
      for (const n of names) failed[n] = (failed[n] ?? 0) + 1;
    }
    const j = judgeByCase.get(c.id);
    const s = j?.scores;
    const passes = rs.filter((r) => r.pass).length;
    return {
      id: c.id,
      category: c.category,
      lang: c.lang ?? 'en',
      title: c.title,
      runs: rs.length,
      passes,
      passRate: r3(rate(passes, rs.length)),
      passAtN: passes > 0,
      majority: passes * 2 > rs.length,
      failed,
      failedTypes: [...types],
      meanCostUsd: r3(rs.reduce((x, r) => x + r.costUsd, 0) / Math.max(1, rs.length)),
      meanMs: Math.round(rs.reduce((x, r) => x + r.wallMs, 0) / Math.max(1, rs.length)),
      judge: s && j ? { run: j.run, mean: r3((s.completeness + s.accuracy + s.rationality + s.readability) / 4), signoff: s.signoff, scores: [s.completeness, s.accuracy, s.rationality, s.readability], defects: s.defects, reasons: s.reasons } : undefined,
      runPass: rs.map((r) => r.pass),
    };
  });

  // warnings
  const before = turns.map(({ t }) => t.stats.warningsBefore ?? []);
  const after = turns.map(({ t }) => t.stats.warningsAfter ?? []);
  const sev = (ls: Array<Array<{ severity: string }>>): Record<string, number> => countBy(ls.flat(), (w) => w.severity);
  const fixes: Record<string, number> = {};
  for (const { t } of turns) for (const f of t.stats.fixes ?? []) fixes[f.code] = (fixes[f.code] ?? 0) + 1;
  const unknown: Record<string, number> = {};
  const nonId: Record<string, number> = {};
  for (const { t } of turns) {
    for (const w of t.stats.warningsBefore ?? []) {
      if (w.code === 'unknown-product') {
        const m = /'([^']+)'/.exec(w.msg);
        const k = m ? m[1] : w.msg.slice(0, 60);
        unknown[k] = (unknown[k] ?? 0) + 1;
      }
    }
    for (const p of t.rawProducts) if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p) || (catalogIds && !catalogIds.has(p))) nonId[p] = (nonId[p] ?? 0) + 1;
  }
  const top = (o: Record<string, number>, n = 15): Array<[string, number]> => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n);

  // latency (main stream, first attempt that produced the result)
  const kind = (k: 'diagram' | 'product'): TurnRecord[] => turns.filter(({ t }) => turnKind(t) === k).map(({ t }) => t);
  const isEdit = (run: RunRecord, t: TurnRecord): boolean => t.index > 0 || !!allCases.find((c) => c.id === run.case)?.base;
  const lat = {
    firstByteMs: dist(turns.map(({ t }) => t.stats.firstByteMs)),
    perceivedFirstByteMs: dist(turns.map(({ t }) => perceivedFirstByte(t))),
    firstSayMs: dist(turns.map(({ t }) => t.stats.firstSayMs)),
    firstOpMs: dist(turns.map(({ t }) => t.stats.firstOpMs)),
    firstNodeMs: dist(turns.map(({ t }) => t.stats.firstNodeMs)),
    streamMs: dist(turns.map(({ t }) => t.stats.totalMs)),
    turnMs: dist(turns.map(({ t }) => t.stats.turnMs)),
    diagramStreamMs: dist(kind('diagram').map((t) => t.stats.totalMs)),
    productStreamMs: dist(kind('product').map((t) => t.stats.totalMs)),
    editStreamMs: dist(turns.filter(({ run, t }) => turnKind(t) === 'diagram' && isEdit(run, t)).map(({ t }) => t.stats.totalMs)),
  };

  // tokens and cost
  const prompt = turns.reduce((s, { t }) => s + (t.stats.promptTokens ?? 0), 0);
  const cached = turns.reduce((s, { t }) => s + (t.stats.cachedTokens ?? 0), 0);
  const completion = turns.reduce((s, { t }) => s + (t.stats.completionTokens ?? 0), 0);
  const costUsd = runs.reduce((s, r) => s + r.costUsd, 0);

  // reliability
  const rel = {
    turns: nTurns,
    truncatedMain: turns.filter(({ t }) => t.stats.truncated).length,
    continued: turns.filter(({ t }) => t.stats.repair && (t.stats.repair.kind === 'continue' || t.stats.repair.kind === 'both')).length,
    repairTurns: turns.filter(({ t }) => t.stats.repair && (t.stats.repair.kind === 'repair' || t.stats.repair.kind === 'both')).length,
    hedged: turns.filter(({ t }) => t.stats.hedged).length,
    hedgeWon: turns.filter(({ t }) => t.stats.hedgeWon).length,
    fallbackUsed: turns.filter(({ t }) => t.stats.attempts.some((a) => a.model !== meta.model)).length,
    retriedAttempts: turns.reduce((s, { t }) => s + Math.max(0, t.stats.attempts.length - 1), 0),
    apiFailures: runs.filter((r) => r.apiError).length,
    badLines: turns.reduce((s, { t }) => s + (t.stats.badLines ?? 0), 0),
    escapes: turns.reduce((s, { t }) => s + (t.stats.escapes ?? 0), 0),
  };

  // failover: main-stream attempts on another model than the run's primary
  const failed = turns.filter(({ t }) => (t.stats.attempts ?? []).some((a) => a.model !== meta.model));
  const reasons: Record<string, number> = {};
  for (const { t } of failed) for (const a of (t.stats.attempts ?? []).slice(0, -1)) if (a.error) reasons[a.error.code] = (reasons[a.error.code] ?? 0) + 1;
  const stalled = failed.flatMap(({ t }) => (t.stats.attempts ?? []).filter((a) => a.model === meta.model && a.error).map((a) => a.totalMs));
  const failover: Summary['failover'] = {
    turns: failed.length,
    rate: r3(rate(failed.length, nTurns)),
    byReason: Object.fromEntries(Object.entries(reasons).sort((a, b) => b[1] - a[1])),
    stalledAttemptMs: dist(stalled),
    fallbackFirstByteMs: dist(failed.map(({ t }) => t.stats.firstByteMs)),
    perceivedFirstByteMs: dist(failed.map(({ t }) => perceivedFirstByte(t))),
    turnMs: dist(failed.map(({ t }) => t.stats.turnMs)),
    followUpFallbacks: turns.filter(({ t }) => t.stats.repair && t.stats.repair.model !== meta.model).length,
    examples: failed.slice(0, 20).map(({ run, t }) => ({
      case: run.case,
      run: run.run,
      turn: t.index + 1,
      reasons: (t.stats.attempts ?? []).slice(0, -1).map((a) => a.error?.code ?? 'ok'),
      stalledMs: (t.stats.attempts ?? []).slice(0, -1).reduce((s, a) => s + (a.totalMs ?? 0), 0),
      fallbackFirstByteMs: t.stats.firstByteMs ?? null,
    })),
  };

  // cut-off main streams and the continuation turn
  const cut = turns.filter(({ t }) => t.stats.truncated);
  const isRescued = (t: TurnRecord): boolean => !!t.stats.truncated && !!t.stats.finalDone;
  const notRescuedTurns = turns.filter(({ t }) => !isRescued(t));
  const cutoff: Summary['cutoff'] = {
    truncated: cut.length,
    byCause: countBy(cut, ({ t }) => cutoffCause(t)),
    rescued: cut.filter(({ t }) => isRescued(t)).length,
    notRescued: cut.filter(({ t }) => !isRescued(t)).length,
    rescuedPassing: cut.filter(({ t }) => isRescued(t) && t.pass).length,
    turnPassRateExcludingRescued: r3(rate(notRescuedTurns.filter(({ t }) => t.pass).length, notRescuedTurns.length)),
    list: cut.map(({ run, t }) => ({ case: run.case, run: run.run, turn: t.index + 1, cause: cutoffCause(t), rescued: isRescued(t), pass: t.pass })),
  };

  // constraint compliance
  const resid = turns.flatMap(({ run, t }) => t.assertions.filter((a) => a.type === 'residency').map((a) => ({ run, t, a })));
  const scanA = turns.flatMap(({ run, t }) => t.assertions.filter((a) => a.type === 'residencyScan').map((a) => ({ run, t, a })));
  const pinsA = turns.flatMap(({ run, t }) => t.assertions.filter((a) => a.type === 'pins').map((a) => ({ run, t, a })));
  const avoidA = turns.flatMap(({ t }) => t.assertions.filter((a) => (a.type === 'exclude' || a.type === 'retention') && a.name.startsWith('exclude ')));
  const CONSTRAINT = new Set(['constraint-region', 'constraint-avoid']);
  const findingTable = (pick: (t: TurnRecord) => Array<{ code: string; severity: string }>): Record<string, { total: number; turns: number; error: number }> => {
    const o: Record<string, { total: number; turns: number; error: number }> = {};
    for (const { t } of turns) {
      const ws = pick(t).filter((w) => CONSTRAINT.has(w.code));
      const seen = new Set<string>();
      for (const w of ws) {
        const e = (o[w.code] ??= { total: 0, turns: 0, error: 0 });
        e.total++;
        if (w.severity === 'error') e.error++;
        if (!seen.has(w.code)) (seen.add(w.code), e.turns++);
      }
    }
    return o;
  };
  const constraints: Summary['constraints'] = {
    residency: {
      checks: resid.length,
      passed: resid.filter((x) => x.a.pass).length,
      rate: r3(rate(resid.filter((x) => x.a.pass).length, resid.length)),
      failing: resid.filter((x) => !x.a.pass).map((x) => ({ case: x.run.case, run: x.run.run, turn: x.t.index + 1, detail: (x.a.detail ?? '').slice(0, 300) })),
      warnMentions: resid.filter((x) => (x.a.detail ?? '').includes('warn (not failed)')).length,
      correctedByRepair: resid.filter((x) => (x.a.detail ?? '').includes('corrected by the repair turn')).length,
      scan: {
        checks: scanA.length,
        passed: scanA.filter((x) => x.a.pass).length,
        failing: scanA.filter((x) => !x.a.pass).map((x) => ({ case: x.run.case, run: x.run.run, turn: x.t.index + 1, detail: (x.a.detail ?? '').slice(0, 300) })),
      },
    },
    pins: {
      checks: pinsA.length,
      passed: pinsA.filter((x) => x.a.pass).length,
      rate: r3(rate(pinsA.filter((x) => x.a.pass).length, pinsA.length)),
      failing: pinsA.filter((x) => !x.a.pass).map((x) => ({ case: x.run.case, run: x.run.run, turn: x.t.index + 1, name: x.a.name, detail: (x.a.detail ?? '').slice(0, 200) })),
    },
    avoid: { checks: avoidA.length, passed: avoidA.filter((a) => a.pass).length, rate: r3(rate(avoidA.filter((a) => a.pass).length, avoidA.length)) },
    product: {
      turnsWithConstraints: turns.filter(({ t }) => (t.constraints ?? []).length > 0).length,
      findingsBefore: findingTable((t) => t.stats.warningsBefore ?? []),
      findingsAfter: findingTable((t) => t.stats.warningsAfter ?? []),
    },
  };

  // repairs: deterministic fixes and the LLM follow-up turn
  const fixTable: Record<string, { total: number; turns: number }> = {};
  for (const { t } of turns) {
    const seen = new Set<string>();
    for (const f of t.stats.fixes ?? []) {
      const e = (fixTable[f.code] ??= { total: 0, turns: 0 });
      e.total++;
      if (!seen.has(f.code)) (seen.add(f.code), e.turns++);
    }
  }
  const follow = turns.filter(({ t }) => t.stats.repair);
  const byFinding: Record<string, number> = {};
  for (const { t } of follow) for (const c of new Set((t.stats.repair?.findings ?? []).map((w) => w.code))) byFinding[c] = (byFinding[c] ?? 0) + 1;
  const repairs: Summary['repairs'] = {
    fixesByCode: Object.fromEntries(Object.entries(fixTable).sort((a, b) => b[1].total - a[1].total)),
    followUps: {
      turns: follow.length,
      byKind: countBy(follow, ({ t }) => t.stats.repair!.kind),
      byFindingCode: Object.fromEntries(Object.entries(byFinding).sort((a, b) => b[1] - a[1])),
      list: follow.map(({ run, t }) => ({
        case: run.case,
        run: run.run,
        turn: t.index + 1,
        kind: t.stats.repair!.kind,
        model: t.stats.repair!.model,
        findings: (t.stats.repair!.findings ?? []).map((w) => `${w.code}/${w.severity}: ${w.msg}`.slice(0, 220)),
        pass: t.pass,
      })),
    },
  };

  // languages: completion tokens per turn and the share of say/why checks that passed, with the ratio against the English twin
  const i18n: Summary['i18n'] = {};
  const meanTokens = (rs: RunRecord[]): { c: number; p: number; n: number } => {
    const ts = rs.flatMap((r) => r.turns);
    return { c: ts.reduce((s, t) => s + (t.stats.completionTokens ?? 0), 0), p: ts.reduce((s, t) => s + (t.stats.promptTokens ?? 0), 0), n: ts.length };
  };
  for (const lang of ['en', 'ko', 'zh']) {
    const rs = runs.filter((r) => r.lang === lang);
    if (!rs.length) continue;
    const m = meanTokens(rs);
    const chk = (type: string): [number, number] => {
      const as = rs.flatMap((r) => r.turns.flatMap((t) => t.assertions.filter((a) => a.type === type)));
      return [as.filter((a) => a.pass).length, as.length];
    };
    // paired ratio: same turn index of the translated case and its English twin
    const ratios: number[] = [];
    if (lang !== 'en') {
      for (const c of cases.filter((x) => x.lang === lang && x.of)) {
        const twin = byCase.get(c.of!) ?? [];
        const mine = byCase.get(c.id) ?? [];
        const tw = twin.flatMap((r) => r.turns).filter((t) => t.index === 0);
        const my = mine.flatMap((r) => r.turns).filter((t) => t.index === 0);
        if (tw.length && my.length) ratios.push(my.reduce((s, t) => s + (t.stats.completionTokens ?? 0), 0) / my.length / (tw.reduce((s, t) => s + (t.stats.completionTokens ?? 0), 0) / tw.length));
      }
    }
    const [sp, sc] = chk('sayLang');
    const [wp, wc] = chk('whyLang');
    i18n[lang] = {
      turns: m.n,
      completionPerTurn: m.n ? Math.round(m.c / m.n) : null,
      ratioVsEnglish: ratios.length ? r3(ratios.reduce((s, x) => s + x, 0) / ratios.length) : null,
      promptPerTurn: m.n ? Math.round(m.p / m.n) : null,
      sayLangPass: sp,
      sayLangChecks: sc,
      whyLangPass: wp,
      whyLangChecks: wc,
      escapes: rs.flatMap((r) => r.turns).reduce((s, t) => s + (t.stats.escapes ?? 0), 0),
    };
  }

  // multi-turn retention
  const multiturn: Summary['multiturn'] = cases
    .filter((c) => c.turns.length > 1)
    .map((c) => {
      const rs = byCase.get(c.id) ?? [];
      const per = c.turns.map((_, i) => {
        const as = rs.flatMap((r) => r.turns.filter((t) => t.index === i).flatMap((t) => t.assertions.filter((a) => a.type === 'retention' || a.type === 'req' || a.type === 'residency')));
        return { turn: i + 1, checks: as.length, passed: as.filter((a) => a.pass).length };
      });
      return { case: c.id, turns: c.turns.length, perTurnRetention: per, finalPassRate: r3(rate(rs.filter((r) => r.pass).length, rs.length)) };
    });

  // judge
  const scored = cases.map((c) => ({ c, j: judgeByCase.get(c.id) })).filter((x): x is { c: EvalCase; j: JudgeRecord } => !!x.j);
  const mean = (xs: number[]): number => (xs.length ? r3(xs.reduce((s, x) => s + x, 0) / xs.length) : 0);
  const overall = (j: JudgeRecord): number => (j.scores!.completeness + j.scores!.accuracy + j.scores!.rationality + j.scores!.readability) / 4;
  let agreement: Summary['judge']['agreement'] = null;
  if (scored.length) {
    let tp = 0;
    let tn = 0;
    let fp = 0;
    let fn = 0;
    const dis: NonNullable<Summary['judge']['agreement']>['disagreements'] = [];
    const passScores: number[] = [];
    const failScores: number[] = [];
    const xs: number[] = [];
    const ys: number[] = [];
    for (const { c, j } of scored) {
      const run = (byCase.get(c.id) ?? []).find((r) => r.run === j.run);
      if (!run) continue;
      const ap = run.pass;
      const jy = j.scores!.signoff;
      if (ap && jy) tp++;
      else if (!ap && !jy) tn++;
      else if (ap && !jy) fp++;
      else fn++;
      (ap ? passScores : failScores).push(overall(j));
      xs.push(ap ? 1 : 0);
      ys.push(overall(j));
      if (ap !== jy) {
        dis.push({
          case: c.id,
          run: run.run,
          assertions: ap ? 'pass' : 'fail',
          judge: jy ? 'yes' : 'no',
          failed: [...new Set(run.turns.flatMap((t) => t.assertions.filter((a) => !a.pass).map((a) => a.name)))].slice(0, 4),
          defects: j.scores!.defects.slice(0, 3),
        });
      }
    }
    const n = tp + tn + fp + fn;
    const mx = mean(xs);
    const my = mean(ys);
    const cov = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
    const vx = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
    const vy = ys.reduce((s, y) => s + (y - my) ** 2, 0);
    agreement = {
      n,
      agree: tp + tn,
      rate: n ? r3((tp + tn) / n) : null,
      tp,
      tn,
      fp,
      fn,
      meanScorePass: passScores.length ? mean(passScores) : null,
      meanScoreFail: failScores.length ? mean(failScores) : null,
      pointBiserial: vx > 0 && vy > 0 ? r3(cov / Math.sqrt(vx * vy)) : null,
      disagreements: dis,
    };
  }
  const judgeByCat: Summary['judge']['byCategory'] = {};
  for (const { c, j } of scored) {
    const e = (judgeByCat[c.category] ??= { n: 0, overall: 0, signoff: 0 });
    e.n++;
    e.overall += overall(j);
    e.signoff += j.scores!.signoff ? 1 : 0;
  }
  for (const e of Object.values(judgeByCat)) {
    e.overall = r3(e.overall / e.n);
    e.signoff = r3(e.signoff / e.n);
  }
  const everyRun = new Set(meta.judgeAllRunsOf ?? []);
  const cJudged = judges.filter((j) => j.scores && everyRun.has(j.case) && caseIds.has(j.case));
  const constraintRuns: Summary['judge']['constraintRuns'] = cJudged.length
    ? {
        runs: cJudged.length,
        signoff: r3(rate(cJudged.filter((j) => j.scores!.signoff).length, cJudged.length)),
        overall: mean(cJudged.map(overall)),
        noSignoff: cJudged.filter((j) => !j.scores!.signoff).sort((a, b) => a.case.localeCompare(b.case) || a.run - b.run).map((j) => ({ case: j.case, run: j.run, defects: j.scores!.defects.slice(0, 3) })),
      }
    : null;

  return {
    meta,
    totals: {
      cases: cases.length,
      conversations: runs.length,
      turns: nTurns,
      casePassRate: r3(mean(caseRows.map((c) => c.passRate))),
      passAtN: r3(rate(caseRows.filter((c) => c.passAtN).length, caseRows.length)),
      majority: r3(rate(caseRows.filter((c) => c.majority).length, caseRows.length)),
      allRuns: r3(rate(caseRows.filter((c) => c.passes === c.runs).length, caseRows.length)),
      runPassRate: r3(rate(runs.filter((r) => r.pass).length, runs.length)),
      turnPassRate: r3(rate(turns.filter(({ t }) => t.pass).length, nTurns)),
      assertionPassRate: r3(rate(assertionsPassed, assertions)),
      assertions,
      apiFailures: rel.apiFailures,
      costUsd: r3(costUsd),
    },
    byCategory: bucket(runs, cases, (c) => c.category),
    byLang: bucket(runs, cases, (c) => c.lang ?? 'en'),
    byAssertionType: Object.fromEntries(Object.entries(byType).sort((a, b) => a[1].rate - b[1].rate)),
    cases: caseRows,
    warnings: {
      preRepairByCode: codeTable(before, nTurns),
      postRepairByCode: codeTable(after, nTurns),
      preRepairBySeverity: sev(before),
      postRepairBySeverity: sev(after),
      fixesByCode: Object.fromEntries(Object.entries(fixes).sort((a, b) => b[1] - a[1])),
      unknownProducts: { count: Object.values(unknown).reduce((s, x) => s + x, 0), top: top(unknown) },
      nonIdProducts: { count: Object.values(nonId).reduce((s, x) => s + x, 0), top: top(nonId) },
    },
    latency: lat,
    tokens: {
      prompt,
      cached,
      cacheHit: r3(rate(cached, prompt)),
      completion,
      completionPerTurn: dist(turns.map(({ t }) => t.stats.completionTokens)),
      costPerTurn: dist(turns.map(({ t }) => t.stats.costUsd)),
      costPerConversation: dist(runs.map((r) => r.costUsd)),
      costUsd: r3(costUsd),
    },
    reliability: rel,
    failover,
    cutoff,
    constraints,
    repairs,
    i18n,
    multiturn,
    judge: {
      model: judges.find((j) => j.scores)?.model ?? meta.judgeModel ?? null,
      judged: scored.length,
      runsJudged: judges.filter((j) => j.scores && caseIds.has(j.case)).length,
      constraintRuns,
      errors: judges.filter((j) => !j.scores).length,
      means: scored.length
        ? {
            completeness: mean(scored.map((x) => x.j.scores!.completeness)),
            accuracy: mean(scored.map((x) => x.j.scores!.accuracy)),
            rationality: mean(scored.map((x) => x.j.scores!.rationality)),
            readability: mean(scored.map((x) => x.j.scores!.readability)),
            overall: mean(scored.map((x) => overall(x.j))),
          }
        : null,
      signoffRate: scored.length ? r3(rate(scored.filter((x) => x.j.scores!.signoff).length, scored.length)) : null,
      byCategory: judgeByCat,
      agreement,
      costUsd: r3(judges.reduce((s, j) => s + j.costUsd, 0)),
    },
    failures,
  };
}

// ---------- markdown ----------

const pc = (x: number): string => `${(x * 100).toFixed(0)}%`;
const ms = (x: number | null): string => (x === null ? '-' : x >= 10000 ? `${(x / 1000).toFixed(1)} s` : x >= 1000 ? `${(x / 1000).toFixed(2)} s` : `${x} ms`);
const usd = (x: number | null, d = 4): string => (x === null ? '-' : `$${x.toFixed(d)}`);
const row = (cells: Array<string | number>): string => `| ${cells.join(' | ')} |`;
const table = (head: string[], rows: Array<Array<string | number>>): string => [row(head), row(head.map((_, i) => (i === 0 ? '---' : '---:'))), ...rows.map(row)].join('\n');

export function renderSummaryMd(s: Summary): string {
  const t = s.totals;
  const out: string[] = [];
  out.push(`# Evaluation summary`, '');
  out.push(`Model ${s.meta.model} (fallback ${s.meta.fallbackModel}), catalog ${s.meta.catalogVersion} (${s.meta.catalogEntries} entries), system prompt ${s.meta.systemPromptChars} chars (sha256 ${s.meta.systemPromptSha256.slice(0, 12)}), ${s.meta.runsPerCase} runs per case, started ${s.meta.startedAt}.`, '');
  out.push(`## Overall`, '');
  out.push(`**pass@1 ${pc(t.casePassRate)}, all ${s.meta.runsPerCase} runs pass ${pc(t.allRuns)}** (${t.cases} cases). pass@${s.meta.runsPerCase} is best-of-${s.meta.runsPerCase} and is listed last.`, '');
  out.push(
    table(
      ['measure', 'value'],
      [
        ['cases / conversations / turns', `${t.cases} / ${t.conversations} / ${t.turns}`],
        ['pass@1 (mean case pass rate)', pc(t.casePassRate)],
        ['all runs pass', pc(t.allRuns)],
        ['majority (over half the runs pass)', pc(t.majority)],
        [`pass@${s.meta.runsPerCase} (some run passes)`, pc(t.passAtN)],
        ['conversations passing every assertion', pc(t.runPassRate)],
        ['turns passing every assertion', pc(t.turnPassRate)],
        [`assertions passing (${t.assertions} checks)`, pc(t.assertionPassRate)],
        ['conversations that hit an API failure', t.apiFailures],
        ['list-price cost of the model runs', usd(t.costUsd, 2)],
      ],
    ),
    '',
  );
  out.push(`## By category`, '');
  out.push(table(['category', 'cases', 'runs', 'run pass', 'all runs', 'majority', `pass@${s.meta.runsPerCase}`], Object.entries(s.byCategory).map(([k, v]) => [k, v.cases, v.runs, pc(v.runPassRate), pc(v.allRuns), pc(v.majority), pc(v.passAtN)])), '');
  out.push(`## By language`, '');
  out.push(table(['language', 'cases', 'runs', 'run pass', 'all runs', 'majority', `pass@${s.meta.runsPerCase}`], Object.entries(s.byLang).map(([k, v]) => [k, v.cases, v.runs, pc(v.runPassRate), pc(v.allRuns), pc(v.majority), pc(v.passAtN)])), '');
  out.push(`## By assertion type (worst first)`, '');
  out.push(table(['type', 'checks', 'passed', 'rate', 'cases that failed it'], Object.entries(s.byAssertionType).map(([k, v]) => [k, v.checks, v.passed, pc(v.rate), v.failingCases.length])), '');
  const weak = s.cases.filter((c) => c.passRate < 1).sort((a, b) => a.passRate - b.passRate);
  out.push(`## Cases below 100% (${weak.length} of ${s.cases.length})`, '');
  out.push(table(['case', 'runs passed', 'what failed'], weak.map((c) => [c.id, `${c.passes}/${c.runs}`, Object.entries(c.failed).slice(0, 3).map(([n, k]) => `${n} (${k})`).join('; ').replace(/\|/g, '/')])), '');
  out.push(`## Warnings before and after deterministic repair`, '');
  const codes = [...new Set([...Object.keys(s.warnings.preRepairByCode), ...Object.keys(s.warnings.postRepairByCode)])];
  out.push(
    table(
      ['code', 'before: total', 'per turn', 'turns', 'after: total', 'per turn', 'fixed by repair'],
      codes.map((c) => [c, s.warnings.preRepairByCode[c]?.total ?? 0, s.warnings.preRepairByCode[c]?.perTurn ?? 0, s.warnings.preRepairByCode[c]?.turns ?? 0, s.warnings.postRepairByCode[c]?.total ?? 0, s.warnings.postRepairByCode[c]?.perTurn ?? 0, s.warnings.fixesByCode[c] ?? 0]),
    ),
    '',
  );
  out.push(`Severity before repair ${JSON.stringify(s.warnings.preRepairBySeverity)}, after ${JSON.stringify(s.warnings.postRepairBySeverity)}. Unknown products: ${s.warnings.unknownProducts.count} (${s.warnings.unknownProducts.top.slice(0, 8).map(([k, n]) => `${k} x${n}`).join(', ') || 'none'}). Product strings that were not catalog ids: ${s.warnings.nonIdProducts.count} (${s.warnings.nonIdProducts.top.slice(0, 8).map(([k, n]) => `${k} x${n}`).join(', ') || 'none'}).`, '');
  out.push(`## Latency (main stream)`, '');
  const L = s.latency;
  out.push(table(['measure', 'n', 'p50', 'p95', 'max'], [['first token (answering attempt)', L.firstByteMs], ['first token as waited for (failed attempts included)', L.perceivedFirstByteMs], ['first say', L.firstSayMs], ['first op', L.firstOpMs], ['first node', L.firstNodeMs], ['stream total (all turns)', L.streamMs], ['stream total, new diagrams', L.diagramStreamMs], ['stream total, edits', L.editStreamMs], ['stream total, product answers', L.productStreamMs], ['whole turn incl. retries and follow-up', L.turnMs]].map(([k, d]) => [k as string, (d as Dist).n, ms((d as Dist).p50), ms((d as Dist).p95), ms((d as Dist).max)])), '');
  out.push(`## Tokens and cost`, '');
  const T = s.tokens;
  out.push(table(['measure', 'value'], [['prompt tokens', T.prompt], ['cached prompt tokens', `${T.cached} (${pc(T.cacheHit)})`], ['completion tokens', T.completion], ['completion tokens per turn p50 / p95', `${T.completionPerTurn.p50} / ${T.completionPerTurn.p95}`], ['cost per turn mean / p95', `${usd(T.costPerTurn.mean)} / ${usd(T.costPerTurn.p95)}`], ['cost per conversation mean / p95', `${usd(T.costPerConversation.mean)} / ${usd(T.costPerConversation.p95)}`], ['total', usd(T.costUsd, 2)]]), '');
  out.push(`## Reliability`, '');
  const R = s.reliability;
  out.push(table(['counter', 'value'], [['turns', R.turns], ['main stream ended without done (truncated)', R.truncatedMain], ['continuation turns', R.continued], ['repair turns', R.repairTurns], ['hedged turns / hedge won', `${R.hedged} / ${R.hedgeWon}`], ['turns that used the fallback model', R.fallbackUsed], ['extra attempts after failures', R.retriedAttempts], ['conversations with an API failure', R.apiFailures], ['bad (unparseable) lines', R.badLines], ['\\u escapes', R.escapes]]), '');
  const F = s.failover;
  if (F) {
    out.push(`## Failover to the fallback model`, '');
    out.push(`${F.turns} of ${s.totals.turns} turns (${pc(F.rate)}) failed over in the main stream; reasons ${JSON.stringify(F.byReason)}. Follow-up turns that ran on another model: ${F.followUpFallbacks}.`, '');
    if (F.turns) out.push(table(['measure', 'n', 'p50', 'p95', 'max'], [['stalled attempt before failover', F.stalledAttemptMs], ['fallback first token', F.fallbackFirstByteMs], ['first token as waited for', F.perceivedFirstByteMs], ['whole turn', F.turnMs]].map(([k, d]) => [k as string, (d as Dist).n, ms((d as Dist).p50), ms((d as Dist).p95), ms((d as Dist).max)])), '');
  }
  const C = s.cutoff;
  if (C) {
    out.push(`## Cut-off turns`, '');
    out.push(`Main streams that ended without done: ${C.truncated} (${JSON.stringify(C.byCause)}). Rescued by the continuation turn: ${C.rescued} (${C.rescuedPassing} of them pass every assertion); not rescued: ${C.notRescued}. Turn pass rate without the rescued turns: ${pc(C.turnPassRateExcludingRescued)}.`, '');
  }
  const K = s.constraints;
  if (K) {
    out.push(`## Constraint compliance (machine-checked)`, '');
    out.push(
      table(
        ['check', 'passed', 'rate'],
        [
          ['residency (final graph and final narration, core checker)', `${K.residency.passed}/${K.residency.checks}`, K.residency.checks ? pc(K.residency.rate) : '-'],
          ...(K.residency.scan && K.residency.scan.checks ? [['residency, independent scan (own place table and cue words; shares no code with the checker)', `${K.residency.scan.passed}/${K.residency.scan.checks}`, pc(K.residency.scan.passed / K.residency.scan.checks)]] : []),
          ['pinned constraints as data (req regions / avoid)', `${K.pins.passed}/${K.pins.checks}`, K.pins.checks ? pc(K.pins.rate) : '-'],
          ['avoided products absent (exclude and retained exclude)', `${K.avoid.passed}/${K.avoid.checks}`, K.avoid.checks ? pc(K.avoid.rate) : '-'],
        ],
      ),
      '',
    );
    out.push(`Residency checks with a warn-level foreign-region mention (not failed, reviewed by hand): ${K.residency.warnMentions}. Residency checks where the product's repair turn corrected the main-stream narration: ${K.residency.correctedByRepair}. Turns with pinned constraints in memory: ${K.product.turnsWithConstraints}. Product constraint findings before repair ${JSON.stringify(K.product.findingsBefore)}, left after repair ${JSON.stringify(K.product.findingsAfter)}.`, '');
    if (K.residency.scan && K.residency.scan.failing.length) out.push('Independent residency scan hits (read each one: it errs towards flagging):', '', table(['case', 'run', 'turn', 'scan finding'], K.residency.scan.failing.map((f) => [f.case, f.run, f.turn, f.detail.replace(/\|/g, '/').slice(0, 220)])), '');
    if (K.residency.failing.length) out.push(table(['case', 'run', 'turn', 'residency finding'], K.residency.failing.map((f) => [f.case, f.run, f.turn, f.detail.replace(/\|/g, '/').slice(0, 220)])), '');
    if (K.pins.failing.length) out.push(table(['case', 'run', 'turn', 'pins check', 'pinned'], K.pins.failing.map((f) => [f.case, f.run, f.turn, f.name.replace(/\|/g, '/'), f.detail.replace(/\|/g, '/').slice(0, 160)])), '');
  }
  const P = s.repairs;
  if (P) {
    out.push(`## Repairs`, '');
    out.push(table(['deterministic fix', 'fixes', 'turns'], Object.entries(P.fixesByCode).map(([k, v]) => [k, v.total, v.turns])), '');
    out.push(`LLM follow-up turns: ${P.followUps.turns} (${JSON.stringify(P.followUps.byKind)}); turns by finding code ${JSON.stringify(P.followUps.byFindingCode)}.`, '');
    if (P.followUps.list.length) out.push(table(['case', 'run', 'turn', 'kind', 'turn passes', 'findings'], P.followUps.list.map((f) => [f.case, f.run, f.turn, f.kind, f.pass ? 'yes' : 'no', f.findings.join('; ').replace(/\|/g, '/').slice(0, 260)])), '');
  }
  out.push(`## Languages`, '');
  out.push(table(['language', 'turns', 'completion tokens / turn', 'vs English twin', 'prompt tokens / turn', 'say in language', 'why in language', '\\u escapes'], Object.entries(s.i18n).map(([k, v]) => [k, v.turns, v.completionPerTurn ?? '-', v.ratioVsEnglish ?? '-', v.promptPerTurn ?? '-', `${v.sayLangPass}/${v.sayLangChecks}`, `${v.whyLangPass}/${v.whyLangChecks}`, v.escapes])), '');
  out.push(`## Multi-turn retention`, '');
  out.push(table(['case', 'turns', 'retention checks passed per turn', 'run pass'], s.multiturn.map((m) => [m.case, m.turns, m.perTurnRetention.map((p) => `${p.passed}/${p.checks}`).join('  '), pc(m.finalPassRate)])), '');
  const J = s.judge;
  out.push(`## Judge (${J.model ?? 'off'})`, '');
  if (J.means) {
    out.push(table(['measure', 'value'], [['runs judged / judge errors', `${J.judged} / ${J.errors}`], ['completeness', J.means.completeness], ['accuracy', J.means.accuracy], ['rationality', J.means.rationality], ['readability', J.means.readability], ['overall', J.means.overall], ['architect would sign off', pc(J.signoffRate ?? 0)], ['judge cost', usd(J.costUsd, 3)]]), '');
    out.push(table(['category', 'judged', 'overall score', 'sign-off'], Object.entries(J.byCategory).map(([k, v]) => [k, v.n, v.overall, pc(v.signoff)])), '');
    const cr = J.constraintRuns;
    if (cr) {
      out.push(`Every run of the constraint cases: ${cr.runs} runs judged, sign-off ${pc(cr.signoff ?? 0)}, mean ${cr.overall}. (Total judged runs: ${J.runsJudged}.)`, '');
      if (cr.noSignoff.length) out.push(table(['case', 'run', 'judge defects'], cr.noSignoff.map((d) => [d.case, d.run, d.defects.join('; ').replace(/\|/g, '/').slice(0, 220)])), '');
    }
    const g = J.agreement;
    if (g) {
      out.push(`Agreement between the judged run's assertions and the judge's sign-off: ${g.agree}/${g.n} (${g.rate === null ? '-' : pc(g.rate)}). Assertions pass and judge yes ${g.tp}, both no ${g.tn}, assertions pass but judge no ${g.fp}, assertions fail but judge yes ${g.fn}. Mean score of passing runs ${g.meanScorePass ?? '-'}, failing runs ${g.meanScoreFail ?? '-'}, point-biserial r ${g.pointBiserial ?? '-'}.`, '');
      if (g.disagreements.length) {
        out.push(table(['case', 'assertions', 'judge', 'failed assertions', 'judge defects'], g.disagreements.map((d) => [d.case, d.assertions, d.judge, d.failed.join('; ').replace(/\|/g, '/'), d.defects.join('; ').replace(/\|/g, '/').slice(0, 200)])), '');
      }
    }
  } else out.push('No judge scores.', '');
  return out.join('\n');
}

// ---------- CLI ----------

function readJsonl<T>(file: string): T[] {
  try {
    return readFileSync(file, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l) as T);
  } catch {
    return [];
  }
}

if (process.argv[1] && path.basename(process.argv[1]) === 'summarize.ts') {
  const dir = path.resolve(process.argv[2] ?? '.');
  const { loadCases } = await import('./lib.ts');
  const meta = JSON.parse(readFileSync(path.join(dir, 'meta.json'), 'utf8')) as RunMeta;
  const { loadCatalog } = await import('../packages/core/src/catalog-node.ts');
  // The cases directory the run used (--cases-dir), else the golden set.
  const casesDir = typeof meta.args?.['cases-dir'] === 'string' ? path.resolve(meta.args['cases-dir'] as string) : undefined;
  const s = summarize(readJsonl<RunRecord>(path.join(dir, 'runs.jsonl')), readJsonl<JudgeRecord>(path.join(dir, 'judge.jsonl')), meta, loadCases(casesDir), new Set(loadCatalog().entries.map((e) => e.id)));
  writeFileSync(path.join(dir, 'summary.json'), JSON.stringify(s, null, 2));
  writeFileSync(path.join(dir, 'summary.md'), renderSummaryMd(s));
  console.log(renderSummaryMd(s));
}
void fileURLToPath;
