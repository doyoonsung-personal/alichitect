// Live check of the Phase 1 watchdog policy in packages/core/src/llm.ts against the real endpoint, using a fetch
// wrapper that injects faults. Default watchdog values throughout (warm 8 s / cold 12 s to the first token, 10 s idle),
// so the timings below are the policy's own.
//   node eval/probe-watchdogs.ts            scenarios 1-6
//   node eval/probe-watchdogs.ts --hedge    also the opt-in same-model hedge (no longer a default)
//   node eval/probe-watchdogs.ts --only 2,4 a subset
// Costs a few cents; every call is booked in eval/results/ledger.jsonl. Prints one PASS/FAIL (or INFO) line per check.
import { loadCatalog } from '../packages/core/src/catalog-node.ts';
import { createMemory } from '../packages/core/src/prompt.ts';
import { FALLBACK_MODEL, createCacheTracker, runTurn } from '../packages/core/src/llm.ts';
import type { RunStatus } from '../packages/core/src/llm.ts';
import type { SessionMemory } from '../packages/core/src/types.ts';
import { appendLedger } from './lib.ts';

const apiKey = process.env.DASHSCOPE_API_KEY;
if (!apiKey) throw new Error('DASHSCOPE_API_KEY is not set');
const argv = process.argv.slice(2);
const only = argv.includes('--only') ? new Set(String(argv[argv.indexOf('--only') + 1]).split(',').map(Number)) : null;
const want = (n: number): boolean => !only || only.has(n);
const catalog = loadCatalog();
const real = globalThis.fetch;
const ASK = 'A small API for a mobile app: API gateway, Function Compute and a database.';
let failed = 0;
const report = (name: string, ok: boolean | null, detail: string): void => {
  if (ok === false) failed++;
  console.log(`${ok === null ? 'INFO' : ok ? 'PASS' : 'FAIL'} ${name}: ${detail}`);
};
const onCost = (label: string) => (c: { model: string; phase: string; costUsd: number; usage: unknown; estimated: boolean }): void =>
  appendLedger({ ts: new Date().toISOString(), label: 'probe-watchdogs', model: c.model, phase: c.phase, costUsd: c.costUsd, estimated: c.estimated, usage: c.usage as undefined, case: label });

interface Seen {
  calls: Array<{ at: number; model: string; thinking: unknown }>;
}

/** Wraps fetch: records each call's time, model and enable_thinking; `fault(n)` may replace call n (0-based). */
function wrap(fault: (n: number, url: string | URL | Request, init?: RequestInit) => Promise<Response> | null): { fetchImpl: typeof fetch; seen: Seen } {
  const seen: Seen = { calls: [] };
  const fetchImpl = ((url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
    const n = seen.calls.length;
    seen.calls.push({ at: performance.now(), model: String(body.model), thinking: body.enable_thinking });
    return fault(n, url, init) ?? real(url, init);
  }) as typeof fetch;
  return { fetchImpl, seen };
}

