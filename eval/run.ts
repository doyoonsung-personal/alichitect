// Golden-prompt evaluation runner.
//
//   node eval/run.ts [--runs 3] [--concurrency 3] [--cases pat-,need-01] [--category trap,edit] [--lang ko,zh]
//                    [--model qwen3.8-max] [--fallback qwen3.7-max] [--judge kimi-k3 | --no-judge] [--budget 30]
//                    [--label name] [--resume DIR] [--rescore DIR] [--judge-only DIR] [--failing-from DIR] [--passing-from DIR]
//                    [--cases-dir DIR] [--judge-all] [--dry]
//
// For every selected case it runs N independent conversations (each turn through runTurn, so retries, failover to the
// fallback model, the pinned-constraint check, the continuation turn and the repair turn all happen as in the product),
// checks the machine assertions after each turn and appends one JSON line per conversation to
// eval/results/<timestamp>/runs.jsonl. Then it asks an LLM judge (a different model family) to score run 1 of every
// case and every run of the constraint cases (--judge-all: every run of every case), and writes summary.json and summary.md.
// DASHSCOPE_API_KEY is read from the environment and never printed or written. Every API call is booked in
// eval/results/ledger.jsonl at list price; the run stops when the ledger passes --budget (default USD 30).
import { appendFileSync, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { loadCatalog } from '../packages/core/src/catalog-node.ts';
import { buildSystemPrompt, createMemory } from '../packages/core/src/prompt.ts';
import { DEFAULT_MODEL, FALLBACK_MODEL, createCacheTracker, runTurn } from '../packages/core/src/llm.ts';
import type { RunTurnResult, TurnStats } from '../packages/core/src/llm.ts';
import type { Graph, SessionMemory } from '../packages/core/src/types.ts';
import { EVAL_DIR, RESULTS_DIR, appendLedger, askText, checkCases, evaluateTurn, isConstraintCase, loadBase, loadCases, productNamePattern, spentUsd } from './lib.ts';
import type { EvalCase, TurnView } from './lib.ts';
import { judgeRun } from './judge.ts';
import type { JudgeRecord, RunMeta, RunRecord } from './records.ts';
import { renderSummaryMd, summarize } from './summarize.ts';

export const DEFAULT_JUDGE = 'kimi-k3';

// ---------- args ----------

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) out[a.slice(2)] = true;
    else {
      out[a.slice(2)] = next;
      i++;
    }
  }
  return out;
}

const list = (v: string | boolean | undefined): string[] => (typeof v === 'string' ? v.split(',').map((x) => x.trim()).filter(Boolean) : []);

export function selectCases(all: EvalCase[], a: Record<string, string | boolean>): EvalCase[] {
  const ids = list(a.cases);
  const cats = list(a.category);
  const langs = list(a.lang);
  // --failing-from DIR: only the cases with at least one failing run in an earlier results directory;
  // --passing-from DIR: only the cases whose runs all passed there (the regression check after a fix).
  let byOutcome: Set<string> | undefined;
  for (const [flag, wantFailing] of [['failing-from', true], ['passing-from', false]] as const) {
    if (typeof a[flag] !== 'string') continue;
    const runs = readJsonl<RunRecord>(path.join(path.resolve(a[flag] as string), 'runs.jsonl'));
    const failing = new Set(runs.filter((r) => !r.pass).map((r) => r.case));
    const seen = new Set(runs.map((r) => r.case));
    byOutcome = new Set([...seen].filter((id) => failing.has(id) === wantFailing));
  }
  return all.filter(
    (c) =>
      (!ids.length || ids.some((p) => c.id === p || c.id.startsWith(p))) &&
      (!cats.length || cats.includes(c.category)) &&
      (!langs.length || langs.includes(c.lang ?? 'en')) &&
      (!byOutcome || byOutcome.has(c.id)),
  );
}

// ---------- jsonl helpers ----------

