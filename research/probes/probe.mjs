// Live probe of Model Studio International for the feasibility study:
// latency, thinking behaviour, NDJSON op streaming, incremental edits, tool-call streaming, raw product knowledge.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const KEY = process.env.DASHSCOPE_API_KEY;
const BASE = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';
if (!KEY) { console.error('DASHSCOPE_API_KEY missing'); process.exit(1); }

const CATALOG = [
  ['users', 'End users / Internet', 'external', 'Pseudo-node: people or clients on the internet'],
  ['third_party', 'Third-party service', 'external', 'Pseudo-node: payment gateway, SaaS, etc.'],
  ['dns', 'Alibaba Cloud DNS', 'edge', 'Authoritative DNS and global traffic management'],
  ['esa', 'ESA (Edge Security Acceleration)', 'edge', 'Global CDN + dynamic acceleration + edge security'],
  ['cdn', 'CDN', 'edge', 'Static content acceleration'],
  ['waf', 'Web Application Firewall (WAF)', 'edge', 'L7 protection against OWASP attacks and bots'],
  ['anti_ddos', 'Anti-DDoS Pro/Premium', 'edge', 'Volumetric DDoS mitigation'],
  ['alb', 'Application Load Balancer (ALB)', 'access', 'L7 load balancing'],
  ['nlb', 'Network Load Balancer (NLB)', 'access', 'L4 load balancing'],
  ['api_gateway', 'API Gateway', 'access', 'API management, auth, throttling'],
  ['ecs', 'Elastic Compute Service (ECS)', 'compute', 'Virtual machines'],
  ['auto_scaling', 'Auto Scaling', 'compute', 'Scale ECS fleets on demand'],
  ['ack', 'Container Service for Kubernetes (ACK)', 'compute', 'Managed Kubernetes'],
  ['sae', 'Serverless App Engine (SAE)', 'compute', 'Serverless containers and microservices'],
  ['fc', 'Function Compute', 'compute', 'Event-driven serverless functions'],
  ['polardb', 'PolarDB for MySQL', 'data', 'Cloud-native relational database'],
  ['rds', 'ApsaraDB RDS', 'data', 'Managed MySQL/PostgreSQL/SQL Server'],
  ['tair', 'Tair (Redis OSS-compatible)', 'data', 'In-memory cache and KV'],
  ['oss', 'Object Storage Service (OSS)', 'data', 'Object storage for files and images'],
  ['opensearch', 'OpenSearch', 'data', 'Managed search, incl. LLM-based conversational search'],
  ['elasticsearch', 'Alibaba Cloud Elasticsearch', 'data', 'Managed Elasticsearch, vector search'],
  ['analyticdb_pg', 'AnalyticDB for PostgreSQL', 'data', 'Data warehouse with vector search'],
  ['rocketmq', 'ApsaraMQ for RocketMQ', 'integration', 'Transactional messaging and queues'],
  ['kafka', 'ApsaraMQ for Kafka', 'integration', 'Event streaming'],
  ['eventbridge', 'EventBridge', 'integration', 'Event bus and routing'],
  ['model_studio', 'Alibaba Cloud Model Studio', 'ai', 'Qwen model APIs, agents and RAG apps'],
  ['pai_eas', 'PAI-EAS', 'ai', 'Self-hosted model serving'],
  ['maxcompute', 'MaxCompute', 'analytics', 'Serverless data warehouse'],
  ['dataworks', 'DataWorks', 'analytics', 'Data integration, development and governance'],
  ['flink', 'Realtime Compute for Apache Flink', 'analytics', 'Stream processing'],
  ['quick_bi', 'Quick BI', 'analytics', 'BI dashboards'],
  ['sls', 'Simple Log Service (SLS)', 'ops', 'Log collection, query and alerting'],
  ['cloudmonitor', 'CloudMonitor', 'ops', 'Resource monitoring and alerts'],
  ['arms', 'Application Real-Time Monitoring Service (ARMS)', 'ops', 'APM, tracing, Prometheus'],
  ['security_center', 'Security Center', 'security', 'Host and container threat protection'],
  ['cloud_firewall', 'Cloud Firewall', 'security', 'Network firewall at internet/VPC borders'],
  ['kms', 'Key Management Service (KMS)', 'security', 'Keys and secrets'],
  ['ram', 'Resource Access Management (RAM)', 'security', 'Identity and access control'],
  ['vpc', 'Virtual Private Cloud (VPC)', 'network', 'Isolated private network (drawn as a group)'],
  ['nat', 'NAT Gateway', 'network', 'Outbound internet for private resources'],
  ['eip', 'Elastic IP (EIP)', 'network', 'Public IP address'],
  ['cen', 'Cloud Enterprise Network (CEN)', 'network', 'Multi-region and hybrid connectivity'],
  ['qoder', 'Qoder', 'saas', 'Agentic coding platform (IDE + CLI) for development teams'],
];
const CATALOG_IDS = new Set(CATALOG.map((c) => c[0]));
const CATALOG_TEXT = CATALOG.map((c) => c.join(' | ')).join('\n');

