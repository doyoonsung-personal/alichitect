// Deterministic export fixtures; no model or network calls.
import type { WorkflowGraph } from '@ali/core/types.ts';
import type { Lang } from '../i18n/t.ts';
/** Dense cross-page fanout, including nonconsecutive route references after edge sorting. */
export function fanoutWorkflowFixture(count = 20, fragmented = false): WorkflowGraph {
  const workflow: WorkflowGraph = { nodes: {
    start: { id: 'start', kind: 'trigger', label: 'Start' },
    finish: { id: 'finish', kind: 'end', label: 'Complete' },
  }, edges: {}, groups: {} };
  for (let k = 0; k < count; k++) {
    const id = `branch-${k}`;
    workflow.nodes[id] = { id, kind: 'ai', label: `Regional processing branch ${k}`, ai: 'qwen3.8-flash', runs: 'customer' };
    const out = fragmented ? `edge-${String(k * 2).padStart(2, '0')}` : `out-${k}`;
    const incoming = fragmented ? `edge-${String(k * 2 + 1).padStart(2, '0')}` : `in-${k}`;
    workflow.edges[out] = { id: out, from: 'start', to: id, kind: 'branch', label: `Region ${k}` };
    workflow.edges[incoming] = { id: incoming, from: id, to: 'finish' };
  }
  return workflow;
}
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

/** Reproduces the wide inventory/approval layout reported with cropped return paths in PDF details. */
export function inventoryWorkflowFixture(): WorkflowGraph {
  const nodes: WorkflowGraph['nodes'][string][] = [
    { id: 'sched', kind: 'trigger', label: '정기 재고 분석 트리거', product: 'schedulerx' },
    { id: 'fetch-events', kind: 'ai', label: '행사 및 계절 일정 조회', ai: 'qwen3.7-plus', effect: 'read' },
    { id: 'fetch-inventory', kind: 'ai', label: '현재 재고 데이터 조회', ai: 'qwen3.7-plus', effect: 'read' },
    { id: 'fetch-sales', kind: 'ai', label: '판매 추이 데이터 조회', ai: 'qwen3.7-plus', effect: 'read' },
    { id: 'aggregate', kind: 'ai', label: '데이터 종합 및 전처리', ai: 'qwen3.7-plus', join: 'all' },
    { id: 'predict', kind: 'ai', label: '매장별 수요 예측', ai: 'qwen3.8-max', repeat: 'items' },
    { id: 'recommend', kind: 'ai', label: '이동 및 발주 제안 생성', ai: 'qwen3.7-plus', repeat: 'items' },
    { id: 'compile', kind: 'ai', label: '전체 매장 보고서 취합', ai: 'qwen3.7-plus' },
    { id: 'review', kind: 'human', label: '담당자 제안 검토 및 승인', approval: 'required' },
    { id: 'end-reject', kind: 'end', label: '제안 반려 또는 수정 대기' },
    { id: 'notify', kind: 'act', label: '승인된 제안 담당자 알림', effect: 'notify' },
    { id: 'execute', kind: 'act', label: 'ERP 재고 조치 실행', effect: 'write' },
    { id: 'end-ok', kind: 'end', label: '재고 조치 완료' },
  ];
  const pairs = [
    ['sched', 'fetch-events'], ['sched', 'fetch-inventory'], ['sched', 'fetch-sales'],
    ['fetch-events', 'aggregate'], ['fetch-inventory', 'aggregate'], ['fetch-sales', 'aggregate'],
    ['aggregate', 'predict'], ['predict', 'recommend'], ['recommend', 'compile'], ['compile', 'review'],
    ['review', 'end-reject'], ['review', 'notify'], ['notify', 'execute'], ['execute', 'end-ok'],
  ];
  const edges: WorkflowGraph['edges'] = Object.fromEntries(pairs.map(([from, to], n) => [`next-${n}`, {
    id: `next-${n}`, from, to, ...(to === 'notify' ? { outcome: 'approve' as const } : {}),
    ...(to === 'end-reject' ? { outcome: 'reject' as const } : {}),
  }]));
  edges.edit = { id: 'edit', from: 'review', to: 'compile', kind: 'loop', outcome: 'edit', max: 2 };
  return { nodes: Object.fromEntries(nodes.map(node => [node.id, node])), edges,
    groups: { items: { id: 'items', over: '매장별 재고 항목 목록' } } };
}