export function readJsonl<T>(file: string): T[] {
  if (!existsSync(file)) return [];
  const out: T[] = [];
  for (const ln of readFileSync(file, 'utf8').split('\n')) {
    if (!ln.trim()) continue;
    try {
      out.push(JSON.parse(ln) as T);
    } catch {
      /* a partial last line from an interrupted run */
    }
  }
  return out;
}

const fmt = (n: number, d = 3): string => n.toFixed(d);

/** The stats stored per turn: everything but the follow-up turn's raw content. */
function slimStats(s: TurnStats): TurnStats {
  return s.repair ? { ...s, repair: { ...s.repair, content: '', ops: [] } } : s;
}

// ---------- one conversation ----------

export interface UnitContext {
  apiKey: string;
  model: string;
  fallback: string;
  catalog: ReturnType<typeof loadCatalog>;
  system: string;
  names: RegExp;
  tracker: ReturnType<typeof createCacheTracker>;
  signal: AbortSignal;
  label: string;
  onSpend: (usd: number) => void;
}

export async function runUnit(c: EvalCase, run: number, ctx: UnitContext): Promise<RunRecord> {
  const started = Date.now();
  const lang = c.lang ?? 'en';
  let memory: SessionMemory = c.base ? loadBase(c.base, ctx.catalog).memory : createMemory();
  const userTexts: string[] = memory.turns.filter((t) => t.role === 'user').map((t) => t.text);
  const rec: RunRecord = { id: `${c.id}#${run}`, case: c.id, category: c.category, lang, run, model: ctx.model, startedAt: new Date(started).toISOString(), wallMs: 0, pass: true, turns: [], costUsd: 0 };
  for (let i = 0; i < c.turns.length; i++) {
    const turn = c.turns[i];
    const ask = askText(turn);
    userTexts.push(ask);
    const before: Graph = memory.graph;
    let r: RunTurnResult;
    try {
      r = await runTurn(memory, ask, ctx.catalog, {
        apiKey: ctx.apiKey,
        model: ctx.model,
        fallbackModel: ctx.fallback,
        system: ctx.system,
        tracker: ctx.tracker,
        window: c.window,
        summarize: c.summarize,
        signal: ctx.signal,
        retries: 4,
        backoffMs: 3000,
        onCost: (x) => {
          appendLedger({ ts: new Date().toISOString(), label: ctx.label, model: x.model, phase: x.phase, costUsd: x.costUsd, estimated: x.estimated, usage: x.usage ?? undefined, case: rec.id });
          rec.costUsd += x.costUsd;
          ctx.onSpend(x.costUsd);
        },
      });
    } catch (e) {
      rec.pass = false;
      rec.apiError = `turn ${i + 1}: exception ${(e as Error).message}`.slice(0, 300);
      break;
    }
    const view: TurnView = {
      ask,
      ops: r.ops,
      says: r.says,
      reqs: r.reqs,
      gaps: r.gaps,
      rawProducts: r.rawProducts,
      graph: r.memory.graph,
      before,
      requirements: r.memory.requirements,
      constraints: r.memory.constraints ?? [],
      stats: r.stats,
      userTexts: [...userTexts],
    };
    const assertions = evaluateTurn(view, turn, lang, ctx.names, ctx.catalog);
    const pass = assertions.every((a) => a.pass);
    rec.turns.push({
      index: i,
      ask,
      content: r.content,
      ops: r.ops,
      says: r.says,
      reqs: r.reqs,
      gaps: r.gaps,
      rawProducts: r.rawProducts,
      changes: r.changes,
      graph: r.memory.graph,
      requirements: r.memory.requirements,
      constraints: r.memory.constraints ?? [],
      summary: r.memory.summary,
      stats: slimStats(r.stats),
      assertions,
      pass,
    });
    if (!pass) rec.pass = false;
    if (r.stats.error && r.stats.ops === 0) {
      rec.apiError = `turn ${i + 1}: ${r.stats.error.code}: ${r.stats.error.message}`.slice(0, 300);
      break;
    }
    memory = r.memory;
  }
  rec.wallMs = Date.now() - started;
  return rec;
}

// ---------- pool ----------

