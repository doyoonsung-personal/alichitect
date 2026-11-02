// The p7a model is the source of generated prose, mapping and estimate amounts.
import type { ProposalModel, WorkflowProposalModel } from './model.ts';
import type { AppState } from '../store/types.ts';
import type { Catalog } from '@ali/core/types.ts';
import { layoutGraph } from '@ali/core/layout.ts';
import { layoutWorkflow } from '@ali/core/workflow-layout.ts';
export type WorkflowPdfData = WorkflowProposalModel;
export function workflowPdfData(model: ProposalModel): WorkflowPdfData | null {
  return model.workflow ?? null;
}

export function committedExportSnapshot(state: AppState, catalog: Catalog) {
  const session = structuredClone(state.session);
  const graph = session.memory.graph;
  const workflow = session.memory.workflow;
  return { session, graph,
    layout: !state.work ? state.display.layout : layoutGraph(graph, catalog),
    ...(workflow ? { workflow, workflowLayout: layoutWorkflow(workflow) } : {}),
  };
}