const RULES = [
  '- Emit in drawing order, outside-in (users -> edge -> region -> VPC -> compute -> data -> ops/security), with a short "say" before each section, so the diagram builds progressively.',
  '- Declare a group before the nodes inside it, and nodes before the edges that use them.',
  '- IDs are short, stable kebab-case. Use ONLY product ids from the catalog; if something needed is missing, emit a "gap" instead of inventing a product.',
  '- For follow-up requests you get the CURRENT DIAGRAM. Emit ONLY the minimal ops that change it (add, remove, rewire). Never repeat unchanged elements. To rewire, remove the old edge and add new ones.',
];

const SYSTEM_NDJSON = [
  'You are a senior Alibaba Cloud solutions architect who draws architecture diagrams live while you talk.',
  'Output ONLY newline-delimited JSON: exactly one compact JSON object per line. No markdown, no code fences, no prose outside JSON.',
  'Op types:',
  '{"t":"say","text":"<one short sentence for the chat console>"}',
  '{"t":"group","id":"<id>","kind":"external|edge|region|vpc|zone|managed","label":"<label>","parent":"<group id or null>"}',
  '{"t":"node","id":"<id>","product":"<catalog id>","label":"<label>","group":"<group id>","why":"<max 20 words: why this component is here>"}',
  '{"t":"edge","id":"<id>","from":"<node id>","to":"<node id>","label":"<optional, max 3 words>"}',
  '{"t":"remove","id":"<node, edge or group id>"}',
  '{"t":"gap","need":"<what is needed>","note":"<why no catalog product fits>"}',
  '{"t":"done","summary":"<one sentence>"}',
  'Rules:',
  ...RULES,
  '',
  'CATALOG (id | name | tier | purpose):',
  CATALOG_TEXT,
].join('\n');

const SYSTEM_TOOLS = [
  'You are a senior Alibaba Cloud solutions architect who draws architecture diagrams live while you talk.',
  'Draw ONLY by calling the tools. Draw the complete diagram in a single response using many parallel tool calls.',
  'Rules:',
  ...RULES,
  '',
  'CATALOG (id | name | tier | purpose):',
  CATALOG_TEXT,
].join('\n');

const TOOLS = [
  { type: 'function', function: { name: 'say', description: 'One short narration sentence for the chat console', parameters: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } } },
  { type: 'function', function: { name: 'add_group', description: 'Add a container group (external, edge, region, vpc, zone, managed)', parameters: { type: 'object', properties: { id: { type: 'string' }, kind: { type: 'string', enum: ['external', 'edge', 'region', 'vpc', 'zone', 'managed'] }, label: { type: 'string' }, parent: { type: 'string', description: 'parent group id, empty for top level' } }, required: ['id', 'kind', 'label'] } } },
  { type: 'function', function: { name: 'add_node', description: 'Add a product node inside a group', parameters: { type: 'object', properties: { id: { type: 'string' }, product: { type: 'string', description: 'catalog id' }, label: { type: 'string' }, group: { type: 'string' }, why: { type: 'string', description: 'max 20 words' } }, required: ['id', 'product', 'label', 'group', 'why'] } } },
  { type: 'function', function: { name: 'add_edge', description: 'Connect two nodes', parameters: { type: 'object', properties: { id: { type: 'string' }, from: { type: 'string' }, to: { type: 'string' }, label: { type: 'string' } }, required: ['id', 'from', 'to'] } } },
];

const ASK_1 = 'We are launching a cross-border e-commerce site for Southeast Asia: about 50k daily active users, 10x traffic spikes during flash sales, product search, lots of product images, and we want an AI shopping-assistant chatbot. It must be highly available.';