async function pool<T>(items: T[], concurrency: number, fn: (x: T, i: number) => Promise<void>): Promise<void> {
  let next = 0;
  const worker = async (): Promise<void> => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));
}

// ---------- rescoring (no API) ----------

function rescore(dir: string, cases: EvalCase[], catalog: ReturnType<typeof loadCatalog>): void {
  const file = path.join(dir, 'runs.jsonl');
  const orig = path.join(dir, 'runs.orig.jsonl');
  if (!existsSync(orig)) copyFileSync(file, orig);
  const names = productNamePattern(catalog);
  const byId = new Map(cases.map((c) => [c.id, c]));
  const out: RunRecord[] = [];
  for (const run of readJsonl<RunRecord>(orig)) {
    const c = byId.get(run.case);
    if (!c) {
      out.push(run);
      continue;
    }
    let before: Graph = c.base ? loadBase(c.base, catalog).memory.graph : createMemory().graph;
    const userTexts: string[] = c.base ? loadBase(c.base, catalog).memory.turns.filter((t) => t.role === 'user').map((t) => t.text) : [];
    run.pass = !run.apiError;
    run.turns.forEach((t, i) => {
      const turn = c.turns[i];
      userTexts.push(t.ask);
      const view: TurnView = { ask: t.ask, ops: t.ops, says: t.says, reqs: t.reqs, gaps: t.gaps, rawProducts: t.rawProducts, graph: t.graph, before, requirements: t.requirements, constraints: t.constraints ?? [], stats: t.stats, userTexts: [...userTexts] };
      t.assertions = evaluateTurn(view, turn, c.lang ?? 'en', names, catalog);
      t.pass = t.assertions.every((a) => a.pass);
      if (!t.pass) run.pass = false;
      before = t.graph;
    });
    out.push(run);
  }
  writeFileSync(file, out.map((r) => JSON.stringify(r)).join('\n') + '\n');
}

// ---------- main ----------