/** Never answers until aborted. */
const stall = (init?: RequestInit): Promise<Response> =>
  new Promise((_, rej) => init?.signal?.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' })), { once: true }));

/** The real response cut after `events` SSE events, then silent until aborted. */
async function cut(url: string | URL | Request, init: RequestInit | undefined, events: number): Promise<Response> {
  const res = await real(url, init);
  if (!res.body) return res;
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  const enc = new TextEncoder();
  let buf = '';
  let sent = 0;
  const body = new ReadableStream<Uint8Array>({
    async pull(c) {
      for (;;) {
        if (sent >= events) return new Promise<void>(() => undefined);
        const i = buf.indexOf('\n\n');
        if (i >= 0) {
          sent++;
          c.enqueue(enc.encode(buf.slice(0, i + 2)));
          buf = buf.slice(i + 2);
          return;
        }
        const { value, done } = await reader.read();
        if (done) return c.close();
        buf += dec.decode(value, { stream: true });
      }
    },
    cancel() {
      reader.cancel().catch(() => undefined);
    },
  });
  return new Response(body, { status: res.status, headers: res.headers });
}

const statusLog = (into: Array<RunStatus & { at: number }>) => (s: RunStatus): void => {
  into.push({ ...s, at: performance.now() });
};

// 1. A stall on a warm prefix: no hedge, the 8 s first-token watchdog trips, and the fallback starts at once.
if (want(1)) {
  const { fetchImpl, seen } = wrap((n, _u, init) => (n === 0 ? stall(init) : null));
  const statuses: Array<RunStatus & { at: number }> = [];
  const t0 = performance.now();
  const r = await runTurn(createMemory(), ASK, catalog, { apiKey, warm: true, tracker: createCacheTracker(), fetchImpl, onStatus: statusLog(statuses), onCost: onCost('fallback') });
  const a = r.stats.attempts.map((x) => `${x.model}:${x.error?.code ?? 'ok'}`).join(' -> ');
  const switchAt = seen.calls[1] ? Math.round(seen.calls[1].at - t0) : -1;
  const gap = statuses[0] && seen.calls[1] ? Math.round(seen.calls[1].at - statuses[0].at) : -1;
  const ok =
    seen.calls.length === 2 &&
    r.stats.attempts[0].error?.code === 'first-byte-timeout' &&
    r.stats.model === FALLBACK_MODEL &&
    seen.calls[1].thinking === false &&
    statuses.map((s) => s.code).join() === 'fallback' &&
    switchAt >= 7900 && switchAt < 8600 &&
    gap < 100 &&
    r.stats.doneSeen && r.stats.ops > 10;
  report('warm stall -> fallback at once (default 8 s)', ok, `${a}; ${seen.calls.length} requests (no hedge); fallback request at ${switchAt} ms, ${gap} ms after the status; thinking ${seen.calls[1]?.thinking}; fallback first token ${r.stats.firstByteMs} ms after its start; ${r.stats.ops} ops, done ${r.stats.doneSeen}, $${r.stats.costUsd.toFixed(4)}, turn ${r.stats.turnMs} ms`);
}

// 2. A normal warm turn: exactly one request (no hedge), first token measured.
if (want(2)) {
  const { fetchImpl, seen } = wrap(() => null);
  const r = await runTurn(createMemory(), ASK, catalog, { apiKey, warm: true, tracker: createCacheTracker(), fetchImpl, onCost: onCost('no-hedge') });
  report('warm turn sends one request (no hedge)', seen.calls.length === 1 && !r.stats.hedged && r.stats.doneSeen, `${seen.calls.length} request; first token ${r.stats.firstByteMs} ms, first op ${r.stats.firstOpMs} ms, first node ${r.stats.firstNodeMs} ms, total ${r.stats.totalMs} ms; cached ${r.stats.cachedTokens}/${r.stats.promptTokens} prompt tokens; $${r.stats.costUsd.toFixed(4)}`);
}

// 3. A stream cut off after 70 SSE events, then silent: the 10 s idle watchdog trips and one continuation turn,
// on the fallback model (a stall), finishes the diagram without repeating drawn nodes.
if (want(3)) {
  const { fetchImpl, seen } = wrap((n, u, init) => (n === 0 ? cut(u, init, 70) : null));
  const statuses: Array<RunStatus & { at: number }> = [];
  const r = await runTurn(createMemory(), ASK, catalog, { apiKey, tracker: createCacheTracker(), fetchImpl, onStatus: statusLog(statuses), onCost: onCost('continue') });
  const nodes = Object.keys(r.memory.graph.nodes).length;
  const kind = r.stats.repair?.kind;
  report(
    'cut-off stream -> continuation on the fallback',
    r.stats.error?.code === 'idle-timeout' && r.stats.truncated && r.stats.finalDone && (kind === 'continue' || kind === 'both') && r.stats.repair?.model === FALLBACK_MODEL && nodes >= 5,
    `main ${r.stats.ops} ops then ${r.stats.error?.code}; statuses ${statuses.map((s) => s.code).join(',')}; continuation ${r.stats.repair?.ops.length ?? 0} ops (${kind}) on ${r.stats.repair?.model} (requests: ${seen.calls.map((c) => c.model).join(', ')}), final ${nodes} nodes, ${Object.keys(r.memory.graph.edges).length} edges, done ${r.stats.finalDone}, $${r.stats.costUsd.toFixed(4)}, ${r.stats.turnMs} ms`,
  );
  const ids = r.ops.filter((o) => o.t === 'node').map((o) => (o as { id: string }).id);
  report('continuation does not repeat drawn nodes', new Set(ids).size === ids.length, `${ids.length} node ops, ${new Set(ids).size} distinct ids`);
}

// 4. A content-filter rejection (simulated provider response; the real filter is not provoked on purpose): no retry,
// no fallback, memory unchanged, code content-filtered.
if (want(4)) {
  const body = JSON.stringify({ code: 'DataInspectionFailed', message: 'Input data may contain inappropriate content.', request_id: 'probe' });
  const { fetchImpl, seen } = wrap((n) => (n === 0 ? Promise.resolve(new Response(body, { status: 400, headers: { 'content-type': 'application/json' } })) : null));
  const mem = createMemory();
  const statuses: Array<RunStatus & { at: number }> = [];
  const r = await runTurn(mem, ASK, catalog, { apiKey, retries: 3, tracker: createCacheTracker(), fetchImpl, onStatus: statusLog(statuses), onCost: onCost('filter') });
  report('content filter (simulated 400) -> not retried', seen.calls.length === 1 && r.stats.error?.code === 'content-filtered' && r.stats.error.retryable === false && r.memory === mem && !statuses.length, `${seen.calls.length} request, code ${r.stats.error?.code}, retryable ${r.stats.error?.retryable}, memory unchanged ${r.memory === mem}, statuses ${statuses.length}`);
}

// 5. Structured req ops, live: residency and a ruled-out product become memory.constraints.
let pinned: SessionMemory | null = null;
if (want(5) || want(6)) {
  const r = await runTurn(createMemory(), 'A small web shop for Southeast Asia. Customer data must stay in Singapore, and we do not want Kubernetes.', catalog, { apiKey, tracker: createCacheTracker(), onCost: onCost('req-structured') });
  const cs = r.memory.constraints ?? [];
  const regions = cs.flatMap((c) => c.regions ?? []);
  const avoid = cs.flatMap((c) => c.avoid ?? []);
  const k8s = Object.values(r.memory.graph.nodes).filter((n) => ['ack', 'acs', 'ack-one'].includes(n.product)).length;
  if (want(5)) {
    report('req ops carry regions and avoid -> memory.constraints', regions.includes('ap-southeast-1') && avoid.includes('ack') && k8s === 0 && r.stats.finalDone, `constraints ${JSON.stringify(cs.map((c) => ({ regions: c.regions, avoid: c.avoid })))}; requirements ${r.memory.requirements.length}; Kubernetes nodes ${k8s}; constraint warnings after ${r.stats.warningsAfter.filter((w) => w.code.startsWith('constraint-')).length}; repair ${r.stats.repair?.kind ?? 'none'}; $${r.stats.costUsd.toFixed(4)}, ${r.stats.turnMs} ms`);
  }
  pinned = r.memory;
}

// 6. A follow-up that pushes against the residency constraint: the model should keep DR inside Singapore. The real
// validate.ts checker runs; a repair turn appears only when the model broke the constraint. INFO, not pass/fail:
// it measures model behaviour.
if (want(6) && pinned) {
  const r = await runTurn(pinned, 'Add disaster recovery with a copy of the data in Kuala Lumpur.', catalog, { apiKey, tracker: createCacheTracker(), onCost: onCost('req-pushback') });
  const regionGroups = Object.values(r.memory.graph.groups).filter((g) => g.kind === 'region').map((g) => g.label);
  const before = r.stats.warningsBefore.filter((w) => w.code === 'constraint-region').map((w) => w.severity);
  const after = r.stats.warningsAfter.filter((w) => w.code === 'constraint-region').map((w) => w.severity);
  report('residency pushback (Kuala Lumpur DR)', null, `region groups ${JSON.stringify(regionGroups)}; constraint-region before repair [${before.join(',')}], after [${after.join(',')}]; repair ${r.stats.repair?.kind ?? 'none'}; ${r.says.length} say lines; $${r.stats.costUsd.toFixed(4)}, ${r.stats.turnMs} ms`);
}

// 7. Opt-in: the same-model hedge (no longer a default), for comparison with Phase 0.
if (argv.includes('--hedge')) {
  const { fetchImpl, seen } = wrap((n, _u, init) => (n === 0 ? stall(init) : null));
  const r = await runTurn(createMemory(), ASK, catalog, { apiKey, warm: true, hedgeAfterMs: 1500, watchdogs: { warm: { firstByteTimeoutMs: 15000 } }, tracker: createCacheTracker(), fetchImpl, onCost: onCost('hedge') });
  report('opt-in hedge wins over a stalled first request', r.stats.hedged && r.stats.hedgeWon && r.stats.doneSeen && r.stats.ops > 10, `${seen.calls.length} requests; hedged ${r.stats.hedged}, won ${r.stats.hedgeWon}, ${r.stats.ops} ops, done ${r.stats.doneSeen}, $${r.stats.costUsd.toFixed(4)} (estimated ${r.stats.costEstimated}), ${r.stats.turnMs} ms`);
}

process.exit(failed ? 1 : 0);