async function run(label, body, timeoutMs = 300000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const t0 = performance.now();
  const r = { label, model: body.model, params: Object.keys(body).filter((k) => k !== 'messages' && k !== 'tools'), status: null, firstByteMs: null, firstReasoningMs: null, firstContentMs: null, firstToolMs: null, totalMs: null, usage: null, reasoningChars: 0, reasoning: '', content: '', lineTimes: [], toolCalls: [], finish: null, error: null };
  try {
    const res = await fetch(BASE + '/chat/completions', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, stream: true, stream_options: { include_usage: true } }),
    });
    r.status = res.status;
    if (!res.ok) { r.error = (await res.text()).slice(0, 600); return r; }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    const tools = new Map();
    let buf = '';
    let pending = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      if (r.firstByteMs === null) r.firstByteMs = Math.round(performance.now() - t0);
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (!data || data === '[DONE]') continue;
        let j;
        try { j = JSON.parse(data); } catch { continue; }
        if (j.usage) r.usage = j.usage;
        const ch = j.choices && j.choices[0];
        if (!ch) continue;
        if (ch.finish_reason) r.finish = ch.finish_reason;
        const d = ch.delta || {};
        const now = Math.round(performance.now() - t0);
        if (d.reasoning_content) {
          if (r.firstReasoningMs === null) r.firstReasoningMs = now;
          r.reasoningChars += d.reasoning_content.length;
          r.reasoning += d.reasoning_content;
        }
        if (d.content) {
          if (r.firstContentMs === null) r.firstContentMs = now;
          r.content += d.content;
          pending += d.content;
          let k;
          while ((k = pending.indexOf('\n')) >= 0) {
            const ln = pending.slice(0, k).trim();
            pending = pending.slice(k + 1);
            if (ln) r.lineTimes.push([now, ln]);
          }
        }
        if (d.tool_calls) {
          if (r.firstToolMs === null) r.firstToolMs = now;
          for (const tc of d.tool_calls) {
            const idx = tc.index ?? 0;
            if (!tools.has(idx)) tools.set(idx, { index: idx, id: null, name: '', args: '', firstMs: now, lastMs: now, chunks: 0 });
            const t = tools.get(idx);
            if (tc.id && !t.id) t.id = tc.id;
            if (tc.function?.name) t.name += tc.function.name;
            if (tc.function?.arguments) t.args += tc.function.arguments;
            t.lastMs = now;
            t.chunks++;
          }
        }
      }
    }
    if (pending.trim()) r.lineTimes.push([Math.round(performance.now() - t0), pending.trim()]);
    r.toolCalls = [...tools.values()];
  } catch (e) {
    r.error = String(e);
  } finally {
    clearTimeout(timer);
    r.totalMs = Math.round(performance.now() - t0);
  }
  return r;
}

function validate(lineTimes, prior) {
  const groups = new Set(prior?.groups || []);
  const nodes = new Set(prior?.nodes || []);
  const edges = new Set(prior?.edges || []);
  const counts = {};
  const problems = [];
  const ops = [];
  let badJson = 0;
  for (const [ms, ln] of lineTimes) {
    let o;
    try { o = JSON.parse(ln); } catch { badJson++; problems.push('bad json: ' + ln.slice(0, 90)); continue; }
    ops.push([ms, o]);
    counts[o.t] = (counts[o.t] || 0) + 1;
    if (o.t === 'group') {
      if (o.parent && !groups.has(o.parent)) problems.push('group parent missing: ' + o.id + ' -> ' + o.parent);
      groups.add(o.id);
    } else if (o.t === 'node') {
      if (!CATALOG_IDS.has(o.product)) problems.push('unknown product: ' + o.product);
      if (o.group && !groups.has(o.group)) problems.push('node group missing: ' + o.id + ' -> ' + o.group);
      nodes.add(o.id);
    } else if (o.t === 'edge') {
      const ok = (x) => nodes.has(x) || groups.has(x);
      if (!ok(o.from) || !ok(o.to)) problems.push('dangling edge: ' + o.from + ' -> ' + o.to);
      edges.add(o.id);
    } else if (o.t === 'remove') {
      if (!nodes.has(o.id) && !edges.has(o.id) && !groups.has(o.id)) problems.push('remove of unknown id: ' + o.id);
      nodes.delete(o.id); edges.delete(o.id); groups.delete(o.id);
    }
  }
  return { counts, badJson, problems, ops };
}