async function main(): Promise<number> {
  const a = parseArgs(process.argv.slice(2));
  const catalog = loadCatalog();
  const casesDir = typeof a['cases-dir'] === 'string' ? path.resolve(a['cases-dir']) : undefined;
  const problems = checkCases(loadCases(casesDir), catalog);
  if (problems.length) {
    console.error('case problems:\n' + problems.map((p) => ' - ' + p).join('\n'));
    return 1;
  }
  const cases = selectCases(loadCases(casesDir), a);
  const ids = new Set(catalog.entries.map((e) => e.id));
  const runs = Math.max(1, Number(a.runs ?? 3));
  const concurrency = Math.max(1, Number(a.concurrency ?? 3));
  const model = typeof a.model === 'string' ? a.model : DEFAULT_MODEL;
  const fallback = typeof a.fallback === 'string' ? a.fallback : FALLBACK_MODEL;
  const judgeModel = a['no-judge'] ? undefined : typeof a.judge === 'string' ? a.judge : DEFAULT_JUDGE;
  const budget = Number(a.budget ?? 30);
  const system = buildSystemPrompt(catalog);

  const units: Array<{ c: EvalCase; run: number }> = [];
  for (let r = 1; r <= runs; r++) for (const c of cases) units.push({ c, run: r });

  if (a.dry) {
    console.log(`${cases.length} cases x ${runs} runs = ${units.length} conversations, ${cases.reduce((s, c) => s + c.turns.length, 0) * runs} turns; model ${model}, fallback ${fallback}, judge ${judgeModel ?? 'off'}, budget USD ${budget}`);
    return 0;
  }

  if (typeof a.rescore === 'string') {
    const dir = path.resolve(a.rescore);
    rescore(dir, loadCases(casesDir), catalog);
    const meta = JSON.parse(readFileSync(path.join(dir, 'meta.json'), 'utf8')) as RunMeta;
    const sum = summarize(readJsonl<RunRecord>(path.join(dir, 'runs.jsonl')), readJsonl<JudgeRecord>(path.join(dir, 'judge.jsonl')), meta, loadCases(casesDir), ids);
    writeFileSync(path.join(dir, 'summary.json'), JSON.stringify(sum, null, 2));
    writeFileSync(path.join(dir, 'summary.md'), renderSummaryMd(sum));
    console.log(`rescored ${dir}`);
    return 0;
  }

  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    console.error('DASHSCOPE_API_KEY is not set');
    return 1;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const resume = typeof a.resume === 'string' ? path.resolve(a.resume) : typeof a['judge-only'] === 'string' ? path.resolve(a['judge-only']) : undefined;
  const dir = resume ?? path.join(RESULTS_DIR, `${stamp}${typeof a.label === 'string' ? '-' + a.label : ''}`);
  mkdirSync(dir, { recursive: true });
  const runsFile = path.join(dir, 'runs.jsonl');
  const judgeFile = path.join(dir, 'judge.jsonl');
  const label = path.basename(dir);
  const meta: RunMeta =
    resume && existsSync(path.join(dir, 'meta.json'))
      ? (JSON.parse(readFileSync(path.join(dir, 'meta.json'), 'utf8')) as RunMeta)
      : {
          startedAt: new Date().toISOString(),
          args: Object.fromEntries(Object.entries(a).filter(([k]) => k !== 'key')),
          model,
          fallbackModel: fallback,
          judgeModel,
          runsPerCase: runs,
          concurrency,
          cases: cases.length,
          units: units.length,
          catalogVersion: catalog.version,
          catalogEntries: catalog.entries.length,
          systemPromptChars: system.length,
          systemPromptSha256: createHash('sha256').update(system).digest('hex'),
          node: process.version,
          coreFiles: coreFileHashes(),
          judgeAllRunsOf: judgeModel ? cases.filter((c) => a['judge-all'] || isConstraintCase(c)).map((c) => c.id) : [],
        };
  writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2));

  const spentAtStart = spentUsd();
  let session = 0;
  const stop = new AbortController();
  const onSpend = (usd: number): void => {
    session += usd;
    if (spentAtStart + session > budget && !stop.signal.aborted) {
      console.error(`budget guard: ledger passed USD ${budget}; stopping`);
      stop.abort();
    }
  };
  const ctx: UnitContext = { apiKey, model, fallback, catalog, system, names: productNamePattern(catalog), tracker: createCacheTracker(), signal: stop.signal, label, onSpend };

  if (typeof a['judge-only'] !== 'string') {
    const done = new Set(readJsonl<RunRecord>(runsFile).map((r) => r.id));
    const todo = units.filter((u) => !done.has(`${u.c.id}#${u.run}`));
    console.log(`${label}: ${cases.length} cases, ${todo.length} of ${units.length} conversations to run (concurrency ${concurrency}, model ${model}, fallback ${fallback})`);
    let finished = 0;
    await pool(todo, concurrency, async ({ c, run }) => {
      if (stop.signal.aborted) return;
      const rec = await runUnit(c, run, ctx);
      if (stop.signal.aborted && rec.apiError) return; // cut off by the budget guard: not a result
      appendFileSync(runsFile, JSON.stringify(rec) + '\n');
      finished++;
      const failed = rec.turns.flatMap((t) => t.assertions.filter((x) => !x.pass).map((x) => x.type));
      console.log(`[${finished}/${todo.length}] ${rec.id} ${rec.pass ? 'PASS' : 'FAIL'} ${rec.turns.length}/${c.turns.length} turns ${(rec.wallMs / 1000).toFixed(0)}s $${fmt(rec.costUsd)}${failed.length ? ' failed: ' + [...new Set(failed)].join(',') : ''}${rec.apiError ? ' API: ' + rec.apiError : ''}`);
    });
  }

  const all = readJsonl<RunRecord>(runsFile);
  if (judgeModel && !stop.signal.aborted) {
    // Run 1 (the lowest complete run) of every case, and every run of a constraint case: a narrated or drawn violation in
    // run 2 or 3 is otherwise invisible to the judge (REVIEW.md section 6).
    const judged = new Set(readJsonl<JudgeRecord>(judgeFile).filter((j) => j.scores).map((j) => `${j.case}#${j.run}`));
    const everyRun = new Set(meta.judgeAllRunsOf ?? cases.filter((c) => a['judge-all'] || isConstraintCase(c)).map((c) => c.id));
    const picks = pickJudgeRuns(cases, all, everyRun).filter((p) => !judged.has(`${p.c.id}#${p.rec.run}`));
    console.log(`judge ${judgeModel}: ${picks.length} runs to score`);
    await pool(picks, Math.max(concurrency, 4), async ({ c, rec }) => {
      if (stop.signal.aborted) return;
      let before: Graph | null = null;
      if (rec.turns.length > 1) before = rec.turns[rec.turns.length - 2].graph;
      else if (c.base) before = loadBase(c.base, catalog).memory.graph;
      const j = await judgeRun(c, rec, before, catalog, {
        apiKey,
        model: judgeModel,
        signal: stop.signal,
        extraBody: judgeExtraBody(judgeModel),
        onCost: (x) => {
          appendLedger({ ts: new Date().toISOString(), label, model: x.model, phase: 'judge', costUsd: x.costUsd, estimated: x.estimated, usage: x.usage ?? undefined, case: rec.id });
          onSpend(x.costUsd);
        },
      });
      appendFileSync(judgeFile, JSON.stringify(j) + '\n');
      console.log(`judge ${c.id}#${rec.run}: ${j.scores ? `${j.scores.completeness}/${j.scores.accuracy}/${j.scores.rationality}/${j.scores.readability} signoff ${j.scores.signoff ? 'yes' : 'no'}` : 'ERROR ' + j.error}`);
    });
  }

  meta.finishedAt = new Date().toISOString();
  meta.spentUsd = session;
  writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2));
  const sum = summarize(readJsonl<RunRecord>(runsFile), readJsonl<JudgeRecord>(judgeFile), meta, loadCases(casesDir), ids);
  writeFileSync(path.join(dir, 'summary.json'), JSON.stringify(sum, null, 2));
  writeFileSync(path.join(dir, 'summary.md'), renderSummaryMd(sum));
  console.log(`\nresults: ${dir}\nspent this run: USD ${fmt(session)} (ledger total USD ${fmt(spentUsd())})`);
  console.log(renderSummaryMd(sum).split('\n').slice(0, 60).join('\n'));
  return stop.signal.aborted ? 2 : 0;
}

