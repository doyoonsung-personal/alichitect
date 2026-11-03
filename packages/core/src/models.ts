// The Model Studio model and built-in tool table a workflow step may name (catalog/models.json). International scope
// only: every row is a model a new Singapore account can call. null means the research did not establish a fact.
import type { Lifecycle, WorkflowTask } from './types.ts';

export type Modality = 'text' | 'image' | 'video' | 'audio';
export type VideoResolution = 480 | 720 | 1080;
export interface PriceTier {
  upTo?: number; in?: number; out?: number; thinkingOut?: number; cacheHit?: number;
  cacheRead?: number; cacheWrite?: number; audioIn?: number; audioOut?: number; perUnit?: number;
  resolution?: VideoResolution;
}
export interface ModelEntry {
  id: string; name: string; family: 'qwen' | 'wan' | 'happyhorse'; tier: 'small' | 'mid' | 'large';
  in: Modality[]; out: Modality[]; roles: WorkflowTask[]; functions: boolean | null;
  tools: string[] | null; batch: boolean | null; regions: string[]; status: Lifecycle;
  price?: { unit: 'mtok' | 'image' | '10k-chars' | 'second'; tiers: PriceTier[] };
  video?: { minSeconds?: number; maxSeconds: number };
  use: string; note?: string; verified: string; source: string;
}
export interface ToolEntry {
  id: string; name: string; fee?: { usd: number; per: number; unit: 'call' | 'page' };
  freeUntilNotice?: boolean; note?: string; verified: string; source: string;
}
export interface ModelFile { version: string; scope: 'international'; models: ModelEntry[]; tools: ToolEntry[] }
export interface ModelTable {
  version: string; models: ModelEntry[]; byId: Map<string, ModelEntry>; tools: Map<string, ToolEntry>;
  model(id: string): ModelEntry | undefined;
  tool(id: string): ToolEntry | undefined;
  promptRows(): string;
}
export const WORKFLOW_TASKS: readonly WorkflowTask[] = ['classify', 'extract', 'retrieve', 'rerank', 'generate', 'check', 'plan', 'summarise', 'translate', 'transcribe', 'speak', 'see', 'create', 'approve', 'review', 'takeover'];

export function createModelTable(file: ModelFile): ModelTable {
  const models = structuredClone(file.models);
  const byId = new Map<string, ModelEntry>();
  const tools = new Map<string, ToolEntry>();
  const ids = new Set<string>();
  for (const entry of [...models, ...file.tools]) {
    if (ids.has(entry.id)) throw new Error(`Duplicate model or tool id: ${entry.id}`);
    ids.add(entry.id);
  }
  for (const tool of file.tools) tools.set(tool.id, structuredClone(tool));
  for (const model of models) {
    if (!['small', 'mid', 'large'].includes(model.tier)) throw new Error(`Unknown tier for ${model.id}`);
    if ([...model.in, ...model.out].some((x) => !['text', 'image', 'video', 'audio'].includes(x))) throw new Error(`Unknown modality for ${model.id}`);
    if (model.roles.some((x) => !WORKFLOW_TASKS.includes(x))) throw new Error(`Unknown role for ${model.id}`);
    if (model.tools?.some((x) => !tools.has(x))) throw new Error(`Unknown tool for ${model.id}`);
    if (model.video && (!model.out.includes('video') || !Number.isFinite(model.video.maxSeconds) || model.video.maxSeconds <= 0
      || (model.video.minSeconds !== undefined && (!Number.isFinite(model.video.minSeconds)
        || model.video.minSeconds <= 0 || model.video.minSeconds > model.video.maxSeconds)))) {
      throw new Error(`Invalid video limits for ${model.id}`);
    }
    if (model.price?.unit === 'second') {
      const tiers = model.price.tiers;
      if (!model.video || !model.roles.includes('create') || !tiers.length
        || tiers.some((t) => ![480, 720, 1080].includes(t.resolution ?? 0) || !Number.isFinite(t.perUnit) || t.perUnit! <= 0)
        || new Set(tiers.map((t) => t.resolution)).size !== tiers.length) {
        throw new Error(`Invalid video prices for ${model.id}`);
      }
    }
    byId.set(model.id, model);
  }
  return {
    version: file.version, models, byId, tools,
    model: (id) => byId.get(id), tool: (id) => tools.get(id),
    promptRows: () => models.map((m) => `${m.id} | ${m.tier} | ${m.in.join(',')}>${m.out.join(',')} | ${m.roles.join(',')} | ${m.note ?? ''}`).join('\n'),
  };
}