function stateFromOps(ops) {
  const groups = new Map(), nodes = new Map(), edges = new Map();
  for (const [, o] of ops) {
    if (o.t === 'group') groups.set(o.id, o);
    else if (o.t === 'node') nodes.set(o.id, o);
    else if (o.t === 'edge') edges.set(o.id, o);
    else if (o.t === 'remove') { groups.delete(o.id); nodes.delete(o.id); edges.delete(o.id); }
  }
  const strip = ({ t, ...rest }) => rest;
  return {
    groups: [...groups.values()].map(strip),
    nodes: [...nodes.values()].map(({ why, ...n }) => strip(n)),
    edges: [...edges.values()].map(strip),
  };
}

const fmt = (ms) => (ms == null ? '-' : (ms / 1000).toFixed(1) + 's');
const pct = (arr, p) => arr[Math.min(arr.length - 1, Math.floor((arr.length - 1) * p))];

function report(r, v) {
  const u = r.usage || {};
  const out = [];
  out.push(`== ${r.label}  model=${r.model}  params=[${r.params.join(',')}]  HTTP ${r.status}${r.error ? '  ERROR ' + r.error : ''}`);
  out.push(`   first byte ${fmt(r.firstByteMs)} | first reasoning ${fmt(r.firstReasoningMs)} | first content ${fmt(r.firstContentMs)} | first tool ${fmt(r.firstToolMs)} | total ${fmt(r.totalMs)} | finish=${r.finish}`);
  out.push(`   tokens: prompt ${u.prompt_tokens ?? '-'} (cached ${u.prompt_tokens_details?.cached_tokens ?? '-'}) | completion ${u.completion_tokens ?? '-'} (reasoning ${u.completion_tokens_details?.reasoning_tokens ?? '-'}) | reasoning chars ${r.reasoningChars}`);
  const firstOut = r.firstContentMs ?? r.firstToolMs;
  if (firstOut != null && u.completion_tokens) {
    const visible = u.completion_tokens - (u.completion_tokens_details?.reasoning_tokens || 0);
    out.push(`   visible-output rate ~${Math.round(visible / Math.max(0.001, (r.totalMs - firstOut) / 1000))} tok/s after first visible token`);
  }
  if (v) {
    const times = v.ops.map(([ms]) => ms);
    out.push(`   ops ${v.ops.length} ${JSON.stringify(v.counts)} | bad json ${v.badJson} | problems ${v.problems.length}`);
    if (times.length) out.push(`   op arrival: first ${fmt(times[0])}, 25% ${fmt(pct(times, 0.25))}, 50% ${fmt(pct(times, 0.5))}, 75% ${fmt(pct(times, 0.75))}, last ${fmt(times[times.length - 1])}`);
    for (const p of v.problems.slice(0, 12)) out.push('   ! ' + p);
  }
  if (r.toolCalls.length) {
    const names = {};
    let badArgs = 0;
    for (const t of r.toolCalls) { names[t.name] = (names[t.name] || 0) + 1; try { JSON.parse(t.args || '{}'); } catch { badArgs++; } }
    const firsts = r.toolCalls.map((t) => t.firstMs).sort((a, b) => a - b);
    const avgChunks = r.toolCalls.reduce((s, t) => s + t.chunks, 0) / r.toolCalls.length;
    out.push(`   tool calls ${r.toolCalls.length} ${JSON.stringify(names)} | bad args ${badArgs} | avg chunks/call ${avgChunks.toFixed(1)} | first call ${fmt(firsts[0])}, median ${fmt(pct(firsts, 0.5))}, last ${fmt(firsts[firsts.length - 1])}`);
    out.push(`   tool ids present: ${r.toolCalls.filter((t) => t.id).length}/${r.toolCalls.length}`);
  }
  return out.join('\n');
}

const BASE_MSGS = [{ role: 'system', content: SYSTEM_NDJSON }, { role: 'user', content: ASK_1 }];

