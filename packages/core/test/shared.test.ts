// Shared helpers that replace duplicated logic: the price table (src/pricing.ts), the graph diff (src/diff.ts), the
// placement table and the lifecycle checker (src/catalog.ts).
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Graph, Scope } from '../src/types.ts';
import { loadCatalog } from '../src/catalog-node.ts';
import { SCOPE_ORDER, checkLifecycle, placementOf, successorWarning } from '../src/catalog.ts';
import { PRICES, UNKNOWN_PRICE, costOf, estimateCost, priceOf } from '../src/pricing.ts';
import { diffGraphs } from '../src/diff.ts';
import * as llm from '../src/llm.ts';
import * as prompt from '../src/prompt.ts';
import { repairGraph, validateOp } from '../src/validate.ts';
import { completeLines, createLineParser } from '../src/ndjson.ts';
import { applyOp, createCtx } from '../src/reducer.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const CAT = loadCatalog();

describe('pricing', () => {
  test('the qwen rows equal llm.ts PRICES (authoritative); flash creation is 0.1875; unknown models get the conservative price', () => {
    for (const [model, p] of Object.entries(llm.PRICES)) assert.deepEqual(PRICES[model], p, model);
    assert.equal(PRICES['qwen3.8-flash'].explicitCreate, 0.1875);
    assert.deepEqual(priceOf('some-new-model'), UNKNOWN_PRICE);
    assert.deepEqual(priceOf('constructor'), UNKNOWN_PRICE, 'no prototype keys');
    for (const judge of ['kimi-k3', 'deepseek-v4-pro', 'glm-5.3']) assert.deepEqual(PRICES[judge], UNKNOWN_PRICE, judge);
  });

  test('costOf and estimateCost match llm.ts for implicit, explicit and unknown-model usage', () => {
    const usages = [
      { prompt_tokens: 12270, completion_tokens: 782, prompt_tokens_details: { cached_tokens: 11904 } },
      { prompt_tokens: 9000, completion_tokens: 500, prompt_tokens_details: { cached_tokens: 0, cache_creation_input_tokens: 8000, cache_type: 'ephemeral' } },
      { prompt_tokens: 100, completion_tokens: 10 },
    ];
    for (const model of ['qwen3.8-max', 'qwen3.8-flash', 'qwen3.7-max', 'kimi-k3', 'unknown']) {
      for (const u of usages) assert.equal(costOf(model, u), llm.costOf(model, u), `${model} ${JSON.stringify(u)}`);
      assert.equal(estimateCost(model, 30000, 2000), llm.estimateCost(model, 30000, 2000));
    }
    assert.equal(costOf('qwen3.8-max', null), 0);
  });

  const LEDGER = path.join(ROOT, 'eval/results/ledger.jsonl');
  test('reproduces every booked, non-estimated cost in the Phase 0 eval ledger', { skip: existsSync(LEDGER) ? false : 'no ledger' }, (t) => {
    const rows = readFileSync(LEDGER, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l) as { ts: string; model: string; costUsd: number; estimated?: boolean; usage?: unknown });
    const phase0 = rows.filter((r) => r.ts < '2026-10-31T06:00:00Z' && !r.estimated && r.usage);
    let worst = 0;
    for (const r of phase0) worst = Math.max(worst, Math.abs(costOf(r.model, r.usage as Parameters<typeof costOf>[1]) - r.costUsd));
    t.diagnostic(`${phase0.length} ledger rows, models ${[...new Set(phase0.map((r) => r.model))].join(', ')}, worst difference $${worst.toExponential(2)}`);
    assert.ok(phase0.length > 1000);
    assert.ok(worst < 1e-9, `worst difference ${worst}`);
  });
});

describe('diffGraphs', () => {
  test('same output as prompt.diffGraphs on real turns (start graph -> repaired graph)', () => {
    const turns = JSON.parse(readFileSync(path.join(HERE, 'fixtures/phase0-turns.json'), 'utf8')).turns as Array<{ content: string; start: Graph }>;
    for (const t of turns) {
      let g = t.start;
      const ctx = createCtx();
      const p = createLineParser({
        onOp(raw) {
          const v = validateOp(raw, CAT, ctx);
          if (v.op) g = applyOp(g, v.op, ctx).graph;
        },
      });
      p.push(t.content + '\n');
      p.end();
      const after = repairGraph(g, CAT).graph;
      assert.deepEqual(diffGraphs(t.start, after), prompt.diffGraphs(t.start, after));
      assert.deepEqual(diffGraphs(after, t.start), prompt.diffGraphs(after, t.start));
    }
  });
});

describe('completeLines', () => {
  test('same output as llm.completeLines: a half-written last line is dropped unless it parses', () => {
    const cases = ['', '\n', '{"t":"say","text":"a"}', '{"t":"say","text":"a"}\n{"t":"node","id":"x"', '{"t":"say"}\r\n{"t":"done","summary":""}', 'a\nb\n', '{"t":"say"}\n   '];
    for (const c of cases) assert.equal(completeLines(c), llm.completeLines(c), JSON.stringify(c));
    assert.equal(completeLines('{"t":"say","text":"a"}\n{"t":"node","id":"x"'), '{"t":"say","text":"a"}');
  });
});

describe('catalog helpers', () => {
  test('placementOf: one container per scope; onprem and vpcAttachable variants', () => {
    const want: Record<Scope, string | null> = { external: 'external', global: null, edge: 'edge', vpc: 'vpc', 'vpc-edge': 'vpc', region: 'region', account: null, saas: null };
    for (const s of SCOPE_ORDER) assert.equal(placementOf({ scope: s, lane: 'ops' }).container, want[s], s);
    assert.equal(placementOf({ scope: 'external', lane: 'onprem' }).container, 'onprem');
    assert.equal(placementOf({ scope: 'vpc-edge', lane: 'boundary' }).boundary, true);
    assert.equal(placementOf({ scope: 'region', lane: 'compute' }).inside.vpc, 'error');
    assert.equal(placementOf({ scope: 'region', lane: 'compute', vpcAttachable: true }).inside.vpc, undefined);
    assert.deepEqual([placementOf({ scope: 'account', lane: 'governance' }).band, placementOf({ scope: 'saas', lane: 'saas' }).band], ['account', 'saas']);
    for (const e of CAT.entries) assert.ok(placementOf(e), e.id);
  });

  test('checkLifecycle: the one source of status and availability findings', () => {
    const byId = CAT.byId;
    const china = CAT.entries.find((e) => e.availability === 'china-only');
    assert.ok(china);
    assert.equal(checkLifecycle(china, byId).availability?.code, 'china-only');
    const legacy = CAT.entries.find((e) => e.status === 'legacy' && !e.successor);
    if (legacy) assert.match(checkLifecycle(legacy, byId).status?.msg ?? '', /is legacy/);
    const retired = CAT.entries.find((e) => e.status === 'retired' && e.successor);
    assert.ok(retired);
    const lc = checkLifecycle(retired, byId);
    assert.equal(lc.status?.severity, 'error');
    assert.ok(lc.successor);
    assert.equal(CAT.resolve(retired.id).entry?.id, lc.successor.id, 'catalog.resolve follows the same successor chain');
    assert.deepEqual(CAT.resolve(retired.id).warning, successorWarning(retired, lc.successor, `'${retired.id}'`));
    assert.deepEqual(checkLifecycle(CAT.byId.get('ecs')!, byId), {});
  });
});
