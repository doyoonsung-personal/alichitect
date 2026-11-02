import type { Catalog, WorkflowGraph, WorkflowSettings, WorkflowEstimateSettings } from '@ali/core/types.ts';
import type { WorkflowLayout } from './layout-adapter.ts';
import type { WorkflowEstimate } from '@ali/core/workflow-estimate.ts';
import type { Lang, TFn } from '../i18n/t.ts';
import type { Controller } from '../app/controller.ts';
import type { Highlight } from '../store/types.ts';
export interface WorkflowViewProps {
  view: 'workflow'; lang: Lang; t: TFn; catalog: Catalog; workflow: WorkflowGraph;
  layout: WorkflowLayout; version: number; settings: WorkflowSettings;
  estimateSettings: WorkflowEstimateSettings; estimate: WorkflowEstimate;
  disabled: boolean; streaming: boolean; open: boolean; highlight: Highlight | null;
  tagged: { n: number; cards: string[] } | null;
  building: string[];
  panTo: { ids: string[]; seq: number } | null;
  actions: Controller;
}
export type WorkflowSettingsProps = WorkflowViewProps;
export type WorkflowPanelProps = WorkflowViewProps;
export type WorkflowCostProps = WorkflowViewProps;
