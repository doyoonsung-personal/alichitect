// Workflow usage arithmetic. Prices are International; fixed capacity is kept outside usage totals.
import type { Catalog, WorkflowEdge, WorkflowEstimateSettings, WorkflowGraph, WorkflowNode } from './types.ts';
import type { ModelTable } from './models.ts';

export interface WorkflowEstimate {
  typical: { perRunUsd: number; monthlyUsd: number };
  upper: { perRunUsd: number; monthlyUsd: number };
  runsPerMonth: number;
  // Reachable inline steps in forward topological order; attachments are represented by their host.
  oneRun: string[];
  scope: 'international' | 'global';
  // Scenario amounts are USD contributions per run. Upper selects a complete route unless a resource diagnostic says otherwise.
  lines: Array<{
    id: string; label: string; kind: 'model' | 'tool' | 'guardrails' | 'platform';
    unit: string; typical: number; upper: number; source: string;
  }>;
  unpriced: Array<{ id: string; label: string; unit: string; why: string }>;
  fixed: Array<{ id: string; label: string; unit: string; monthlyUsd: number | null; source: string }>;
  assumptions: Array<{ key: string; text: string }>;
  coverage: string;
  latency: { modelStepsOnLongestPath: number; humanWaits: string[] };
}

type Scenario = 'typical' | 'upper';
type Counts = Map<string, number>;
type Line = WorkflowEstimate['lines'][number];
const NOTES = 'research/ai-workflows/verify/NOTES.md';
const FEES = {
  cloudflow: { usd: 0.25 / 10_000, unit: 'transition', source: `${NOTES} Adjudicate-3: Approval steps (reference)` },
  eventbridge: { usd: 0.82 / 1_000_000, unit: 'event', source: `${NOTES} Adjudicate-4: EventBridge` },
  'direct-mail': { usd: 0.29 / 1_000, unit: 'message', source: `${NOTES} Batch 6: Messaging` },
  chatapp: { usd: 0.005, unit: 'message', source: `${NOTES} Adjudicate-4: Chat App Message Service` },
  guardrails: { usd: 6 / 10_000, unit: 'detection call', source: `${NOTES} Batch 3; Adjudicate-1: AI Guardrails` },
  agentcore: { usd: 0.60, unit: 'control-plane hour', source: `${NOTES} Batch 6: AgentCore` },
} as const;
const TOKENS: Record<string, { input: number; output: number; prefix: number }> = {
  classify: { input: 700, output: 40, prefix: 400 },
  extract: { input: 1_000, output: 150, prefix: 400 },
  retrieve: { input: 50, output: 0, prefix: 0 },
  rerank: { input: 8_050, output: 0, prefix: 0 },
  generate: { input: 2_800, output: 250, prefix: 800 },
  summarise: { input: 3_000, output: 200, prefix: 0 },
  plan: { input: 2_000, output: 400, prefix: 0 },
};
const valid = (n: number | undefined): n is number => n !== undefined && Number.isFinite(n) && n >= 0;
const sorted = <T extends { id: string }>(xs: T[]): T[] => xs.sort((a, b) => a.id.localeCompare(b.id, 'en'));
const add = (counts: Counts, id: string, n: number): void => { counts.set(id, (counts.get(id) ?? 0) + n); };

const LIMITS = { requests: 50, tokens: 1_000_000, items: 10_000, iterations: 100, volume: 1_000_000_000, calls: 100 };
const RESOURCE_LIMIT = 'Workflow estimate decision-diagram budget exceeded';