const first = {
  A_max_default: { model: 'qwen3.8-max', messages: BASE_MSGS },
  F_max_nothink: { model: 'qwen3.8-max', enable_thinking: false, messages: BASE_MSGS },
  E_flash_default: { model: 'qwen3.8-flash', messages: BASE_MSGS },
  C_max_tools: { model: 'qwen3.8-max', parallel_tool_calls: true, tools: TOOLS, messages: [{ role: 'system', content: SYSTEM_TOOLS }, { role: 'user', content: ASK_1 }] },
  D1_raw_team_agent: {
    model: 'qwen3.8-max',
    messages: [
      { role: 'system', content: 'You are an Alibaba Cloud advisor. Recommend specific, currently available Alibaba Cloud or Alibaba products by their exact official names. Answer ONLY with NDJSON lines: {"product":"...","owner":"Alibaba Cloud|Alibaba Group|other","why":"<max 20 words>","url":"<official URL>"}. 3 to 6 lines.' },
      { role: 'user', content: 'I need some AI agent that I can use with my team.' },
    ],
  },
  D2_raw_names: {
    model: 'qwen3.8-max',
    messages: [
      { role: 'system', content: 'Answer ONLY with NDJSON lines {"q":<n>,"name":"<exact current official name on the Alibaba Cloud international site>","confidence":<0-1>}.' },
      { role: 'user', content: "What are the current official names of Alibaba Cloud's: 1) layer-7 load balancer, 2) managed Redis-compatible cache, 3) edge security + acceleration platform that superseded DCDN, 4) generative AI model platform (formerly Bailian), 5) agentic coding IDE, 6) serverless application engine for containers, 7) cloud-native relational database with compute/storage separation, 8) log service, 9) cloud desktop product, 10) cloud sandbox for AI agents." },
    ],
  },
};

const t0 = performance.now();
const names = Object.keys(first);
const results = await Promise.all(names.map((n) => run(n, first[n])));
const byName = Object.fromEntries(results.map((r) => [r.label, r]));
const validations = {};
for (const r of results) {
  if (r.label.startsWith('A_') || r.label.startsWith('F_') || r.label.startsWith('E_')) validations[r.label] = validate(r.lineTimes);
}

// Follow-up edit: "oh i also want waf" against the diagram from A (or F if A failed).
const baseRun = validations.A_max_default?.ops.length ? 'A_max_default' : 'F_max_nothink';
const state = stateFromOps(validations[baseRun]?.ops || []);
const prior = { groups: state.groups.map((g) => g.id), nodes: state.nodes.map((n) => n.id), edges: state.edges.map((e) => e.id) };
const followMsgs = [
  { role: 'system', content: SYSTEM_NDJSON },
  { role: 'user', content: ASK_1 },
  { role: 'assistant', content: '{"t":"done","summary":"Initial diagram drawn."}' },
  { role: 'user', content: 'CURRENT DIAGRAM:\n' + JSON.stringify(state) + '\n\noh i also want waf' },
];
const follow = await Promise.all([
  run('B_followup_waf_default', { model: 'qwen3.8-max', messages: followMsgs }),
  run('B2_followup_waf_nothink', { model: 'qwen3.8-max', enable_thinking: false, messages: followMsgs }),
]);
for (const r of follow) validations[r.label] = validate(r.lineTimes, prior);

const all = [...results, ...follow];
const lines = [];
for (const r of all) lines.push(report(r, validations[r.label]));
lines.push('');
lines.push(`== B base diagram from ${baseRun}: ${state.groups.length} groups, ${state.nodes.length} nodes, ${state.edges.length} edges`);
for (const r of follow) {
  lines.push(`-- ${r.label} ops:`);
  for (const [ms, ln] of r.lineTimes) lines.push(`   ${fmt(ms)}  ${ln}`);
}
for (const n of ['D1_raw_team_agent', 'D2_raw_names']) {
  lines.push(`-- ${n} output:`);
  for (const [, ln] of byName[n].lineTimes) lines.push('   ' + ln);
}
lines.push(`-- C tool-call sample (first 6):`);
for (const t of (byName.C_max_tools?.toolCalls || []).slice(0, 6)) lines.push(`   #${t.index} ${t.name} @${fmt(t.firstMs)} chunks=${t.chunks} ${t.args.slice(0, 140)}`);
lines.push(`-- A first 12 ops:`);
for (const [ms, ln] of (byName.A_max_default?.lineTimes || []).slice(0, 12)) lines.push(`   ${fmt(ms)}  ${ln.slice(0, 160)}`);
lines.push(`\nwall clock ${fmt(Math.round(performance.now() - t0))}`);

const text = lines.join('\n');
console.log(text);
writeFileSync(path.join(DIR, 'summary.txt'), text);
writeFileSync(path.join(DIR, 'results.json'), JSON.stringify({ results: all, state }, null, 1));
