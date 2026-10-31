// Phase 1b additions to the harness: ask and assume counts, options, stated details not re-asked, flipped chips, partial-scope
// checks (no compute tier, provider names only on other-cloud), the GPU-name denylist, the question assertion with ask ops,
// the ask-language check, and the structure of the Phase 1b case files.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import type { Graph, Op } from '../../packages/core/src/types.ts';
import { EVAL_DIR, checkCases, evaluateTurn, loadCases, productNamePattern } from '../lib.ts';
import type { AssertionResult, EvalTurn, TurnView } from '../lib.ts';
import { loadCatalog } from '../../packages/core/src/catalog-node.ts';

const catalog = loadCatalog();
const names = productNamePattern(catalog);
const baseStats = { ops: 0, warningsBefore: [], warningsAfter: [], badLines: 0, doneSeen: true, finishReason: 'stop' as const, escapes: 0 };

function graph(groups: Array<[string, string, string]>, nodes: Array<[string, string, string]>): Graph {
  const gs: Record<string, any> = {};
  for (const [id, kind, label] of groups) gs[id] = { id, kind, label, parent: null };
  const ns: Record<string, any> = {};
  for (const [id, product, label] of nodes) ns[id] = { id, product, label, group: null };
  return { groups: gs, nodes: ns, edges: {}, recs: [] };
}

function view(over: Partial<TurnView>): TurnView {
  const empty = graph([], []);
  return { ask: 'x', ops: [], says: ['Here is the design.'], reqs: [], gaps: [], rawProducts: [], graph: empty, before: empty, requirements: [], constraints: [], userTexts: [], stats: { ...baseStats }, ...over } as TurnView;
}

const t = (expect: any): EvalTurn => ({ ask: 'x', expect });
const run = (v: TurnView, expect: any, lang: 'en' | 'ko' | 'zh' = 'en'): AssertionResult[] => evaluateTurn(v, t(expect), lang, names, catalog);
const pick = (r: AssertionResult[], type: string): AssertionResult[] => r.filter((x) => x.type === type);
const ask = (id: string, text: string, options?: string[]): Op => ({ t: 'ask', id, text, ...(options ? { options } : {}) }) as Op;
const assume = (id: string, text: string, alt?: string): Op => ({ t: 'assume', id, text, ...(alt ? { alt } : {}) }) as Op;

