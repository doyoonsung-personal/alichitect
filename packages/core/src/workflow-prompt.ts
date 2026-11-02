// The workflow-mode system prompt and the per-turn user message (research/ai-workflows/PLAN.md section 8).
// STUB: phase 4a replaces the bodies; the signatures are the contract the turn pipeline (phase 3a) builds on.
import type { Catalog, SessionMemory, WorkflowGraph } from './types.ts';
import type { ModelTable } from './models.ts';

/** The workflow system prompt for this catalog and model table. Byte-stable: the same inputs give the same string. */
export function buildWorkflowSystemPrompt(catalog: Catalog, models: ModelTable): string {
  return [
    '# AI workflow designer (stub)',
    'Emit one JSON op per line: step, link, each, splice, unstep, say, assume, ask, req, gap, done.',
    `Catalog ${catalog.version}; models ${models.version}.`,
  ].join('\n');
}

/** Compact text form of the current workflow for the user message. */
export function serializeWorkflow(wf: WorkflowGraph): string {
  return JSON.stringify(wf);
}

/** The newest user message in workflow mode: current workflow, removed elements, settings, then the ask. */
export function workflowUserContent(memory: SessionMemory, ask: string): string {
  const wf = memory.workflow;
  const current = wf && Object.keys(wf.nodes).length ? `CURRENT WORKFLOW:\n${serializeWorkflow(wf)}` : 'CURRENT WORKFLOW: empty (new design)';
  return `${current}\n\nUSER MESSAGE:\n${ask}`;
}