/** The runs to judge: the lowest complete run of every case, plus every other complete run of the cases in `everyRun`. */
export function pickJudgeRuns(cases: EvalCase[], runs: RunRecord[], everyRun: ReadonlySet<string>): Array<{ c: EvalCase; rec: RunRecord }> {
  const out: Array<{ c: EvalCase; rec: RunRecord }> = [];
  for (const c of cases) {
    const recs = runs.filter((r) => r.case === c.id && r.turns.length === c.turns.length).sort((x, y) => x.run - y.run);
    for (const rec of everyRun.has(c.id) ? recs : recs.slice(0, 1)) out.push({ c, rec });
  }
  return out;
}

/** sha256 (first 12 hex) of every packages/core/src file, so a results directory records the exact code it ran. */
export function coreFileHashes(): Record<string, string> {
  const dir = path.join(EVAL_DIR, '..', 'packages', 'core', 'src');
  const out: Record<string, string> = {};
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.ts')).sort()) out[f] = createHash('sha256').update(readFileSync(path.join(dir, f))).digest('hex').slice(0, 12);
  return out;
}

/** Body fields that individual judge models need. The default is plain: enable_thinking:false is always sent. */
export function judgeExtraBody(model: string): Record<string, unknown> | undefined {
  void model;
  return undefined;
}

if (process.argv[1] && path.basename(process.argv[1]) === 'run.ts') {
  main().then(
    (code) => process.exit(code),
    (e) => {
      console.error(e instanceof Error ? e.stack : e);
      process.exit(1);
    },
  );
}