describe('asks and assumes', () => {
  const ops = [ask('a', 'Where are your shoppers?', ['Singapore', 'Worldwide']), ask('b', 'Which database?', ['MySQL', 'PostgreSQL', 'SQL Server']), assume('c', 'Public-facing', 'Internal only')];

  test('counts ask ops within min and max', () => {
    assert.equal(pick(run(view({ ops }), { asks: { min: 1, max: 2 } }), 'asks')[0].pass, true);
    assert.equal(pick(run(view({ ops }), { asks: { max: 1 } }), 'asks')[0].pass, false);
    assert.equal(pick(run(view({ ops: [] }), { asks: { min: 1 } }), 'asks')[0].pass, false);
    assert.equal(pick(run(view({ ops: [] }), { asks: { max: 0 } }), 'asks')[0].pass, true);
  });

  test('options: every ask needs 2-4 options; no ask is fine unless a minimum is required', () => {
    assert.equal(pick(run(view({ ops }), { asks: { options: true } }), 'askOptions')[0].pass, true);
    const bare = [ask('a', 'Which region?')];
    assert.equal(pick(run(view({ ops: bare }), { asks: { options: true } }), 'askOptions')[0].pass, false);
    assert.equal(pick(run(view({ ops: [] }), { asks: { options: true } }), 'askOptions')[0].pass, true);
    assert.equal(pick(run(view({ ops: [] }), { asks: { min: 1, options: true } }), 'askOptions')[0].pass, false);
  });

  test('assume counts', () => {
    assert.equal(pick(run(view({ ops }), { assumes: { min: 1, max: 3 } }), 'assumes')[0].pass, true);
    assert.equal(pick(run(view({ ops }), { assumes: { max: 0 } }), 'assumes')[0].pass, false);
  });

  test('notAsking catches a stated detail in the text or in an option, case-insensitively', () => {
    assert.equal(pick(run(view({ ops }), { notAsking: ['singapore'] }), 'reask')[0].pass, false); // option "Singapore"
    assert.equal(pick(run(view({ ops }), { notAsking: ['indonesia'] }), 'reask')[0].pass, true);
    assert.equal(pick(run(view({ ops }), { notAsking: ['DATABASE'] }), 'reask')[0].pass, false);
  });

  test('notAssuming catches a restated detail in the text or the alternative', () => {
    assert.equal(pick(run(view({ ops }), { notAssuming: ['public'] }), 'reask')[0].pass, false);
    assert.equal(pick(run(view({ ops }), { notAssuming: ['internal'] }), 'reask')[0].pass, false); // the alt counts
    assert.equal(pick(run(view({ ops }), { notAssuming: ['singapore'] }), 'reask')[0].pass, true);
  });

  test('assumedGone reads the assumptions held after the turn', () => {
    const kept = view({ assumptions: [{ id: 'c', text: 'Public-facing store', alt: 'Internal only' }] });
    assert.equal(pick(run(kept, { assumedGone: ['public-facing'] }), 'chips')[0].pass, false);
    assert.equal(pick(run(view({ assumptions: [] }), { assumedGone: ['public-facing'] }), 'chips')[0].pass, true);
    assert.equal(pick(run(view({}), { assumedGone: ['public-facing'] }), 'chips')[0].pass, true); // older records have no assumptions
  });

  test('the question assertion accepts an ask op as well as a question mark in a say', () => {
    assert.equal(pick(run(view({ ops, says: ['I will draw it.'] }), { question: true }), 'question')[0].pass, true);
    assert.equal(pick(run(view({ says: ['Which team is it for?'] }), { question: true }), 'question')[0].pass, true);
    assert.equal(pick(run(view({ says: ['I will draw it.'] }), { question: true }), 'question')[0].pass, false);
  });

  test('ask and assume text does not count as a price, but notMention reads it', () => {
    const budget = [ask('a', 'What monthly budget?', ['Under $500', '$500 to $2,000'])];
    assert.equal(pick(run(view({ ops: budget }), {}), 'noPrices')[0].pass, true);
    assert.equal(pick(run(view({ ops: [ask('a', 'Use LangStudio?', ['Yes', 'No'])] }), { notMention: ['langstudio'] }), 'notMention')[0].pass, false);
  });

  test('ask text must be in the language of the case for ko and zh', () => {
    const ko = view({ ops: [ask('a', '어떤 워크로드를 실행하시나요?', ['웹사이트', '내부 시스템'])], says: ['어떤 워크로드를 실행하시는지 알려 주세요.'] });
    assert.equal(pick(run(ko, {}, 'ko'), 'askLang')[0].pass, true);
    const en = view({ ops: [ask('a', 'What will you run?', ['A website', 'Internal systems'])], says: ['어떤 워크로드를 실행하시는지 알려 주세요.'] });
    assert.equal(pick(run(en, {}, 'ko'), 'askLang')[0].pass, false);
    assert.equal(pick(run(view({}), {}, 'en'), 'askLang').length, 0);
  });
});

