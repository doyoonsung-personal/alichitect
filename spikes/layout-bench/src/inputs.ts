// Replay inputs, all read-only: the stored eval conversations (two full runs and two held-out runs), the recorded
// probe streams (research/probes/streams.json, probe ids mapped to catalog ids) and the spike's synthetic streams.
// Each conversation becomes one SessionSpec: an optional committed base graph plus its assistant turns as raw ops.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createLineParser } from '../../../packages/core/src/ndjson.ts';
import type { Catalog, Graph } from '../../../packages/core/src/types.ts';
import { loadBase, loadCases } from '../../../eval/lib.ts';

export type SourceId = 'final' | 'baseline' | 'heldout-baseline' | 'heldout-final' | 'probes';
export const ALL_SOURCES: SourceId[] = ['final', 'baseline', 'heldout-baseline', 'heldout-final', 'probes'];

export const RUN_DIRS: Record<Exclude<SourceId, 'probes'>, string> = {
  final: '2026-10-31T04-52-42-final',
  baseline: '2026-10-31T04-04-43-baseline',
  'heldout-baseline': '2026-10-31T04-46-41-heldout-baseline',
  'heldout-final': '2026-10-31T05-13-08-heldout-final',
};

const ROOT = new URL('../../../', import.meta.url);
const readJson = (rel: string): unknown => JSON.parse(readFileSync(new URL(rel, ROOT), 'utf8'));

export interface TurnSpec {
  index: number;
  /** Raw op objects in stream order (parsed NDJSON lines; validateOp runs during the replay). */
  raws: unknown[];
  /** true: raws are already-validated ops (the stored t.ops), replayed without validateOp. */
  validated: boolean;
  /** Counted in the metrics (false for base turns replayed only to build a probe scenario's start state). */
  count: boolean;
  /** A new diagram: the first turn of a conversation without a base. */
  first: boolean;
}

export interface SessionSpec {
  id: string;
  source: SourceId;
  case: string;
  category: string;
  /** Committed start graph (a repaired eval base), or null for an empty canvas. */
  base: Graph | null;
  turns: TurnSpec[];
  /** Probe streams use underscored ids; this maps them to catalog ids before validateOp. */
  mapRaw?: (raw: unknown) => unknown;
}

export interface LoadOptions {
  /** content: parse each turn's stored model content (plus any repair-phase ops); stored: replay t.ops as the reviewer did. */
  ops: 'content' | 'stored';
}

/** Parses NDJSON text into raw objects with the core streaming parser (bad lines are dropped, as llm.ts does). */
export function parseContent(text: string): unknown[] {
  const out: unknown[] = [];
  const p = createLineParser({ onOp: (raw) => out.push(raw) });
  p.push(text);
  p.end();
  return out;
}

interface RunTurn {
  index: number;
  content: string;
  ops: unknown[];
  stats: { ops: number; repair?: unknown };
}
interface RunRecord {
  id: string;
  case: string;
  category: string;
  turns: RunTurn[];
}

let caseCache: Map<string, { base?: string }> | null = null;
function caseIndex(): Map<string, { base?: string }> {
  if (!caseCache) {
    const all = [...loadCases(), ...loadCases(fileURLToPath(new URL('eval/cases-heldout', ROOT)))];
    caseCache = new Map(all.map((c) => [c.id, { base: c.base }]));
  }
  return caseCache;
}

export function loadEvalSessions(source: Exclude<SourceId, 'probes'>, catalog: Catalog, opts: LoadOptions): SessionSpec[] {
  const text = readFileSync(new URL(`eval/results/${RUN_DIRS[source]}/runs.jsonl`, ROOT), 'utf8');
  const runs = text.split('\n').filter(Boolean).map((l) => JSON.parse(l) as RunRecord);
  const cases = caseIndex();
  const bases = new Map<string, Graph>();
  const out: SessionSpec[] = [];
  for (const r of runs) {
    const baseName = cases.get(r.case)?.base;
    let base: Graph | null = null;
    if (baseName) {
      if (!bases.has(baseName)) bases.set(baseName, loadBase(baseName, catalog).memory.graph);
      base = bases.get(baseName)!;
    }
    const turns: TurnSpec[] = r.turns.map((t) => {
      if (opts.ops === 'stored') return { index: t.index, raws: t.ops, validated: true, count: true, first: t.index === 0 && !base };
      // repair-phase ops (a follow-up stream after deterministic repair) are not in t.content; they follow the main ops
      const repairOps = t.ops.slice(t.stats.ops);
      return { index: t.index, raws: [...parseContent(t.content), ...repairOps], validated: false, count: true, first: t.index === 0 && !base };
    });
    out.push({ id: `${source}:${r.id}`, source, case: r.case, category: r.category, base, turns });
  }
  return out;
}

