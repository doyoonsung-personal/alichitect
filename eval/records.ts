// Shapes of the stored evaluation records (runs.jsonl, judge.jsonl, meta.json). Pure types, no logic.
import type { Graph, Op } from '../packages/core/src/types.ts';
import type { TurnStats } from '../packages/core/src/llm.ts';
import type { AssertionResult, Category, Lang } from './lib.ts';

export interface TurnRecord {
  index: number;
  ask: string;
  content: string; // raw model output of the main stream
  ops: Op[]; // validated ops, follow-up turn included
  says: string[];
  reqs: string[];
  gaps: Array<{ need: string; note: string }>;
  rawProducts: string[];
  changes: string;
  graph: Graph; // after the turn, repaired
  requirements: string[]; // pinned after the turn
  summary?: string; // rolling summary after the turn, when there is one
  stats: TurnStats; // repair.content is dropped to keep the file small
  assertions: AssertionResult[];
  pass: boolean;
}

export interface RunRecord {
  id: string; // <case>#<run>
  case: string;
  category: Category;
  lang: Lang;
  run: number;
  model: string;
  startedAt: string;
  wallMs: number;
  pass: boolean; // every assertion of every turn
  turns: TurnRecord[];
  costUsd: number;
  apiError?: string; // the turn that failed outright (no ops), if any; later turns are skipped
}

export interface JudgeScores {
  completeness: number;
  accuracy: number;
  rationality: number;
  readability: number;
  signoff: boolean;
  reasons: string[];
  defects: string[];
}

export interface JudgeRecord {
  case: string;
  run: number; // the run that was judged
  model: string;
  scores?: JudgeScores;
  raw?: string;
  error?: string;
  costUsd: number;
  ms: number;
  usage?: unknown;
}

export interface RunMeta {
  startedAt: string;
  finishedAt?: string;
  args: Record<string, unknown>;
  model: string;
  fallbackModel: string;
  judgeModel?: string;
  runsPerCase: number;
  concurrency: number;
  cases: number;
  units: number;
  catalogVersion: string;
  catalogEntries: number;
  systemPromptChars: number;
  systemPromptSha256: string;
  node: string;
  spentUsd?: number; // this run only, list price
  note?: string;
}