describe('partial scope', () => {
  const dbOnly = graph([['aws', 'external', 'AWS']], [['app', 'other-cloud', 'AWS app servers'], ['db', 'rds', 'RDS MySQL'], ['vpn', 'vpn-gateway', 'VPN Gateway']]);
  const withApp = graph([], [['app', 'ecs', 'App servers'], ['db', 'rds', 'RDS']]);

  test('noCompute fails on a compute tier and passes on a database-only design', () => {
    assert.equal(pick(run(view({ graph: dbOnly }), { noCompute: true }), 'scope')[0].pass, true);
    const r = pick(run(view({ graph: withApp }), { noCompute: true }), 'scope')[0];
    assert.equal(r.pass, false);
    assert.match(r.detail ?? '', /ecs/);
    for (const p of ['sae', 'fc', 'ack', 'acs', 'eci', 'ess']) {
      assert.equal(pick(run(view({ graph: graph([], [['x', p, p]]) }), { noCompute: true }), 'scope')[0].pass, false, p);
    }
  });

  test('providerNames: the provider name may sit on other-cloud nodes and external groups only', () => {
    assert.equal(pick(run(view({ graph: dbOnly }), { providerNames: ['aws'] }), 'scope')[0].pass, true);
    const bad = graph([['aws', 'region', 'AWS Singapore']], [['app', 'ecs', 'App servers (EC2 equivalent)'], ['s', 'oss', 'S3 replacement']]);
    const r = pick(run(view({ graph: bad }), { providerNames: ['aws', 'ec2', 's3'] }), 'scope')[0];
    assert.equal(r.pass, false);
    assert.match(r.detail ?? '', /group aws/);
    assert.match(r.detail ?? '', /node app/);
    assert.match(r.detail ?? '', /node s/);
  });

  test('providerNames matches whole words: "laws" and "awsome" do not contain AWS', () => {
    assert.equal(pick(run(view({ graph: graph([], [['x', 'ecs', 'Laws engine']]) }), { providerNames: ['aws'] }), 'scope')[0].pass, true);
  });

  test('providerNames matches multi-word names with any spacing', () => {
    const g = graph([], [['x', 'ecs', 'Google  Cloud proxy']]);
    assert.equal(pick(run(view({ graph: g }), { providerNames: ['google cloud'] }), 'scope')[0].pass, false);
  });
});

describe('GPU names', () => {
  const say = (s: string): TurnView => view({ says: [s] });
  test('A10, T4, V100 and P100 are allowed', () => {
    assert.equal(pick(run(say('Generally available in Singapore: A10, T4, V100 and P100; newer cards need sales confirmation.'), { gpuNames: true }), 'gpu')[0].pass, true);
  });
  test('any other GPU model fails, in say, labels, why and asks', () => {
    for (const bad of ['H100', 'A100', 'H20', 'L20', 'A800', 'H800', 'L40S', 'RTX 4090', 'P4']) {
      assert.equal(pick(run(say(`We can offer ${bad} cards.`), { gpuNames: true }), 'gpu')[0].pass, false, bad);
    }
    const inLabel = view({ ops: [{ t: 'node', id: 'n', product: 'pai-eas', label: 'EAS on H20', why: '' } as Op] });
    assert.equal(pick(run(inLabel, { gpuNames: true }), 'gpu')[0].pass, false);
    const inAsk = view({ ops: [ask('a', 'Which GPU?', ['A100', 'T4'])] });
    assert.equal(pick(run(inAsk, { gpuNames: true }), 'gpu')[0].pass, false);
  });
  test('A10 is not mistaken for A100', () => {
    assert.equal(pick(run(say('A10 GPUs are available.'), { gpuNames: true }), 'gpu')[0].pass, true);
  });
});

