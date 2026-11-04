import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMemory } from '@ali/core/prompt.ts';
import { createInitialState } from '../store/reducer.ts';
import { importAgentDesign } from './agent-design.ts';

test('an authenticated agent design opens as an independent, resumable browser copy', async () => {
  const id = 'f30fa751-a9a9-42d1-b269-6beadfbcef3a';
  const fresh = createInitialState({ lang: 'en', id: 'new-local-session', now: 0, sessions: [] }).session;
  const memory = createMemory();
  memory.graph.nodes.web = { id: 'web', product: 'ecs', label: 'Web tier', group: null };
  const copy = await importAgentDesign(id, fresh, 'en', async (url, init) => {
    assert.equal(url, '/api/agent-designs/' + id);
    assert.equal(init?.cache, 'no-store');
    return Response.json({ designId: id, revision: 3, updatedAt: 42, mode: 'cloud', title: 'Portal', summary: 'Added two servers.', memory });
  });
  assert.equal(copy.id, fresh.id);
  assert.match(copy.title, /Local copy of MCP revision 3/);
  assert.equal(copy.revisions[0].status, 'done');
  assert.deepEqual(copy.memory.graph, memory.graph);
  await assert.rejects(importAgentDesign(id, fresh, 'en', async () => new Response(null, { status: 404 })), /unavailable/);
  await assert.rejects(importAgentDesign('../account', fresh, 'en', async () => assert.fail()), /Invalid design ID/);
});
