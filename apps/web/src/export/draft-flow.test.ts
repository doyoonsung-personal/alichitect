import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ProposalSection } from '@ali/core/types.ts';
import { DONE_HOLD_MS, PREVIEW_MIN_MS, activeStep, designProducts, firstSentence, formatElapsed, previewOf, reduceFlow, startFlow, stepsOf } from './draft-flow.ts';
import type { FlowEvent, FlowState } from './draft-flow.ts';

const names: Record<string, string> = { alb: 'Application Load Balancer', ecs: 'Elastic Compute Service', rds: 'ApsaraDB RDS' };
const name = (id: string): string => names[id] ?? id;
const run = (s: FlowState, evs: FlowEvent[]): FlowState => evs.reduce((a, e) => reduceFlow(a, e, name), s);
const sec = (section: ProposalSection, now: number): FlowEvent => ({ type: 'section', section, now });
const status = (s: FlowState): string => stepsOf(s).map((v) => `${v.id}:${v.status[0]}`).join(' ');

test('before anything is written, the overlay is reading the conversation', () => {
  const s = startFlow(1000, ['alb', 'ecs', 'rds', 'alb']);
  assert.equal(s.products.length, 3, 'each product once');
  assert.equal(status(s), 'read:a exec:p needs:p outcomes:p why:p close:p layout:p');
  assert.equal(activeStep(s), 'read');
  assert.deepEqual(stepsOf(s).find((v) => v.id === 'why')?.count, { k: 0, n: 3 });
});

test('sections move the steps forward and count what was written', () => {
  let s = startFlow(0, ['alb', 'ecs', 'rds']);
  s = run(s, [
    sec({ k: 'exec', text: 'A design for peaks. It scales.' }, 1000),
    sec({ k: 'need', id: 'n1', need: 'Orders must not stop at lunch', source: 'stated', quote: 'the servers stall at lunch', answer: 'ALB spreads it.', products: ['alb'] }, 4000),
    sec({ k: 'need', id: 'n2', need: 'Data stays in Singapore', source: 'inferred', answer: 'One region.', products: ['rds'] }, 8000),
  ]);
  assert.equal(status(s), 'read:d exec:d needs:a outcomes:p why:p close:p layout:p');
  assert.deepEqual(stepsOf(s).find((v) => v.id === 'needs')?.count, { k: 2 });
  s = run(s, [sec({ k: 'outcome', title: 'Pay for what you use', text: 'x' }, 12000), sec({ k: 'why', product: 'alb', text: 'Spreads orders.' }, 14000), sec({ k: 'why', product: 'alb', text: 'again' }, 15000), sec({ k: 'why', product: 'kms', text: 'not in the design' }, 16000)]);
  assert.equal(activeStep(s), 'why');
  assert.deepEqual(stepsOf(s).find((v) => v.id === 'why')?.count, { k: 1, n: 3 }, 'a repeated or unknown product does not count');
  s = run(s, [sec({ k: 'tradeoff', text: 'One region.' }, 20000), sec({ k: 'next', text: 'Confirm traffic.' }, 22000)]);
  assert.equal(activeStep(s), 'close');
  s = reduceFlow(s, { type: 'drafted', now: 23000 });
  assert.equal(status(s), 'read:d exec:d needs:d outcomes:d why:d close:d layout:a');
  s = reduceFlow(s, { type: 'saved', now: 24000 });
  assert.equal(s.phase, 'done');
  assert.ok(stepsOf(s).every((v) => v.status === 'done'));
  assert.equal(activeStep(s), null);
  assert.ok(DONE_HOLD_MS > 0);
});

