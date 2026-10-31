// Scenario definitions for the replay app and the bench. Data (recorded streams, synthetic streams, the probe id
// map) is passed in, so the same code runs under Vite (JSON imports) and in Node (fs reads).
import type { Catalog } from '../../../../packages/core/src/types.ts';
import { forkSession, newSession, probeMapper, runStream } from './pipeline.ts';
import type { BatchResult, Session, TimedLine } from './pipeline.ts';

export interface StreamFile {
  streams: Array<{ label: string; description?: string; lineTimes: Array<[number, string]> }>;
}

export interface ScenarioData {
  recorded: StreamFile;
  synthetic: StreamFile;
  idMap: Record<string, string>;
}

export interface ScenarioDef {
  id: string;
  title: string;
  subtitle: string;
  /** Streams replayed instantly to build the starting diagram (earlier turns). */
  base: string[];
  /** The stream replayed with its recorded timings. */
  stream: string;
  /** Nodes kept inline in the request path instead of becoming badges (WAF in CNAME mode). */
  keepInline?: string[];
  ask: string;
}

export const SCENARIOS: ScenarioDef[] = [
  { id: 'a', title: 'a. Initial diagram', subtitle: 'F: e-commerce for Southeast Asia, streamed in 36 s', base: [], stream: 'F_max_nothink', ask: 'Cross-border e-commerce for Southeast Asia, flash sales, search, images, AI shopping assistant, highly available' },
  { id: 'b', title: 'b. Add a warehouse', subtitle: 'F, then B4: "add a data warehouse"', base: ['F_max_nothink'], stream: 'B4_dw', ask: 'Add a data warehouse' },
  { id: 'c', title: 'c. Drop the AI', subtitle: 'F, then B5: "drop the chatbot"', base: ['F_max_nothink'], stream: 'B5_drop_ai', ask: 'Drop the chatbot' },
  { id: 'd', title: 'd. Kubernetes swap', subtitle: 'F, then B3: "run it on Kubernetes"', base: ['F_max_nothink'], stream: 'B3_k8s', ask: 'Run it on Kubernetes' },
  { id: 'e1', title: 'e. Add WAF as a badge', subtitle: 'F without WAF, then "I also want WAF" (cloud-native)', base: ['F_max_nothink', 'E0_base_no_waf'], stream: 'E1_waf_badge', ask: 'Oh, I also want WAF' },
  { id: 'e2', title: 'e. Add WAF inline', subtitle: 'F without WAF, then WAF in CNAME mode (inline insert)', base: ['F_max_nothink', 'E0_base_no_waf'], stream: 'E2_waf_inline', keepInline: ['waf'], ask: 'Add WAF in CNAME mode' },
  { id: 'f', title: 'f. Solution map', subtitle: '"An AI agent my team can use"', base: [], stream: 'F1_team_agent', ask: 'An AI agent my team can use' },
];

export function findStream(data: ScenarioData, label: string): { lines: TimedLine[]; synthetic: boolean } {
  const rec = data.recorded.streams.find((s) => s.label === label);
  const syn = rec ? undefined : data.synthetic.streams.find((s) => s.label === label);
  const s = rec ?? syn;
  if (!s) throw new Error(`unknown stream ${label}`);
  return { lines: s.lineTimes.map(([t, line]) => ({ t, line })), synthetic: !rec };
}

export interface PreparedScenario {
  def: ScenarioDef;
  /** Session after the base turns; replay the stream on a fork of it. */
  base: Session;
  baseBatches: BatchResult[];
  lines: TimedLine[];
  mapRaw: (raw: unknown) => unknown;
}

export function prepareScenario(id: string, data: ScenarioData, catalog: Catalog): PreparedScenario {
  const def = SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0];
  const mapRaw = probeMapper(data.idMap);
  const base = newSession(def.keepInline);
  const baseBatches: BatchResult[] = [];
  for (const label of def.base) baseBatches.push(...runStream(base, catalog, findStream(data, label).lines, mapRaw));
  return { def, base: forkSession(base, def.keepInline), baseBatches, lines: findStream(data, def.stream).lines, mapRaw };
}
