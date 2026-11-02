import { createMemory } from '../../../packages/core/src/prompt.ts';
import type { SessionMemory } from '../../../packages/core/src/types.ts';

export function document(): SessionMemory {
  const m = createMemory();
  m.workflow = { nodes: { start: { id: 'start', kind: 'trigger', label: 'Start' }, end: { id: 'end', kind: 'end', label: 'End' } },
    edges: { route: { id: 'route', from: 'start', to: 'end' } }, groups: {} };
  return m;
}

export function crowded(history: boolean): SessionMemory {
  const m = document();
  for (let i = 0; i < (history ? 150 : 2); i++) m.graph.nodes['n-' + i] = {
    id: 'n-' + i, product: 'ecs', label: '한'.repeat(40), why: '한'.repeat(160), group: null,
  };
  for (let i = 0; i < (history ? 100 : 400); i++) m.graph.edges['e-' + i] = {
    id: 'e-' + i, from: 'n-0', to: 'n-1', label: '한'.repeat(history ? 40 : 400),
  };
  for (let i = 0; i < (history ? 8 : 6); i++) m.graph.groups['g-' + i] = {
    id: 'g-' + i, kind: 'vpc', label: '中'.repeat(history ? 40 : 400), parent: null,
  };
  if (history) m.turns = Array.from({ length: 20 }, (_, i) => ({
    role: i % 2 ? 'assistant' : 'user', mode: 'workflow', text: (i === 0 ? 'Remember blue:' : '') + '한'.repeat(6000),
  }));
  return m;
}

export const request = (memory: SessionMemory, ask = '中'.repeat(6000)) => ({ sessionId: 's', mode: 'workflow' as const, ask, memory });

export function fake(bodies: any[], summaryFails = false): typeof fetch {
  return (async (_url, init) => {
    const body = JSON.parse(String(init!.body));
    bodies.push(body);
    const summary = body.messages[0].content.startsWith('You maintain the running summary');
    if (summary && summaryFails) return new Response('{}', { status: 500 });
    const content = summary ? 'Remember blue.' : '{"t":"done"}\n';
    return new Response('data: ' + JSON.stringify({ choices: [{ delta: { content } }] })
      + '\n\ndata: [DONE]\n\n', { headers: { 'content-type': 'text/event-stream' } });
  }) as typeof fetch;
}