test('the latest line changes calmly: no faster than once every PREVIEW_MIN_MS, and the newest one wins', () => {
  let s = startFlow(0, ['alb']);
  s = reduceFlow(s, sec({ k: 'exec', text: 'First sentence here. Second one.' }, 100), name);
  assert.deepEqual(s.preview, { text: 'First sentence here.', seq: 1 });
  s = run(s, [sec({ k: 'need', id: 'a', need: 'Need A', source: 'general', answer: 'x', products: [] }, 300), sec({ k: 'outcome', title: 'Outcome B', text: 'y' }, 500)]);
  assert.equal(s.preview?.text, 'First sentence here.', 'held');
  assert.equal(s.pending, 'Outcome B', 'the newest waits');
  s = reduceFlow(s, { type: 'tick', now: 100 + PREVIEW_MIN_MS - 1 }, name);
  assert.equal(s.preview?.text, 'First sentence here.');
  s = reduceFlow(s, { type: 'tick', now: 100 + PREVIEW_MIN_MS }, name);
  assert.deepEqual(s.preview, { text: 'Outcome B', seq: 2 });
  assert.equal(s.pending, null);
  s = reduceFlow(s, sec({ k: 'why', product: 'alb', text: 'Spreads orders over servers. More.' }, 100 + 2 * PREVIEW_MIN_MS), name);
  assert.equal(s.preview?.text, 'Application Load Balancer: Spreads orders over servers.', 'a why line is named by its product');
});

test('a status event shows the quiet note and nothing else; it clears when the PDF is laid out', () => {
  let s = startFlow(0, []);
  s = reduceFlow(s, { type: 'status', now: 5000 });
  assert.equal(s.slow, true);
  assert.equal(s.phase, 'drafting');
  assert.equal(activeStep(s), 'read');
  s = reduceFlow(s, { type: 'drafted', now: 6000 });
  assert.equal(s.slow, false);
});

test('a failure freezes the steps and keeps the error; unavailable is its own state; the basic version lays out without a draft', () => {
  let s = run(startFlow(0, ['alb']), [sec({ k: 'exec', text: 'x' }, 10)]);
  s = reduceFlow(s, { type: 'failed', error: { kind: 'fatal', code: 'quota-exceeded', message: 'You have used today’s turns.', retryable: false }, now: 20 });
  assert.equal(s.phase, 'failed');
  assert.equal(activeStep(s), null, 'nothing spins after a failure');
  assert.equal(s.error?.message, 'You have used today’s turns.');
  assert.equal(reduceFlow(s, sec({ k: 'need', id: 'n', need: 'late', source: 'general', answer: 'x', products: [] }, 30)).needs, 0, 'a late section is ignored');
  s = reduceFlow(s, { type: 'basic', now: 40 });
  assert.deepEqual([s.phase, s.basic, s.error], ['layout', true, null]);
  assert.equal(activeStep(s), 'layout');
  s = reduceFlow(s, { type: 'saved', now: 50 });
  assert.equal(s.phase, 'done');

  const u = reduceFlow(startFlow(0, []), { type: 'failed', error: { kind: 'unavailable', code: 'http-404', message: '', retryable: false }, now: 1 });
  assert.equal(u.phase, 'unavailable');
});

test('first sentences: Latin, Korean and Chinese punctuation, and long text cut at a word', () => {
  assert.equal(firstSentence('Hello there. More text.'), 'Hello there.');
  assert.equal(firstSentence('점심 피크에도 주문이 계속됩니다. 비용은 사용량만큼.'), '점심 피크에도 주문이 계속됩니다.');
  assert.equal(firstSentence('数据留在新加坡。费用按量计算。'), '数据留在新加坡。');
  assert.equal(firstSentence('No full stop at all'), 'No full stop at all');
  assert.equal(previewOf({ k: 'why', product: 'alb', text: 'Application Load Balancer spreads orders. More.' }, name), 'Application Load Balancer spreads orders.', 'no name twice');
  const long = firstSentence('word '.repeat(60));
  assert.ok(long.endsWith('…') && Array.from(long).length <= 161, long);
  assert.equal(previewOf({ k: 'tradeoff', text: 'One region only. Two zones.' }, name), 'One region only.');
});