// Reduced multiway decision diagrams share independent choices and joins, never execution frontiers.
function diagrams(probabilities: number[][]) {
  type Entry = { variable: number; children: number[]; value: number };
  const entries: Entry[] = [];
  const unique = new Map<string, number>();
  const memo = new Map<string, number>();
  let operations = 0;
  const make = (variable: number, children: number[], value = 0): number => {
    if (children.length && children.every((id) => id === children[0])) return children[0];
    const key = children.length ? `${variable}:${children.join(',')}` : `v:${value}`;
    const old = unique.get(key);
    if (old !== undefined) return old;
    if (entries.length >= 8192) throw new Error(RESOURCE_LIMIT);
    const id = entries.length;
    entries.push({ variable, children, value });
    unique.set(key, id);
    return id;
  };
  const constant = (value: number): number => make(Infinity, [], value);
  const apply = (op: 'or' | 'and' | 'add' | 'multiply', a: number, b: number): number => {
    if (++operations > 131072) throw new Error(RESOURCE_LIMIT);
    const key = `${op}:${Math.min(a, b)}:${Math.max(a, b)}`;
    const old = memo.get(key);
    if (old !== undefined) return old;
    const x = entries[a], y = entries[b];
    const variable = Math.min(x.variable, y.variable);
    const value = op === 'or' ? Math.max(x.value, y.value) : op === 'and' ? Math.min(x.value, y.value)
      : op === 'add' ? x.value + y.value : x.value * y.value;
    const result = variable === Infinity ? constant(value) : make(variable, probabilities[variable].map((_, i) =>
      apply(op, x.variable === variable ? x.children[i] : a, y.variable === variable ? y.children[i] : b)));
    memo.set(key, result);
    return result;
  };
  const expectedMemo = new Map<number, number>();
  const expected = (id: number): number => {
    const old = expectedMemo.get(id);
    if (old !== undefined) return old;
    const e = entries[id];
    const value = e.children.length ? e.children.reduce((s, child, i) => s + probabilities[e.variable][i] * expected(child), 0) : e.value;
    expectedMemo.set(id, value);
    return value;
  };
  const bestMemo = new Map<number, number>();
  const best = (id: number): number => {
    const old = bestMemo.get(id);
    if (old !== undefined) return old;
    const e = entries[id];
    const value = e.children.length ? Math.max(...e.children.map(best)) : e.value;
    bestMemo.set(id, value);
    return value;
  };
  const assignment = (id: number): Map<number, number> => {
    const choices = new Map<number, number>();
    while (entries[id].children.length) {
      const e = entries[id];
      const i = e.children.findIndex((child) => best(child) === best(id));
      choices.set(e.variable, i);
      id = e.children[i];
    }
    return choices;
  };
  const evaluate = (id: number, choices: Map<number, number>): number => {
    while (entries[id].children.length) {
      const e = entries[id];
      id = e.children[choices.get(e.variable) ?? 0];
    }
    return entries[id].value;
  };
  const supportMemo = new Map<number, Set<number>>();
  const support = (id: number): Set<number> => {
    const old = supportMemo.get(id);
    if (old) return old;
    const e = entries[id];
    const variables = new Set<number>();
    if (e.children.length) {
      variables.add(e.variable);
      for (const child of e.children) for (const variable of support(child)) variables.add(variable);
    }
    supportMemo.set(id, variables);
    return variables;
  };
  return { constant, make, apply, expected, assignment, evaluate, support };
}

function routes(wf: WorkflowGraph) {
  const nodes = sorted(Object.values(wf.nodes));
  const inline = nodes.filter((n) => !n.on);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const edges = sorted(Object.values(wf.edges)).filter((e) => byId.has(e.from) && byId.has(e.to)
    && !byId.get(e.from)!.on && !byId.get(e.to)!.on);
  const humanEdit = (e: WorkflowEdge): boolean => e.outcome === 'edit'
    && byId.get(e.from)?.kind === 'human' && byId.get(e.from)?.task === 'approve';
  const forward = edges.filter((e) => e.kind !== 'loop' && !humanEdit(e));
  const reachable = (start: string, links: WorkflowEdge[], reverse = false): Set<string> => {
    const seen = new Set<string>();
    const todo = [start];
    while (todo.length) {
      const id = todo.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      for (const edge of links) if ((reverse ? edge.to : edge.from) === id) todo.push(reverse ? edge.from : edge.to);
    }
    return seen;
  };
  const retries = edges.filter((e) => e.kind === 'loop'
    || (humanEdit(e) && reachable(e.to, forward).has(e.from)));
  forward.push(...edges.filter((e) => humanEdit(e) && !retries.includes(e)));
  // Back links have their own bounded multiplier. The remaining graph must be a DAG, including on partial streamed input.
  const state = new Map<string, number>();
  const back = new Set<string>();
  const visit = (id: string): void => {
    state.set(id, 1);
    for (const e of forward.filter((e) => e.from === id)) {
      if (state.get(e.to) === 1) back.add(e.id);
      else if (!state.has(e.to)) visit(e.to);
    }
    state.set(id, 2);
  };
  for (const n of inline) if (!state.has(n.id)) visit(n.id);
  const dag = forward.filter((e) => !back.has(e.id));
  const roots = inline.filter((n) => n.kind === 'trigger');
  if (!roots.length && inline.length) {
    roots.push(...inline.filter((n) => !dag.some((e) => e.to === n.id)));

  }

  const active = new Set(roots.flatMap((n) => [...reachable(n.id, edges)]));
  const order: string[] = [];
  const pending = new Set(inline.filter((n) => active.has(n.id)).map((n) => n.id));
  while (pending.size) {
    const id = [...pending].find((id) => !dag.some((e) => e.to === id && pending.has(e.from)))!;
    pending.delete(id);
    order.push(id);
  }
  const included = new Set(active);
  for (let i = 0; i < nodes.length; i++) for (const n of nodes) if (n.on && included.has(n.on)) included.add(n.id);
  return { nodes, inline, byId, edges, dag, roots, active, order, included, retries, back, reachable };
}

