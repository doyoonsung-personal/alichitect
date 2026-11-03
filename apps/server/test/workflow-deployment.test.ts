import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkTurnRequest } from '../src/request.ts';
import { executeTurn } from '../src/turn.ts';
import { sharedTurnState } from '../../worker/src/turn.ts';
import { document } from './turn-regressions-fixture.ts';
import { deploymentSource, deploymentWarnings } from '../../../packages/core/src/workflow-deployment.ts';
import { createMemory } from '../../../packages/core/src/prompt.ts';
import type { ServerEvent } from '../../../packages/core/src/types.ts';

test('deployments require an admitted workflow and a cloud turn', () => {
  const body = { sessionId: 's', ask: 'Draw the deployment', intent: 'deployment', memory: document() };
  assert.equal(checkTurnRequest(body).ok, true);
  for (const invalid of [{ ...body, memory: createMemory() }, { ...body, mode: 'workflow' }, { ...body, intent: 'deploy-to-cloud' }]) {
    assert.equal(checkTurnRequest(invalid).ok, false);
  }
});

test('a deployment uses the cloud stream, preserves its workflow and flags missing services after restore', async () => {
  const memory = document();
  memory.workflow!.nodes.start = { ...memory.workflow!.nodes.start, runs: 'fc', product: 'oss' };
  const ask = '이 워크플로의 배포 구성도를 그려 주세요.';
  const req = checkTurnRequest({ sessionId: 's', ask, intent: 'deployment', memory });
  assert.ok(req.ok);
  let lastUser = '';
  const fetchImpl: typeof fetch = async (_url, init) => {
    lastUser = JSON.parse(String(init!.body)).messages.at(-1).content;
    const content = '{"t":"node","id":"files","product":"oss","label":"Invoices"}\n{"t":"done","summary":"완료"}\n';
    return new Response('data: ' + JSON.stringify({ choices: [{ delta: { content } }] }) + '\n\ndata: [DONE]\n\n');
  };
  let commit: Extract<ServerEvent, { type: 'commit' }> | undefined;
  const out = await executeTurn(req.value, { ...sharedTurnState(), apiKey: 'fake', model: 'fake', fallbackModel: null,
    baseUrl: 'https://fake.invalid', fetchImpl }, e => { if (e.type === 'commit') commit = e; }, new AbortController().signal);
  assert.equal(out.outcome, 'commit');
  assert.ok(commit);
  assert.match(lastUser, /"runs":"fc"/);
  assert.match(lastUser, /"from":"start","to":"end"/);
  assert.match(lastUser, /REPLY LANGUAGE: Korean/);
  assert.deepEqual(commit.memory.workflow, memory.workflow);
  assert.equal(commit.memory.turns.at(-2)?.text, ask);
  assert.equal(commit.memory.deploymentSource, deploymentSource(memory));
  assert.deepEqual(commit.warnings.find(w => w.code === 'wf-product-missing')?.ids, ['fc']);
  const restored = checkTurnRequest({ sessionId: 's', ask, memory: commit.memory });
  assert.ok(restored.ok);
  const m = restored.value.memory;
  m.estimate = { runsPerMonth: 200 };
  assert.deepEqual(deploymentWarnings(m).map(w => w.code), ['wf-product-missing']);
  m.graph.nodes.compute = { id: 'compute', label: 'Compute', product: 'fc', group: null };
  assert.deepEqual(deploymentWarnings(m), []);
  m.workflow!.nodes.start.label = 'A different trigger';
  assert.deepEqual(deploymentWarnings(m).map(w => w.code), ['wf-deploy-stale']);
});

test('a completed reply with no first deployment graph is retryable and never commits', async () => {
  const memory = document();
  const out = await executeTurn({ sessionId: 's', ask: 'Draw it', memory, intent: 'deployment' },
    { ...sharedTurnState(), apiKey: 'fake', model: 'fake', fallbackModel: null, baseUrl: 'https://fake.invalid',
      fetchImpl: async () => new Response('data: ' + JSON.stringify({ choices: [{ delta: { content: '{"t":"done"}\n' } }] }) + '\n\ndata: [DONE]\n\n') },
    event => assert.notEqual(event.type, 'commit'), new AbortController().signal);
  assert.equal(out.fatalCode, 'empty-reply');
  assert.equal(memory.deploymentSource, undefined);
});
