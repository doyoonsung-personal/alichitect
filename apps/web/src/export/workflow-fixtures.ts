// Deterministic export fixtures; no model or network calls.
import type { WorkflowGraph } from '@ali/core/types.ts';
import type { Lang } from '../i18n/t.ts';
export function workflowFixture(count = 10, lang: Lang = 'en'): WorkflowGraph {
  const wf: WorkflowGraph = { nodes: {}, edges: {}, groups: {} };
  for (let k = 0; k < count; k++) {
    const id = `step-${k}`;
    wf.nodes[id] = { id, kind: k === 0 ? 'trigger' : k === count - 1 ? 'end' : k === 2 ? 'human' : k === 3 ? 'agent' : 'ai',
      label: lang === 'ko' ? `단계 ${k} 고객 요청을 검토하고 응답 작성` : lang === 'zh' ? `步骤 ${k} 审核客户请求并编写回复` : `Step ${k} <review & respond>`,
      ...(k > 0 && k !== 2 && k < count - 1 ? { ai: 'qwen3.8-flash', task: 'generate' as const } : {}),
      ...(k === 3 ? { turns: 4, product: 'agentcore' } : {}),
      ...(k === 4 ? { effect: 'send' as const } : {}), runs: 'customer' };
    if (k) wf.edges[`next-${k}`] = { id: `next-${k}`, from: `step-${k - 1}`, to: id,
      ...(k === 3 ? { outcome: 'approve' as const } : {}) };
  }
  for (let k = 0; k < 4; k++) wf.nodes[`tool-${k}`] = {
    id: `tool-${k}`, kind: 'tool', label: `Attached tool ${k}`, on: 'step-3', runs: 'customer',
  };
  wf.edges.retry = { id: 'retry', from: 'step-4', to: 'step-3', kind: 'loop', max: 2 };
  wf.edges.branch = { id: 'branch', from: 'step-1', to: 'step-2', kind: 'branch', label: 'Needs review' };
  wf.edges.escalation = { id: 'escalation', from: 'step-3', to: 'step-2', kind: 'escalate', outcome: 'exhausted' };
  return wf;
}