/** Estimator drivers, in edge-id order. choices groups sibling share edges by source; shares range from 0 to 1.
 * Unspecified sibling shares divide the remaining probability; a complete set should sum to 1.
 * loops are extra passes per run (typical <= upper), from 0 to max, default max 3, capped at 100.
 * Cyclic human edits and fallback back-edges take loop counts, never shares. Forward edits are alternatives.
 * Parallel next links and unreachable/attached links take neither. Pure; uses the estimator's route analysis.
 */
export function workflowChoiceSets(wf: WorkflowGraph): {
  choices: Record<string, string[]>;
  shares: Record<string, { min: number; max: number }>;
  loops: Record<string, { min: number; max: number }>;
} {
  const r = routes(wf);
  const choices: Record<string, string[]> = {};
  const shares: Record<string, { min: number; max: number }> = {};
  const loops: Record<string, { min: number; max: number }> = {};
  for (const id of r.order) {
    const out = r.dag.filter(e => e.from === id);
    if (!exclusive(out)) continue;
    choices[id] = out.map(e => e.id);
    for (const e of out) shares[e.id] = { min: 0, max: 1 };
  }
  for (const e of r.edges) {
    if (r.active.has(e.from) && (r.retries.includes(e) || r.back.has(e.id))) {
      loops[e.id] = { min: 0, max: Math.floor(valid(e.max) ? Math.min(e.max, LIMITS.iterations) : 3) };
    }
  }
  return { choices, shares, loops };
}

function exclusive(out: WorkflowEdge[]): boolean {
  return out.length > 1 && out.some(e => e.kind === 'branch' || e.kind === 'escalate' || e.outcome);
}