describe('Phase 1b case files', () => {
  const dirs = ['cases', 'cases-heldout-p1c'].map((d) => path.join(EVAL_DIR, d));
  const tuned = loadCases(dirs[0]);
  const held = loadCases(dirs[1]);

  test('the cases are well formed', () => {
    assert.deepEqual(checkCases(tuned, catalog), []);
    assert.deepEqual(checkCases(held, catalog), []);
  });

  test('no case id and no ask is shared between the tuned and the held-out sets', () => {
    const ids = new Set(tuned.map((c) => c.id));
    assert.deepEqual(held.filter((c) => ids.has(c.id)).map((c) => c.id), []);
    const asks = new Set(tuned.flatMap((c) => c.turns.map((x) => x.ask.trim())));
    const dup = held.flatMap((c) => c.turns.map((x) => x.ask.trim())).filter((a) => asks.has(a));
    assert.deepEqual(dup, []);
  });

  test('the new cases carry the assertions the spec asks for', () => {
    const all = [...tuned, ...held];
    const exp = (id: string) => all.find((c) => c.id === id)!.turns.map((x) => x.expect ?? {});
    // question first: no nodes, 1-2 asks with options
    assert.equal(exp('as-01-vague-company')[0].noNodes, true);
    assert.deepEqual(exp('as-01-vague-company')[0].asks, { min: 1, max: 2, options: true });
    // fully stated: no ask ops
    assert.deepEqual(exp('as-03-fully-stated')[0].asks, { max: 0 });
    // partial scope: no compute, other-cloud present, provider names policed
    for (const id of ['sc-01-rds-aws', 'sc-03-waf-cdn-gcp', 'sc-ho-dr-azure-sql', 'sc-ho-onprem-db']) assert.equal(exp(id)[0].noCompute, true, id);
    for (const id of ['sc-01-rds-aws', 'sc-02-rds-aws-migrate', 'sc-03-waf-cdn-gcp']) assert.ok(exp(id)[0].include!.some((g) => g.includes('other-cloud')), id);
    assert.deepEqual(exp('sc-01-rds-aws')[0].zones, [['rds']]);
    assert.ok(exp('sc-02-rds-aws-migrate')[0].include!.some((g) => g.includes('dts')));
    // the build-here trap keeps EC2 and S3 on Alibaba Cloud
    assert.deepEqual(exp('sc-04-ec2-s3-trap')[0].include, [['ecs'], ['oss']]);
    assert.deepEqual(exp('sc-04-ec2-s3-trap')[0].exclude, ['other-cloud']);
    // RL: no official reference in the narration, no pai-instant
    for (const id of ['ai-ho-rl-sandboxes', 'ai-10-rl-flash-sandbox']) {
      assert.ok(exp(id)[0].exclude!.includes('pai-instant'), id);
      assert.ok(exp(id)[0].mention!.some((g) => g.includes('no official')), id);
    }
    // amendment cases
    assert.ok(exp('ai-08-poc-finetune-8gpu')[0].exclude!.includes('lingjun'));
    assert.ok(exp('ai-08-poc-finetune-8gpu')[0].include!.some((g) => g.includes('pai-dlc')));
    assert.equal(exp('ai-ho-gpu-inference-sg')[0].gpuNames, true);
  });

  test('about half of the new cases are held out, and the AI cases follow the proposal split', () => {
    const newTuned = tuned.filter((c) => /^(ai|as|sc)-/.test(c.id)).length;
    assert.ok(held.length >= newTuned * 0.8 && held.length <= newTuned * 1.4, `${held.length} held out against ${newTuned} tuned`);
    assert.equal(tuned.filter((c) => c.id.startsWith('ai-')).length + held.filter((c) => c.id.startsWith('ai-')).length, 17);
  });

  test('Korean and Chinese variants exist in both sets and their asks are in the language', () => {
    for (const set of [tuned, held]) {
      assert.ok(set.some((c) => c.lang === 'ko' && /^(as|sc|ai)-/.test(c.id)));
    }
    assert.ok(held.some((c) => c.lang === 'zh' && /^(as|sc|ai)-/.test(c.id)));
    for (const c of [...tuned, ...held].filter((x) => /^(as|sc)-/.test(x.id) && x.lang)) {
      const ask = c.turns[0].ask;
      assert.ok(c.lang === 'ko' ? /\p{Script=Hangul}/u.test(ask) : /\p{Script=Han}/u.test(ask), c.id);
    }
  });
});
