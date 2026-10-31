// Phase 1 measurements over one or more results directories: pass rates (pass@1 and all-runs first), first token,
// failovers, cost per turn, machine-checked constraint compliance, repairs by code, and the LLM repair turns with a
// false-positive classification. Read-only, no network.
//   node eval/phase1-report.ts <dir> [<dir> ...] [--json]
// Each directory is summarized on its own (with the cases of eval/cases and eval/cases-heldout), then latency, cost,
// failover and repair figures are pooled over all of them.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { loadCatalog } from '../packages/core/src/catalog-node.ts';
import type { Catalog, Warning } from '../packages/core/src/types.ts';
import { EVAL_DIR, loadCases } from './lib.ts';
import type { EvalCase } from './lib.ts';
import type { JudgeRecord, RunMeta, RunRecord, TurnRecord } from './records.ts';
import { summarize } from './summarize.ts';
import type { Dist, Summary } from './summarize.ts';

function readJsonl<T>(file: string): T[] {
  try {
    return readFileSync(file, 'utf8')
      .split('\n')
      .filter((l) => l.trim())
      .flatMap((l) => {
        try {
          return [JSON.parse(l) as T];
        } catch {
          return [];
        }
      });
  } catch {
    return [];
  }
}

export interface RepairTurnClass {
  case: string;
  run: number;
  turn: number;
  kind: string;
  /** client-only: every error finding is a constraint-region finding on users or devices nodes (the checker false positive fixed in llm.ts). */
  verdict: 'false-positive (client node)' | 'review';
  errors: string[];
  pass: boolean;
}

/** Error-level findings of a repair turn that rest only on client nodes (users, devices) are a known checker false positive. */
export function classifyRepairTurn(t: TurnRecord, catalog: Catalog): RepairTurnClass['verdict'] | null {
  const rep = t.stats.repair;
  if (!rep || rep.kind === 'continue') return null;
  const errs = (rep.findings ?? []).filter((w: Warning) => w.severity === 'error');
  const productOf = (id: string): string | undefined => {
    if (Object.prototype.hasOwnProperty.call(t.graph.nodes, id)) return t.graph.nodes[id].product;
    const op = t.ops.find((o) => o.t === 'node' && o.id === id);
    return op && op.t === 'node' ? op.product : undefined;
  };
  const client = (id: string): boolean => {
    const p = productOf(id);
    return !!p && catalog.byId.get(p)?.lane === 'clients';
  };
  const clientOnly = errs.length > 0 && errs.every((w) => w.code === 'constraint-region' && w.ids.length > 0 && w.ids.every(client));
  return clientOnly ? 'false-positive (client node)' : 'review';
}

export interface DirReport {
  dir: string;
  label: string;
  sum: Summary;
  repairTurns: RepairTurnClass[];
}

export function reportDir(dir: string, cases: EvalCase[], catalog: Catalog): DirReport {
  const meta = JSON.parse(readFileSync(path.join(dir, 'meta.json'), 'utf8')) as RunMeta;
  const runs = readJsonl<RunRecord>(path.join(dir, 'runs.jsonl'));
  const judges = readJsonl<JudgeRecord>(path.join(dir, 'judge.jsonl'));
  const ids = new Set(catalog.entries.map((e) => e.id));
  const sum = summarize(runs, judges, meta, cases.filter((c) => runs.some((r) => r.case === c.id)), ids);
  const repairTurns: RepairTurnClass[] = [];
  for (const r of runs) {
    for (const t of r.turns) {
      const v = classifyRepairTurn(t, catalog);
      if (!v) continue;
      repairTurns.push({
        case: r.case,
        run: r.run,
        turn: t.index + 1,
        kind: t.stats.repair!.kind,
        verdict: v,
        errors: (t.stats.repair!.findings ?? []).filter((w) => w.severity === 'error').map((w) => `${w.code}: ${w.msg}`.slice(0, 200)),
        pass: t.pass,
      });
    }
  }
  return { dir, label: path.basename(dir), sum, repairTurns };
}

const pc = (x: number): string => `${(x * 100).toFixed(1)}%`;
const s = (x: number | null): string => (x === null ? '-' : `${(x / 1000).toFixed(2)} s`);
const d = (x: Dist): string => `${s(x.p50)} / ${s(x.p95)} (n ${x.n})`;
const usd = (x: number | null): string => (x === null ? '-' : `$${x.toFixed(4)}`);