test('elapsed time reads m:ss; the design products are the drawn cards and the answers, once each', () => {
  assert.deepEqual([formatElapsed(0), formatElapsed(7400), formatElapsed(65_000), formatElapsed(760_000), formatElapsed(-5)], ['0:00', '0:07', '1:05', '12:40', '0:00']);
  assert.deepEqual(designProducts({ nodes: { a: { product: 'alb' }, b: { product: 'ecs' }, c: { product: 'alb' } }, recs: [{ product: 'qoder-teams' }, { product: 'ecs' }] }), ['alb', 'ecs', 'qoder-teams']);
  // constructs get no why line on the server, so a complete draft must be able to reach N
  const graph = { nodes: { u: { product: 'mobile-app' }, a: { product: 'alb' }, b: { product: 'ecs' } }, recs: [] };
  assert.deepEqual(designProducts(graph, (id) => id !== 'mobile-app'), ['alb', 'ecs']);
});

test('Try again after the PDF failed to lay out goes back to laying out with the same narrative', () => {
  let s = run(startFlow(0, ['alb']), [sec({ k: 'exec', text: 'x' }, 10), { type: 'drafted', now: 20 }]);
  s = reduceFlow(s, { type: 'failed', error: { kind: 'layout', code: 'layout', message: '', retryable: true }, now: 30 });
  assert.equal(s.phase, 'failed');
  s = reduceFlow(s, { type: 'drafted', now: 40 });
  assert.deepEqual([s.phase, s.error, activeStep(s)], ['layout', null, 'layout']);
  s = reduceFlow(s, { type: 'saved', now: 50 });
  assert.equal(s.phase, 'done');
  // a writing failure is not laid out: Try again writes the narrative again
  const w = reduceFlow(startFlow(0, []), { type: 'failed', error: { kind: 'network', code: 'network', message: '', retryable: true }, now: 1 });
  assert.equal(reduceFlow(w, { type: 'drafted', now: 2 }).phase, 'failed');
});


test('workflow explanations count steps once and preserve the cloud stages for mixed sessions', () => {
  const wf = { nodes: {
    start: { id: 'start', kind: 'trigger' as const, label: 'Start', product: 'eventbridge' },
    a: { id: 'a', kind: 'ai' as const, label: 'Draft', product: 'model-studio', runs: 'fc' },
    b: { id: 'b', kind: 'human' as const, label: 'Review', runs: 'customer' },
    tool: { id: 'tool', kind: 'tool' as const, label: 'Look up', on: 'a', product: 'tablestore' },
    end: { id: 'end', kind: 'end' as const, label: 'End' },
  }, edges: {}, groups: {} };
  const products = designProducts({ nodes: { cloud: { product: 'fc' } }, recs: [{ product: 'oss' }] }, () => true, wf);
  assert.deepEqual(products, ['fc', 'oss', 'eventbridge', 'model-studio', 'tablestore']);
  let s = startFlow(0, products, wf, true);
  s = run(s, [sec({ k: 'step', id: 'a', text: 'Draft an answer.' }, 100),
    sec({ k: 'step', id: 'a', text: 'Duplicate.' }, 200), sec({ k: 'step', id: 'unknown', text: 'Unknown.' }, 300)]);
  assert.deepEqual(s.steps, ['a', 'unknown']);
  assert.equal(s.next, 0);
  assert.equal(activeStep(s), 'why');
  assert.deepEqual(stepsOf(s).find((v) => v.id === 'why')?.count, { k: 1, n: 2 });
  assert.deepEqual(stepsOf(s).map((v) => v.id), ['read', 'exec', 'needs', 'why', 'layout']);
  assert.equal(s.preview?.text, 'Draft an answer.');
  assert.deepEqual(stepsOf(startFlow(0, products, wf)).find((v) => v.id === 'why')?.count, { k: 0, n: 7 });
});
