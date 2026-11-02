// The only workflow presentation adapter to browser store names.
import { useMemo } from 'react';
import { useAppState, useController, useCatalog, useT } from '../store/react.tsx';
import { activeHighlight, activePan, taggedRevision } from '../store/selectors.ts';
import { layoutWorkflow } from '@ali/core/workflow-layout.ts';
import { estimateWorkflow } from '@ali/core/workflow-estimate.ts';
import { models } from './models.ts';
import type { WorkflowViewProps } from './contracts.ts';
const EMPTY_SETTINGS = {};
const EMPTY_ESTIMATE_SETTINGS = {};
export function useWorkflowProps(): WorkflowViewProps {
  const s = useAppState((s) => s);
  const actions = useController(), catalog = useCatalog(), { lang, t } = useT();
  const workflow = s.workflowDisplay.graph;
  const layout = useMemo(() => s.workflowDisplay.layout ?? layoutWorkflow(workflow), [s.workflowDisplay.layout, workflow]);
  const estimate = useMemo(() => estimateWorkflow(workflow, models, catalog, s.session.memory.estimate),
    [workflow, catalog, s.session.memory.estimate]);
  return { view: 'workflow', lang, t, catalog, workflow, layout, version: s.workflowDisplay.version,
    settings: s.session.memory.workflowSettings ?? EMPTY_SETTINGS, estimateSettings: s.session.memory.estimate ?? EMPTY_ESTIMATE_SETTINGS,
    estimate, disabled: !!s.work || !!s.replay, streaming: !!s.work, open: s.ui.panelOpen,
    highlight: activeHighlight(s), tagged: taggedRevision(s), building: s.work?.mode === 'workflow' ? s.work.built : [], panTo: activePan(s), actions };
}