export function estimateWorkflow(
  wf: WorkflowGraph, models: ModelTable, catalog: Catalog, settings: WorkflowEstimateSettings = {},
): WorkflowEstimate {
  const assumptions = new Map<string, string>();
  const assume = (key: string, text: string): void => { assumptions.set(key, text); };
  const number = (n: number | undefined, fallback: number, key: string, text: string, limit = LIMITS.tokens): number => {
    if (valid(n)) {
      if (n > limit) assume(`${key}:limit`, `${key}: capped at ${limit}.`);
      return Math.min(n, limit);
    }
    assume(key, text);
    return fallback;
  };
  const pair = (
    value: { typical?: number; upper?: number } | undefined, t: number, u: number, key: string, limit: number,
  ): [number, number] => {
    const typical = number(value?.typical, t, `${key}:typical`, `${key}: typical assumes ${t}.`, limit);
    const upper = number(value?.upper, u, `${key}:upper`, `${key}: upper assumes ${u}.`, limit);
    if (upper < typical) assume(`${key}:order`, `${key}: upper raised to typical so the upper scenario cannot be smaller.`);
    return [typical, Math.max(typical, upper)];
  };
  const runsPerMonth = number(settings.runsPerMonth, 10_000, 'runsPerMonth', 'Assume 10,000 trigger events per month.', LIMITS.volume);
  const finite = (value: number): number => {
    if (Number.isFinite(value) && value <= Number.MAX_SAFE_INTEGER) return Math.max(0, value);
    assume('arithmetic:limit', 'Amounts exceeding the safe numeric range are saturated at Number.MAX_SAFE_INTEGER USD.');
    return Number.MAX_SAFE_INTEGER;
  };
  const scope = settings.scope ?? 'international';
  if (!settings.scope) assume('scope', 'International pricing scope.');
  if (scope === 'global') assume('scope:global', 'Prices for International scope; Global is usually lower.');
  const { nodes, inline, byId, edges, dag, roots, active, order, included, retries, back, reachable } = routes(wf);
  if (!inline.some(n => n.kind === 'trigger') && inline.length) {
    assume('roots', 'No trigger: estimate one pass from each source step in the partial graph.');
  }
  if (roots.length > 1) assume('triggers', 'One run is one trigger event; trigger alternatives have equal typical shares, upper uses the costliest.');
  const loops: Array<{ edge: WorkflowEdge; members: Set<string>; passes: [number, number] }> = [];
  const repeatItems = new Map<string, [number, number]>();
  for (const group of sorted(Object.values(wf.groups))) {
    if (!nodes.some((n) => included.has(n.id) && n.repeat === group.id)) continue;
    const items = pair(settings.items?.[group.id], 3, 10, `items:${group.id}`, LIMITS.items);
    repeatItems.set(group.id, items);
  }
  for (const e of edges.filter((e) => retries.includes(e) || back.has(e.id))) {
    if (!active.has(e.from)) continue;
    // Stop at the retry's source: its forward exit is taken once, outside the excursion.
    const members = reachable(e.to, dag.filter((link) => link.from !== e.from));
    const max = Math.floor(number(e.max, 3, `loop:${e.id}:max`, `${e.id}: assume at most 3 extra passes.`, LIMITS.iterations));
    if (!valid(e.max)) assume(`loop:${e.id}:max`, `${e.id}: unbounded retry/edit assumes at most 3 extra passes.`);
    const passes = pair(settings.loops?.[e.id], Math.min(1, max), max, `loops:${e.id}`, max);
    assume(`loop:${e.id}:meaning`, `${e.id}: extra passes use this link's per-run budget, shared across overlapping cycles.`);
    loops.push({ edge: e, members, passes });
  }
  const lines: Line[] = [];
  const unpriced: WorkflowEstimate['unpriced'] = [];
  const fixed = new Map<string, WorkflowEstimate['fixed'][number]>();
  const owners = new Map<string, string>();
  const missing = (id: string, label: string, unit: string, why: string): void => { unpriced.push({ id, label, unit, why }); };
  const line = (n: WorkflowNode, suffix: string, kind: Line['kind'], unit: string, typical: number, upper: number, source: string): void => {
    const id = `${n.id}:${suffix}`;
    lines.push({ id, label: n.label, kind, unit, typical: finite(typical), upper: finite(upper), source });
    owners.set(id, n.id);
  };
  const requests = new Map<string, [number, number]>();
  for (const n of nodes.filter((n) => included.has(n.id) && n.kind === 'agent')) {
    const turns = Math.max(1, Math.ceil(number(n.turns, 10, `agent:${n.id}:turns`,
      `${n.label}: assume a maximum of 10 requests.`, LIMITS.requests)));
    const p = pair(settings.agents?.[n.id], Math.ceil(turns / 2), turns, `agent:${n.id}:requests`, turns);
    requests.set(n.id, [Math.max(1, Math.ceil(p[0])), Math.max(1, Math.ceil(p[1]))]);
  }
  for (const n of nodes.filter((n) => included.has(n.id))) {
    if (n.kind === 'human') missing(`${n.id}:human`, n.label, 'reviewer hour', 'Human review time is not priced.');
    if (n.kind !== 'human' && (n.ai || n.kind === 'ai' || n.kind === 'agent')) {
      const model = n.ai ? models.model(n.ai) : undefined;
      const opts = settings.steps?.[n.id] ?? {};
      const thinking = opts.thinking ?? false;
      if (opts.thinking === undefined) assume(`${n.id}:thinking`, `${n.label}: thinking off.`);
      if (opts.offline === undefined) assume(`${n.id}:offline`, `${n.label}: online requests, without batch.`);
      const deferred = ['see', 'transcribe', 'speak', 'create'].includes(n.task ?? '') || model?.price?.unit !== 'mtok';
      if (!model?.price || deferred) {
        missing(`${n.id}:model`, n.label, model?.price?.unit ?? 'model usage',
          !model ? 'Model is missing from the price table.' : !model.price ? 'No confirmed model price.'
            : 'Image, video and voice quantities are not estimated in this release.');
      } else {
        let defaults = TOKENS[n.task ?? ''];
        if (!defaults) {
          defaults = TOKENS.generate;
          if (n.kind !== 'agent') assume(`${n.id}:task`, `${n.label}: no section 9 token row for ${n.task ?? 'unspecified task'}; use the generate sizes.`);
        }
        const agent = n.kind === 'agent';
        const input = number(opts.inTokens, agent ? 2_000 : defaults.input, `${n.id}:input`,
          `${n.label}: ${agent ? 'base prompt B = 2000' : `${defaults.input} input tokens`} (PLAN section 9).`);
        const output = number(opts.outTokens, agent ? 250 : defaults.output, `${n.id}:output`,
          `${n.label}: ${agent ? 'final answer a = 250' : `${defaults.output} output tokens`} (PLAN section 9).`);
        const tools = nodes.filter((x) => x.on === n.id && x.kind === 'tool').length;
        const schemas = agent ? tools * 150 : 0;
        const prefix = Math.min(input + schemas, agent ? input + schemas : defaults.prefix);
        assume(`${n.id}:prefix`, `${n.label}: static prefix ${prefix} tokens; dynamic content is not cached.`);
        const r = agent ? number(settings.agents?.[n.id]?.resultTokens, 800, `${n.id}:results`, `${n.label}: tool result r = 800 tokens.`) : 0;
        if (agent) assume(`${n.id}:history`, `${n.label}: full history; S = 150 per attached tool, c = 150; N includes the final answer.`);
        const outputFactor = thinking && !valid(opts.outTokens) ? 3 : 1;
        if (outputFactor === 3) assume(`${n.id}:thinking-output`, `${n.label}: thinking multiplies default output tokens by 3.`);
        const batch = opts.offline === true && model.batch === true;
        if (batch) assume(`${n.id}:batch`, `${n.label}: batch is 50% of list prices; cache does not stack (NOTES Batch 6).`);
        else if (opts.offline) assume(`${n.id}:batch-unavailable`, `${n.label}: no batch discount; model batch support is not confirmed true.`);
        const cost = (scenario: Scenario): number | null => {
          const count = requests.get(n.id)?.[scenario === 'typical' ? 0 : 1] ?? 1;
          let total = 0;
          for (let i = 1; i <= count; i++) {
            const inTokens = input + schemas + (agent ? (i - 1) * (150 + r) : 0);
            const outTokens = (agent && i < count ? 150 : output) * outputFactor;
            const tier = [...model.price!.tiers].sort((a, b) => (a.upTo ?? Infinity) - (b.upTo ?? Infinity))
              .find((t) => t.upTo === undefined || inTokens <= t.upTo);
            const outRate = thinking ? tier?.thinkingOut ?? tier?.out : tier?.out;
            if (!tier || (inTokens > 0 && !valid(tier.in)) || (outTokens > 0 && !valid(outRate))) return null;
            let price = inTokens * (tier.in ?? 0) + outTokens * (outRate ?? 0);
            if (batch) price *= 0.5;
            else if (prefix >= 1_024 && valid(tier.cacheHit)) {
              assume(`${n.id}:cache`, `${n.label}: implicit prefix cache hits 50% typical, 0% upper.`);
              if (scenario === 'typical') price -= prefix * 0.5 * ((tier.in ?? 0) - tier.cacheHit);
            }
            total = finite(total + price / 1_000_000);
          }
          return total;
        };
        const typical = cost('typical');
        const upper = cost('upper');
        if (typical === null || upper === null) missing(`${n.id}:model`, n.label, 'mtok', 'No firm rate for the request tier or token direction.');
        else line(n, 'model', 'model', 'mtok', typical, upper, model.source);
      }
    }
    if (n.kind !== 'human' && n.tool) {
      const tool = models.tool(n.tool);
      if (!tool || (!tool.fee && !tool.freeUntilNotice)) {
        missing(`${n.id}:tool`, n.label, 'call', tool?.note ?? 'No confirmed tool fee.');
      } else {
        let calls: [number, number] = [1, 1];
        const host = n.on ? byId.get(n.on) : undefined;
        if (n.tool === 'web_search' && host?.kind === 'agent') {
          const searches = number(settings.agents?.[host.id]?.searchesPerRequest, 1, `${host.id}:searches`,
            `${host.label}: one web search per model request, including the final request.`, LIMITS.calls);
          const turns = requests.get(host.id)!;
          calls = [turns[0] * searches, turns[1] * searches];
        } else assume(`${n.id}:calls`, `${n.label}: one tool invocation per host/step pass.`);
        const pages = tool.fee?.unit === 'page' ? 5 : 1;
        if (pages === 5) assume(`${n.id}:pages`, `${n.label}: 5 PDF pages per run.`);
        const rate = tool.freeUntilNotice ? 0 : tool.fee!.usd / tool.fee!.per;
        if (tool.freeUntilNotice) assume(`${n.id}:free`, `${tool.name}: free for now, until further notice; model tokens remain billable.`);
        line(n, 'tool', 'tool', tool.fee?.unit ?? 'call', calls[0] * pages * rate, calls[1] * pages * rate, tool.source);
      }
    }
    if (n.kind === 'guard' && (!n.product || n.product === 'ai-guardrails')) {
      if (!n.product) assume(`${n.id}:guard-product`, `${n.label}: guard without a product assumes AI Guardrails.`);
      const types = number(settings.guardTypes?.[n.id], 2, `${n.id}:guard-types`,
        `${n.label}: 2 detection types (injection and compliance).`, LIMITS.calls);
      line(n, 'guardrails', 'guardrails', FEES.guardrails.unit, types * FEES.guardrails.usd, types * FEES.guardrails.usd, FEES.guardrails.source);
    }
    const platforms: Array<keyof typeof FEES> = [];
    if (n.runs === 'cloudflow') {
      platforms.push('cloudflow');
      assume('cloudflow:reference', 'CloudFlow uses the previous-version reference rate; no free quota is deducted.');
    }
    if (n.kind === 'trigger' && n.product === 'eventbridge') {
      platforms.push('eventbridge');
      assume(`${n.id}:event`, `${n.label}: one custom-bus event of at most 64 KB; delivery and transfer excluded.`);
    }
    if (n.kind !== 'human' && n.effect === 'send' && n.product === 'direct-mail') platforms.push('direct-mail');
    if (n.kind !== 'human' && ['reply', 'send'].includes(n.effect ?? '') && n.product === 'chatapp') {
      platforms.push('chatapp');
      assume('chatapp:channel', 'Assume the $0.005 Chat App platform fee; channel-specific fees are excluded.');
    }
    for (const product of platforms) {
      const fee = FEES[product];
      line(n, product, 'platform', fee.unit, fee.usd, fee.usd, fee.source);
    }
    for (const product of new Set([n.product, n.runs].filter((x): x is string => !!x))) {
      const label = catalog.byId.get(product)?.name ?? product;
      if (['fc', 'agentrun', 'agentcore', 'agent-sandbox', 'ecs', 'acs', 'ack'].includes(product)) {
        const unit = product === 'agentcore' ? 'compute CU' : ['fc', 'agentrun'].includes(product) ? 'CU-second' : 'compute second';
        missing(`${n.id}:${product}:compute`, `${n.label}: ${label}`, unit, 'Compute quantity requires a measured duration and resource size.');
      }
      if (['tablestore', 'oss', 'milvus'].includes(product)) {
        missing(`${n.id}:${product}:storage`, `${n.label}: ${label}`, 'GB-month / capacity',
          'Storage quantity and firm International capacity rates required.');
      }
      if (['agentcore', 'api-gateway', 'ai-gateway', 'dashvector'].includes(product)) {
        const agentcore = product === 'agentcore';
        if (agentcore) assume('agentcore:fixed', 'Assume one dedicated AgentCore control plane for 730 hours/month; separate from usage.');
        fixed.set(product, {
          id: product, label, unit: agentcore ? FEES.agentcore.unit : 'instance-month',
          monthlyUsd: agentcore ? FEES.agentcore.usd * 730 : null,
          source: agentcore ? FEES.agentcore.source : `${NOTES} Batch 6; Adjudicate-3: instance sizing required`,
        });
      }
    }
    if (n.kind === 'knowledge') missing(`${n.id}:indexing`, `${n.label}: indexing and ingestion`, 'document tokens',
      'Document count, size and re-indexing frequency are unknown; only query usage is priced.');
  }
  const children = (id: string): WorkflowNode[] => nodes.filter((n) => n.on === id);
  const nodeCounts = (id: string, scenario: Scenario, seen = new Set<string>(), groups = new Set<string>()): Counts => {
    if (seen.has(id)) return new Map();
    seen.add(id);
    const counts: Counts = new Map();
    const n = byId.get(id)!;
    const index = scenario === 'typical' ? 0 : 1;
    let multiplier = 1;
    const inherited = new Set(groups);
    if (n.repeat && !groups.has(n.repeat)) {
      multiplier *= repeatItems.get(n.repeat)?.[index] ?? 1;
      inherited.add(n.repeat);
    }
    counts.set(id, multiplier);
    for (const child of children(id)) {
      if (child.kind === 'agent') assume(`${child.id}:attachment`, `${child.label}: one sub-agent invocation per host pass.`);
      for (const [key, value] of nodeCounts(child.id, scenario, seen, inherited)) add(counts, key, value * multiplier);
    }
    return counts;
  };
  const weights = (out: WorkflowEdge[]): number[] => {
    const supplied = out.map((e) => settings.shares?.[e.id]);
    const good = supplied.map((n) => valid(n) && n <= 1 ? n : undefined);
    const sum = good.reduce<number>((s, n) => s + (n ?? 0), 0);
    const absent = good.filter((n) => n === undefined).length;
    if (absent) assume(`shares:${out[0].from}`, `${out[0].from}: unspecified route shares split the remaining probability equally.`);
    const raw = good.map((n) => n ?? Math.max(0, 1 - sum) / absent);
    const total = raw.reduce((a, b) => a + b, 0);
    if (Math.abs(total - 1) > 1e-10) assume(`shares:${out[0].from}:normalise`, `${out[0].from}: route shares normalised; all-zero shares use equal split.`);
    return raw.map((n) => total ? n / total : 1 / out.length);
  };
  // Each loop contributes one bounded excursion; no other loop can replenish its budget.
  const usage = (scenario: Scenario): Counts => {
    const index = scenario === 'typical' ? 0 : 1;
    const probabilities: number[][] = [];
    const choices = new Map<string, number>();
    if (roots.length > 1) probabilities.push(roots.map(() => 1 / roots.length));
    for (const id of order) {
      const out = dag.filter((e) => e.from === id);
      if (exclusive(out)) {
        choices.set(id, probabilities.length);
        probabilities.push(weights(out));
      }
    }
    const d = diagrams(probabilities);
    const zero = d.constant(0), one = d.constant(1);
    const selector = (variable: number, choice: number): number =>
      d.make(variable, probabilities[variable].map((_, i) => i === choice ? one : zero));
    const gates = new Map<string, number>();
    const fallback = (): Counts => {
      const counts: Counts = new Map();
      for (const id of order) {
        const passes = 1 + loops.filter((loop) => loop.members.has(id)).reduce((sum, loop) => sum + loop.passes[index], 0);
        for (const [key, n] of nodeCounts(id, scenario)) add(counts, key, n * passes);
      }
      return counts;
    };
    if (assumptions.has('resources')) return fallback();
    try {
      for (const id of order) dag.filter((e) => e.from === id).forEach((e, i) => {
        gates.set(e.id, choices.has(id) ? selector(choices.get(id)!, i) : one);
      });
      const propagate = (seeds: Map<string, number>, members = active, stop = ''): Map<string, number> => {
        const result = new Map(seeds);
        for (const id of order) for (const e of dag.filter((e) => e.from === id && id !== stop && members.has(e.to))) {
          const incoming = d.apply('and', result.get(id) ?? zero, gates.get(e.id)!);
          result.set(e.to, d.apply('or', result.get(e.to) ?? zero, incoming));
        }
        return result;
      };
      const seeds = new Map(roots.map((n, i) => [n.id, roots.length > 1 ? selector(0, i) : one]));
      const base = propagate(seeds);
      let reached = base;
      // Boolean reachability closes in at most V rounds, even when retries introduce new steps.
      for (let round = 0; round < inline.length; round++) {
        const next = new Map(reached);
        for (const loop of loops) if (loop.passes[index] > 0) {
          const e = loop.edge;
          next.set(e.to, d.apply('or', next.get(e.to) ?? zero, reached.get(e.from) ?? zero));
        }
        const updated = propagate(next);
        if (order.every((id) => (updated.get(id) ?? zero) === (reached.get(id) ?? zero))) break;
        reached = updated;
      }
      const visits = new Map(base);
      for (const loop of loops) {
        const excursion = propagate(new Map([[loop.edge.to, reached.get(loop.edge.from) ?? zero]]), loop.members, loop.edge.from);
        for (const id of loop.members) {
          const extra = d.apply('multiply', excursion.get(id) ?? zero, d.constant(loop.passes[index]));
          visits.set(id, d.apply('add', visits.get(id) ?? zero, extra));
        }
      }
      const counts = new Map<string, number>();
      for (const id of order) for (const [key, count] of nodeCounts(id, scenario)) {
        const value = d.apply('multiply', visits.get(id) ?? zero, d.constant(count));
        counts.set(key, d.apply('add', counts.get(key) ?? zero, value));
      }
      if (scenario === 'typical') return new Map([...counts].map(([id, value]) => [id, d.expected(value)]));
      // Maximise independent cost factors separately, even when their prices are all different.
      const factors: Array<{ value: number; variables: Set<number> }> = [];
      for (const l of lines) {
        const value = d.apply('multiply', counts.get(owners.get(l.id)!) ?? zero, d.constant(l.upper));
        factors.push({ value, variables: new Set(d.support(value)) });
      }
      const assignment = new Map<number, number>();
      while (factors.length) {
        const component = factors.shift()!;
        for (let i = 0; i < factors.length;) {
          const factor = factors[i];
          if ([...factor.variables].some((v) => component.variables.has(v))) {
            component.value = d.apply('add', component.value, factor.value);
            for (const v of factor.variables) component.variables.add(v);
            factors.splice(i, 1);
            i = 0;
          } else i++;
        }
        for (const [variable, choice] of d.assignment(component.value)) assignment.set(variable, choice);
      }
      return new Map([...counts].map(([id, value]) => [id, d.evaluate(value, assignment)]));
    } catch (error) {
      if (!(error instanceof Error) || error.message !== RESOURCE_LIMIT) throw error;
      assume('resources', 'Exact evaluation limited to 8192 diagram nodes and 131072 operations per scenario. '
        + 'Budget exceeded: affected scenario uses a conservative sum of all reachable steps and per-link retry budgets, not a selected route.');
      return fallback();
    }
  };
  const typicalCounts = usage('typical');
  const upperCounts = usage('upper');
  for (const l of lines) {
    l.typical = finite(l.typical * (typicalCounts.get(owners.get(l.id)!) ?? 0));
    l.upper = finite(l.upper * (upperCounts.get(owners.get(l.id)!) ?? 0));
  }
  const typical = lines.reduce((sum, l) => finite(sum + l.typical), 0);
  const upper = lines.reduce((sum, l) => finite(sum + l.upper), 0);
  const depth = new Map<string, number>();
  const modelDepth = (id: string, seen = new Set<string>()): number => {
    if (seen.has(id)) return 0;
    seen.add(id);
    const n = byId.get(id)!;
    const own = n.ai || n.kind === 'ai' || n.kind === 'agent' ? 1 : 0;
    return own + Math.max(0, ...children(id).map((child) => modelDepth(child.id, new Set(seen))));
  };
  let longest = 0;
  for (const id of order) {
    const n = byId.get(id)!;
    const previous = Math.max(0, ...dag.filter((e) => e.to === id).map((e) => depth.get(e.from) ?? 0));
    const current = n.kind === 'human' ? 0 : previous + modelDepth(id);
    depth.set(id, current);
    longest = Math.max(longest, current);
  }
  return {
    typical: { perRunUsd: typical, monthlyUsd: finite(typical * runsPerMonth) },
    upper: { perRunUsd: upper, monthlyUsd: finite(upper * runsPerMonth) },
    runsPerMonth, oneRun: order, scope, lines, unpriced, fixed: [...fixed.values()].sort((a, b) => a.id.localeCompare(b.id, 'en')),
    assumptions: [...assumptions].sort(([a], [b]) => a.localeCompare(b, 'en')).map(([key, text]) => ({ key, text })),
    coverage: 'Priced usage subtotal: model tokens, built-in tools, AI Guardrails, CloudFlow, EventBridge, Direct Mail and Chat App fees; '
      + 'excludes compute time, storage, indexing, channel fees, human review, voice/image/video usage and fixed monthly capacity listed separately.',
    latency: { modelStepsOnLongestPath: longest, humanWaits: nodes.filter((n) => active.has(n.id) && n.kind === 'human').map((n) => n.label) },
  };
}
