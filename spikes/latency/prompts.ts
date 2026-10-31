// Prompt material for the latency matrix.
// - PROBE_SYSTEM is the system prompt of research/probes/probe.mjs, extracted from that file at load time so it stays verbatim.
// - Padding is catalog-like text: the real rows and rules from research/seed-catalog.txt and research/offerings-need-map.txt,
//   then per-product detail rows from a seeded generator (varied English, never repeated filler words).
//   The generated detail rows are plausible but NOT verified facts; they exist only to reach a token size.
// - buildSystemPrompt() puts the nonce on the very first line, so a fresh nonce is a cold prefix and a reused nonce
//   reproduces the same bytes (the builder is deterministic for a given nonce and target).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '..', '..');
const RESEARCH = path.join(ROOT, 'research');

/**
 * Characters per qwen3.8 token for this material. Calibrated from usage.prompt_tokens on 2026-10-31 (smoke cell):
 * 43,112 chars = 11,315 tokens (3.81) and 86,371 chars = 22,350 tokens (3.86).
 */
export const CHARS_PER_TOKEN = 3.85;
export const estimateTokens = (s: string): number => Math.round(s.length / CHARS_PER_TOKEN);

// ---------- probe system prompt (verbatim from research/probes/probe.mjs) ----------

function extractProbeSystem(): { system: string; catalogRows: number } {
  const src = readFileSync(path.join(RESEARCH, 'probes', 'probe.mjs'), 'utf8').replace(/\r\n/g, '\n');
  const block = (start: string, end: string): string => {
    const i = src.indexOf(start);
    const j = src.indexOf(end, i + start.length);
    if (i < 0 || j < 0) throw new Error('probe.mjs layout changed: ' + start);
    return src.slice(i + start.length, j);
  };
  const catalog = [...block('const CATALOG = [', '\n];').matchAll(/\[\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)'\s*\]/g)]
    .map((m) => [m[1], m[2], m[3], m[4]].join(' | '));
  const rules = [...block('const RULES = [', '\n];').matchAll(/^\s*'(.*)',\s*$/gm)].map((m) => m[1]);
  const out: string[] = [];
  for (const raw of block('const SYSTEM_NDJSON = [', "].join('\\n');").split('\n')) {
    const t = raw.trim();
    if (!t) continue;
    if (t === '...RULES,') out.push(...rules);
    else if (t === 'CATALOG_TEXT,') out.push(catalog.join('\n'));
    else {
      const m = t.match(/^'(.*)',?$/);
      if (!m) throw new Error('probe.mjs SYSTEM_NDJSON line not understood: ' + t);
      out.push(m[1]);
    }
  }
  if (catalog.length !== 43 || rules.length !== 4) throw new Error(`probe.mjs extraction: ${catalog.length} catalog rows, ${rules.length} rules`);
  return { system: out.join('\n'), catalogRows: catalog.length };
}

const probe = extractProbeSystem();
export const PROBE_SYSTEM = probe.system;

const streams = JSON.parse(readFileSync(path.join(RESEARCH, 'probes', 'streams.json'), 'utf8')) as { ask: string };
/** The e-commerce ask recorded in research/probes/streams.json. */
export const ECOMMERCE_ASK = streams.ask;

// ---------- real catalog material from the research files ----------

interface SeedRow { category: string; name: string; slug: string; purpose: string; notes: string }

function readSeed(): { rows: SeedRow[]; sections: Record<string, string[]> } {
  const lines = readFileSync(path.join(RESEARCH, 'seed-catalog.txt'), 'utf8').split(/\r?\n/);
  const sections: Record<string, string[]> = {};
  let cur = '';
  for (const ln of lines) {
    const h = ln.match(/^## ([A-G])\./);
    if (h) { cur = h[1]; sections[cur] = []; continue; }
    if (cur && ln.trim()) sections[cur].push(ln);
  }
  const rows: SeedRow[] = [];
  for (const ln of sections.A ?? []) {
    const parts = ln.split(' | ');
    if (parts.length < 5 || ln.startsWith('Format:')) continue;
    const [category, name, slug, purpose, ...notes] = parts;
    rows.push({ category, name, slug, purpose, notes: notes.join(' | ') });
  }
  return { rows, sections };
}

const seed = readSeed();
export const SEED_ROWS = seed.rows;
const OFFERING_ROWS = readFileSync(path.join(RESEARCH, 'offerings-need-map.txt'), 'utf8')
  .split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#') && l.includes(' | '));

// ---------- seeded generator for product detail rows ----------

function mulberry32(a: number): () => number {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
type Rng = () => number;
const pick = <T>(r: Rng, a: readonly T[]): T => a[Math.floor(r() * a.length)];
const pickN = <T>(r: Rng, a: readonly T[], n: number): T[] => {
  const c = [...a];
  const out: T[] = [];
  while (out.length < n && c.length) out.push(c.splice(Math.floor(r() * c.length), 1)[0]);
  return out;
};
const int = (r: Rng, lo: number, hi: number): number => lo + Math.floor(r() * (hi - lo + 1));

const REGIONS = ['ap-southeast-1 Singapore', 'ap-southeast-3 Kuala Lumpur', 'ap-southeast-5 Jakarta', 'ap-southeast-6 Manila', 'ap-southeast-7 Bangkok', 'ap-southeast-8 Johor', 'ap-northeast-1 Tokyo', 'ap-northeast-2 Seoul', 'cn-hongkong Hong Kong', 'us-east-1 Virginia', 'us-west-1 Silicon Valley', 'eu-central-1 Frankfurt', 'eu-west-1 London', 'me-east-1 Dubai', 'na-south-1 Mexico'];
const UNIT: Record<string, [string, string]> = {
  Computing: ['instance', 'vCPU-hour'], Container: ['node', 'pod vCPU-hour'], Storage: ['bucket', 'GB-month'], Database: ['instance', 'GB-month of storage'],
  Networking: ['endpoint', 'GB of traffic'], Security: ['protected asset', 'protected domain-month'], Analytics: ['workspace', 'compute unit hour'],
  'AI & Machine Learning': ['endpoint', 'million tokens'], Middleware: ['instance', 'million messages'], 'Developer Services': ['project', 'build minute'],
};
const unitFor = (cat: string): [string, string] => UNIT[Object.keys(UNIT).find((k) => cat.startsWith(k.split(' ')[0])) ?? ''] ?? ['resource', 'usage unit'];
const METRICS = ['CPU utilisation', 'p99 latency', 'active connections', 'replication lag', 'queue depth', '5xx error rate', 'memory usage', 'disk IOPS', 'throttled requests', 'cache hit ratio', 'consumer lag', 'cold-start count'];
const RELS = ['fronts', 'routes_to', 'caches', 'reads_writes', 'streams_to', 'triggers', 'monitors', 'authenticates', 'deploys', 'protects'];
const SOURCES = ['MySQL 5.7', 'PostgreSQL 13', 'Redis 6', 'Kafka 2.8', 'Elasticsearch 7', 'nginx on virtual machines', 'Jenkins', 'a self-built Kubernetes cluster', 'MongoDB 4.4', 'RabbitMQ', 'HDFS', 'on-premises file servers', 'an Oracle 19c data mart', 'a VMware vSphere estate'];
const TOOLS = ['Data Transmission Service (DTS)', 'Server Migration Center (SMC)', 'Data Online Migration', 'MirrorMaker 2', 'Velero backups', 'snapshot import', 'a logical dump and restore', 'dual writes during the transition', 'Cloud Migration Hub planning'];
const QUALIFIERS = ['', ' and the team prefers managed operations', ' for workloads that spike during campaigns', ' and data has to stay in one region', ' with a small operations team', ' and predictable monthly spend matters', ' alongside an existing Kubernetes platform', ' for customer-facing traffic in Southeast Asia'];

function detailRows(row: SeedRow, others: string[]): string[] {
  const r = mulberry32(hashSeed(row.slug));
  const [unit, meter] = unitFor(row.category);
  const units = unit + 's';
  const purpose = row.purpose.charAt(0).toLowerCase() + row.purpose.slice(1);
  const aspects: Array<[string, () => string]> = [
    ['billing', () => pick(r, [
      `pay-as-you-go by the second for running ${units}; a one-year subscription lowers the rate by about ${int(r, 15, 45)}%`,
      `subscription by month or year; pay-as-you-go suits trials shorter than ${int(r, 3, 30)} days`,
      `billed per ${meter} plus outbound internet traffic; traffic inside the same region is free`,
      `the free tier covers the first ${int(r, 1, 50) * 100} ${meter}s each month; usage above it is billed hourly`,
      `edition fee per month plus usage; moving up an edition keeps the existing configuration`,
      `resource plans prepay ${meter}s at a discount and are drawn down before pay-as-you-go billing starts`,
      `no charge for the service itself; you pay for the ${units}, storage and traffic it provisions`,
      `billed per ${meter} with a minimum of ${int(r, 1, 4)} ${units} per deployment`,
    ])],
    ['limits', () => pick(r, [
      `default quota of ${pick(r, [5, 10, 20, 50, 100, 200, 500])} ${units} per ${pick(r, ['region', 'account', 'VPC', 'resource group'])}; request more in Quota Center, usually approved in ${int(r, 1, 5)} business days`,
      `up to ${pick(r, [3, 8, 16, 32, 64])} ${units} per cluster and ${pick(r, [100, 300, 1000])} per account; soft limits can be raised, hard limits cannot`,
      `API rate limit of ${pick(r, [10, 20, 50, 100, 500])} calls per second per account; batch operations count once per item`,
      `maximum payload of ${pick(r, ['1 MB', '4 MB', '16 MB', '64 MB', '5 GB'])} per request; larger objects go to OSS with a reference`,
      `entry tier allows ${pick(r, [1000, 5000, 20000])} concurrent connections per ${unit}; higher tiers reach ${pick(r, [100000, 500000, 1000000])}`,
    ])],
    ['availability', () => pick(r, [
      'zone-redundant by default and keeps serving through the loss of one zone without manual action',
      `single-zone unless you add a standby; place the standby in a second zone for a ${pick(r, ['99.95', '99.99'])}% SLA`,
      `regional service with a ${pick(r, ['99.9', '99.95', '99.99'])}% monthly SLA; no zone selection is needed`,
      `primary and standby nodes in two zones with automatic failover in about ${int(r, 10, 60)} seconds`,
      'three replicas across zones; reads continue during a zone outage and writes resume after leader election',
      'global anycast service; a regional outage is absorbed by the nearest healthy point of presence',
      `spans up to ${int(r, 2, 4)} zones; spread capacity evenly so one zone loss removes at most a third of it`,
    ])],
    ['regions', () => `${pickN(r, REGIONS, int(r, 3, 8)).join(', ')}; check zone-level stock in the console before a large launch`],
    ['security', () => pick(r, [
      'data at rest is encrypted with KMS-managed keys, and customer-managed keys are optional',
      'access is governed by RAM policies down to resource level, and every API call is recorded in ActionTrail',
      'reachable privately through a PrivateLink endpoint, so no public address is required',
      'TLS 1.2 and 1.3 in transit; certificates can be managed centrally in Certificate Management Service',
      'IP allowlists and security groups restrict network access; turn on deletion protection for production',
      `audit logs can be shipped to SLS and kept for ${pick(r, [90, 180, 365])} days or longer for compliance reviews`,
    ])],
    ['operations', () => pick(r, [
      `metrics reach CloudMonitor within a minute; alarm on ${pick(r, METRICS)} and ${pick(r, METRICS)}`,
      `logs can be delivered to SLS; build a dashboard for ${pick(r, METRICS)} and error rates`,
      `traces integrate with ARMS; sample about ${pick(r, [1, 5, 10, 20])}% of requests on high-traffic paths`,
      'maintenance windows are configurable, and minor upgrades restart nodes one zone at a time',
      'Terraform resources and ROS templates exist, so keep the configuration in code rather than the console',
    ])],
    ['integration', () => {
      const [a, b, c] = pickN(r, others, 3);
      return `pairs with ${a} (${pick(r, RELS)}), ${b} (${pick(r, RELS)}) and ${c} (${pick(r, RELS)})`;
    }],
    ['use-when', () => `choose it for ${purpose.replace(/\.$/, '')}${pick(r, QUALIFIERS)}`],
    ['avoid-when', () => pick(r, [
      'avoid for a single low-traffic website, where Simple Application Server costs less',
      'not a fit for sub-millisecond reads across regions; keep latency-critical data local',
      `skip it for a nightly batch shorter than ${int(r, 5, 30)} minutes, where a serverless job costs less`,
      'avoid when another managed service already covers the need, to keep the bill of materials small',
      'not for mainland China end users without an ICP filing and a China-site account',
      'avoid if nobody can own patching and upgrades; pick the serverless option instead',
      `overkill below roughly ${int(r, 1, 20)}k daily active users; start smaller and migrate later`,
    ])],
    ['migration', () => pick(r, [
      `migrate from ${pick(r, SOURCES)} with ${pick(r, TOOLS)}; plan a cutover window of about ${int(r, 1, 8)} hours`,
      `move from ${pick(r, ['AWS', 'Azure', 'Google Cloud', 'an on-premises data centre'])} using ${pick(r, TOOLS)}, and validate checksums before switching DNS`,
    ])],
    ['sizing', () => pick(r, [
      `start with ${int(r, 2, 6)} ${units} for about ${int(r, 5, 80)}k daily active users and scale on ${pick(r, METRICS)}`,
      `a typical production baseline is ${int(r, 2, 8)} ${units} with ${pick(r, [2, 4, 8, 16])} vCPUs and ${pick(r, [8, 16, 32, 64])} GiB each`,
      `size storage for ${pick(r, [100, 500, 2000, 10000])} GB plus ${int(r, 3, 15)}% monthly growth; performance follows provisioned capacity`,
    ])],
  ];
  return pickN(r, aspects, int(r, 5, 8)).map(([aspect, f]) => `${row.slug} | ${aspect} | ${f()}`);
}

// ---------- assembled prompt ----------

const SLUGS = SEED_ROWS.map((s) => s.slug);
const DETAIL_ROWS = SEED_ROWS.flatMap((row) => detailRows(row, SLUGS.filter((s) => s !== row.slug)));

/** Lines after the probe prompt, in the order a real catalog prompt would carry them. */
const PADDING: string[] = [
  '',
  'EXTENDED CATALOG (category | name | id | purpose | notes):',
  ...SEED_ROWS.map((s) => [s.category, s.name, s.slug, s.purpose, s.notes].join(' | ')),
  '',
  'ALIASES AND RENAMES (old or alternate name -> id | date | evidence):',
  ...(seed.sections.B ?? []),
  '',
  'RETIRED OR DO-NOT-RECOMMEND (-> successor):',
  ...(seed.sections.C ?? []),
  '',
  'INTERNATIONAL REGIONS:',
  ...(seed.sections.D ?? []),
  '',
  'PLACEMENT AND ORDER RULES:',
  ...(seed.sections.E ?? []),
  '',
  'REFERENCE PATTERNS:',
  ...(seed.sections.G ?? []),
  '',
  'NEED MAP (need | product | why | url):',
  ...OFFERING_ROWS,
  '',
  'PRODUCT DETAILS (id | aspect | detail):',
  ...DETAIL_ROWS,
];

export interface BuiltPrompt { text: string; estTokens: number; paddingLines: number }

/**
 * System prompt of about `targetTokens` tokens: nonce line first, then the probe prompt, then padding lines until the
 * estimate reaches the target. Same nonce and target give the same bytes.
 */
export function buildSystemPrompt(targetTokens: number, nonce: string): BuiltPrompt {
  const head = `Session ${nonce}. Catalog snapshot 2026-10-31.\n` + PROBE_SYSTEM;
  const targetChars = targetTokens * CHARS_PER_TOKEN;
  const parts = [head];
  let len = head.length;
  let used = 0;
  for (const ln of PADDING) {
    if (len + ln.length + 1 > targetChars) break;
    parts.push(ln);
    len += ln.length + 1;
    used++;
  }
  if (len < targetChars * 0.97) throw new Error(`padding exhausted at ${estimateTokens(parts.join('\n'))} tokens`);
  const text = parts.join('\n');
  return { text, estTokens: estimateTokens(text), paddingLines: used };
}

export const materialStats = () => ({
  probeChars: PROBE_SYSTEM.length,
  probeCatalogRows: probe.catalogRows,
  seedRows: SEED_ROWS.length,
  offeringRows: OFFERING_ROWS.length,
  detailRows: DETAIL_ROWS.length,
  paddingChars: PADDING.join('\n').length,
});

// ---------- short user messages (each call in a cell gets a different one) ----------

export const SHORT_ASKS = [
  'Design a backend for a food delivery app in Jakarta with about 20k orders a day.',
  'oh I also want WAF',
  'Add a read replica for the main database.',
  'Make the web tier span two zones.',
  'We need a data warehouse for weekly sales reports.',
  'Drop the chatbot for now.',
  'Put the public API behind a gateway with rate limits.',
  'Add a CDN for product images.',
  'An AI agent my team can use for coding.',
  'Swap the VMs for Kubernetes.',
  'Add log collection and alerting.',
  'Customer data must stay in Singapore.',
  'Add a queue between checkout and fulfilment.',
  'Show me a serverless version of this.',
  'Add a bastion host for admin access.',
  'Use Redis for user sessions.',
  'Add full-text product search.',
  'Connect our on-prem data centre over VPN.',
  'We want blue/green deployments.',
  'Add DDoS protection for the flash sale.',
  'Store user uploads in object storage.',
  'Add a vector database for RAG over our manuals.',
  'Add an internal admin dashboard.',
  'Make it cheaper; we are a team of four.',
  'Add a disaster recovery copy in Tokyo.',
  'Add tracing across the microservices.',
  'Encrypt everything with our own keys.',
  'Add a real-time clickstream pipeline.',
  'Use PostgreSQL instead of MySQL.',
  'We need single sign-on for employees.',
  'Add a NAT gateway for outbound calls to partners.',
  'Ingest telemetry from 5,000 IoT devices.',
  'Build a video-on-demand service for 10k viewers.',
  'Send order emails and SMS.',
  'Move image resizing to functions.',
  'Add a staging environment.',
  'Serve our own fine-tuned model on GPUs.',
  'Replace the load balancer with an API gateway.',
  'Cache search results.',
  'Add a mobile backend for push notifications.',
  'Run nightly ETL from the orders database.',
  'Add a chatbot that answers from our help centre.',
  'We expect 10x traffic on Singles Day.',
  'Add container image scanning.',
  'Our analysts want to ask questions in plain English.',
  'Add a WebSocket service for live order tracking.',
  'Keep 90 days of audit logs.',
  'Add a second region for users in Europe.',
  'We need a cloud desktop for contractors.',
  'Remove the data warehouse.',
  'Put the admin portal on a private network only.',
  'Add a payment gateway integration.',
  'Back up the databases daily to another region.',
  'Add a recommendation engine for the storefront.',
  'Add a sandbox for our AI agents to run code.',
  'Can the app tier scale to zero at night?',
  'Add bot protection to the login page.',
  'Split the monolith into about ten services.',
  'Use managed Kafka for events.',
  'Add a status page and uptime checks.',
  'Add an LLM gateway with token limits.',
  'Host a static marketing site.',
  'We need a GraphQL API for the mobile app.',
  'Archive old orders to cheaper storage.',
];