export function renderReport(reps: DirReport[], pooled: Summary | null): string {
  const out: string[] = [];
  const head = ['measure', ...reps.map((r) => r.label)];
  const rows: Array<[string, (r: DirReport) => string]> = [
    ['cases / conversations / turns', (r) => `${r.sum.totals.cases} / ${r.sum.totals.conversations} / ${r.sum.totals.turns}`],
    ['pass@1 (mean case pass rate)', (r) => pc(r.sum.totals.casePassRate)],
    ['all runs pass', (r) => pc(r.sum.totals.allRuns)],
    ['majority', (r) => pc(r.sum.totals.majority)],
    ['pass@3 (best of 3, listed last)', (r) => pc(r.sum.totals.passAtN)],
    ['turns passing', (r) => pc(r.sum.totals.turnPassRate)],
    ['first token p50 / p95 (answering attempt)', (r) => d(r.sum.latency.firstByteMs)],
    ['first token p50 / p95 (as waited for)', (r) => d(r.sum.latency.perceivedFirstByteMs)],
    ['first op p50 / p95', (r) => d(r.sum.latency.firstOpMs)],
    ['failovers (main stream)', (r) => `${r.sum.failover.turns} (${pc(r.sum.failover.rate)})`],
    ['cost per turn mean / p95', (r) => `${usd(r.sum.tokens.costPerTurn.mean)} / ${usd(r.sum.tokens.costPerTurn.p95)}`],
    ['cache hit', (r) => pc(r.sum.tokens.cacheHit)],
    ['residency checks passed', (r) => `${r.sum.constraints.residency.passed}/${r.sum.constraints.residency.checks}`],
    ['pinned constraints as data', (r) => `${r.sum.constraints.pins.passed}/${r.sum.constraints.pins.checks}`],
    ['avoided products absent', (r) => `${r.sum.constraints.avoid.passed}/${r.sum.constraints.avoid.checks}`],
    ['cut off, rescued / not rescued', (r) => `${r.sum.cutoff.rescued} / ${r.sum.cutoff.notRescued}`],
    ['LLM repair turns (false positives)', (r) => `${r.repairTurns.length} (${r.repairTurns.filter((x) => x.verdict !== 'review').length} client-node FP)`],
    ['deterministic fixes', (r) => Object.entries(r.sum.repairs.fixesByCode).map(([k, v]) => `${k} ${v.total}`).join(', ') || 'none'],
    ['judge sign-off (lowest run per case)', (r) => (r.sum.judge.signoffRate === null ? '-' : pc(r.sum.judge.signoffRate))],
  ];
  out.push(`| ${head.join(' | ')} |`, `| ${head.map((_, i) => (i ? '---:' : '---')).join(' | ')} |`);
  for (const [k, f] of rows) out.push(`| ${k} | ${reps.map(f).join(' | ')} |`);
  if (pooled) {
    out.push('', `Pooled over ${reps.length} directories (${pooled.totals.turns} turns):`);
    out.push(`- first token (answering attempt) p50 / p95: ${d(pooled.latency.firstByteMs)}; as waited for: ${d(pooled.latency.perceivedFirstByteMs)}`);
    const F = pooled.failover;
    out.push(`- failovers: ${F.turns} of ${pooled.totals.turns} turns (${pc(F.rate)}), reasons ${JSON.stringify(F.byReason)}; stalled attempt ${d(F.stalledAttemptMs)}; fallback first token ${d(F.fallbackFirstByteMs)}; follow-up turns on the fallback ${F.followUpFallbacks}`);
    out.push(`- cost per turn mean ${usd(pooled.tokens.costPerTurn.mean)}, p50 ${usd(pooled.tokens.costPerTurn.p50)}, p95 ${usd(pooled.tokens.costPerTurn.p95)}; per conversation mean ${usd(pooled.tokens.costPerConversation.mean)}; cache hit ${pc(pooled.tokens.cacheHit)}`);
    out.push(`- deterministic fixes by code: ${JSON.stringify(pooled.repairs.fixesByCode)}`);
    out.push(`- LLM follow-up turns: ${pooled.repairs.followUps.turns} ${JSON.stringify(pooled.repairs.followUps.byKind)}, by finding code ${JSON.stringify(pooled.repairs.followUps.byFindingCode)}`);
  }
  for (const r of reps) {
    if (!r.repairTurns.length) continue;
    out.push('', `Repair turns in ${r.label}:`);
    for (const x of r.repairTurns) out.push(`- ${x.case}#${x.run} T${x.turn} ${x.kind} [${x.verdict}] turn ${x.pass ? 'passes' : 'fails'}: ${x.errors.join(' | ').slice(0, 300)}`);
  }
  return out.join('\n');
}

if (process.argv[1] && path.basename(process.argv[1]) === 'phase1-report.ts') {
  const argv = process.argv.slice(2);
  const dirs = argv.filter((a) => !a.startsWith('--')).map((x) => path.resolve(x));
  const catalog = loadCatalog();
  const cases = [...loadCases(path.join(EVAL_DIR, 'cases')), ...loadCases(path.join(EVAL_DIR, 'cases-heldout'))];
  const reps = dirs.map((x) => reportDir(x, cases, catalog));
  let pooled: Summary | null = null;
  if (reps.length > 1) {
    // Pooled latency, cost, failover and repairs: run ids are made unique per directory so summarize keeps every run.
    const all = reps.flatMap((r, i) => readJsonl<RunRecord>(path.join(r.dir, 'runs.jsonl')).map((x) => ({ ...x, id: `${i}:${x.id}`, run: x.run + 100 * i })));
    pooled = summarize(all, [], reps[0].sum.meta, cases.filter((c) => all.some((r) => r.case === c.id)), new Set(catalog.entries.map((e) => e.id)));
  }
  if (argv.includes('--json')) console.log(JSON.stringify({ dirs: reps.map((r) => ({ label: r.label, totals: r.sum.totals, latency: r.sum.latency, failover: r.sum.failover, tokens: r.sum.tokens, constraints: r.sum.constraints, repairs: r.sum.repairs, cutoff: r.sum.cutoff, repairTurns: r.repairTurns })), pooled }, null, 2));
  else console.log(renderReport(reps, pooled));
}