// ---------- probe and synthetic streams ----------

interface StreamFile {
  streams: Array<{ label: string; lineTimes: Array<[number, string]> }>;
}

/** Probe streams use underscored ids (anti_ddos); the protocol team's map turns them into catalog ids. */
export function probeMapper(map: Record<string, string>): (raw: unknown) => unknown {
  return (raw) => {
    if (!raw || typeof raw !== 'object') return raw;
    const o = raw as Record<string, unknown>;
    const out: Record<string, unknown> = { ...o };
    if (typeof o.product === 'string' && Object.hasOwn(map, o.product)) out.product = map[o.product];
    if (Array.isArray(o.products)) out.products = o.products.map((p) => (typeof p === 'string' && Object.hasOwn(map, p) ? map[p] : p));
    return out;
  };
}

/** Probe sessions: [id, counted stream, base streams replayed first]. Follow-ups start from the replayed F diagram. */
export const PROBE_SESSIONS: ReadonlyArray<{ id: string; stream: string; base: string[]; note: string }> = [
  { id: 'F', stream: 'F_max_nothink', base: [], note: 'e-commerce for Southeast Asia (scenario a)' },
  { id: 'E', stream: 'E_flash_default', base: [], note: 'same ask, flash, default thinking' },
  { id: 'G', stream: 'G_max_budget1k', base: [], note: 'same ask, thinking budget 1024' },
  { id: 'H', stream: 'H_flash_nothink', base: [], note: 'same ask, flash, thinking off' },
  { id: 'P1', stream: 'P1_team_grounded', base: [], note: 'AI agent for my team (grounded)' },
  { id: 'F1', stream: 'F1_team_agent', base: [], note: 'solution map (synthetic, scenario f)' },
  { id: 'B2', stream: 'B2_followup_waf_nothink', base: ['F_max_nothink'], note: 'F, then "oh i also want waf"' },
  { id: 'B3', stream: 'B3_k8s', base: ['F_max_nothink'], note: 'F, then Kubernetes (scenario d)' },
  { id: 'B4', stream: 'B4_dw', base: ['F_max_nothink'], note: 'F, then a data warehouse (scenario b)' },
  { id: 'B5', stream: 'B5_drop_ai', base: ['F_max_nothink'], note: 'F, then drop the chatbot (scenario c)' },
  { id: 'E0', stream: 'E0_base_no_waf', base: ['F_max_nothink'], note: 'F, then remove WAF (synthetic)' },
  { id: 'E1', stream: 'E1_waf_badge', base: ['F_max_nothink', 'E0_base_no_waf'], note: 'add WAF as a badge (scenario e1)' },
  { id: 'E2', stream: 'E2_waf_inline', base: ['F_max_nothink', 'E0_base_no_waf'], note: 'insert WAF inline; repair makes it a badge (scenario e2 without keepInline)' },
];

export function loadProbeSessions(): SessionSpec[] {
  const recorded = readJson('research/probes/streams.json') as StreamFile;
  const synthetic = readJson('spikes/canvas/src/replay/synthetic.json') as StreamFile;
  const idMap = readJson('packages/core/test/fixtures/probe-id-map.json') as Record<string, string>;
  const mapRaw = probeMapper(idMap);
  const stream = (label: string): unknown[] => {
    const s = recorded.streams.find((x) => x.label === label) ?? synthetic.streams.find((x) => x.label === label);
    if (!s) throw new Error(`unknown stream ${label}`);
    return parseContent(s.lineTimes.map(([, line]) => line).join('\n') + '\n');
  };
  return PROBE_SESSIONS.map((p) => {
    const turns: TurnSpec[] = [...p.base, p.stream].map((label, i, all) => ({ index: i, raws: stream(label), validated: false, count: i === all.length - 1, first: i === 0 }));
    return { id: `probes:${p.id}`, source: 'probes' as const, case: `probe-${p.id}`, category: 'probe', base: null, turns, mapRaw };
  });
}

export function loadSessions(sources: readonly SourceId[], catalog: Catalog, opts: LoadOptions): SessionSpec[] {
  const out: SessionSpec[] = [];
  for (const s of sources) {
    if (s === 'probes') out.push(...loadProbeSessions());
    else out.push(...loadEvalSessions(s, catalog, opts));
  }
  return out;
}
