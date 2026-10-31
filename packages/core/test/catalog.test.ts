// Catalog v0 checks: data integrity, placement rules, lifecycle and alias resolution, prompt rows. Run: node --test test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadCatalog, readCatalogFile } from '../src/catalog-node.ts';
import { LANE_ORDER, SCOPE_ORDER, catalogKeyConflicts, checkLifecycle, createCatalog, estimateTokens, isRecommendable, normalizeKey, placementOf } from '../src/catalog.ts';
import type { CatalogEntry } from '../src/types.ts';

const products = readCatalogFile('products.json');
const offerings = readCatalogFile('offerings.json');
const catalog = loadCatalog();
const all: CatalogEntry[] = [...products.entries, ...offerings.entries];
const get = (id: string): CatalogEntry => {
  const e = catalog.byId.get(id);
  assert.ok(e, `missing entry ${id}`);
  return e;
};
const words = (s: string): number => s.trim().split(/\s+/).filter(Boolean).length;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// Mirrors of the unions in src/types.ts (update both together).
const SCOPES = ['external', 'global', 'edge', 'region', 'vpc', 'vpc-edge', 'account', 'saas'];
const LANES = ['clients', 'onprem', 'thirdparty', 'dns', 'edge', 'ingress', 'compute', 'middleware', 'cache', 'database', 'search', 'filestore', 'boundary',
  'storage', 'ai', 'analytics', 'integration', 'ops', 'security', 'network', 'governance', 'saas'];
const ICONS = ['users', 'device', 'onprem', 'internet', 'dns', 'cdn', 'shield', 'firewall', 'loadbalancer', 'gateway', 'compute', 'container', 'serverless', 'database',
  'cache', 'storage', 'filestore', 'search', 'queue', 'stream', 'analytics', 'bi', 'ai', 'agent', 'network', 'vpn', 'monitor', 'logs', 'key', 'identity', 'audit',
  'devtools', 'desktop', 'media', 'saas', 'generic'];
const STATUSES = ['ga', 'preview', 'legacy', 'no-new-purchases', 'retired'];
const AVAILABILITY = ['intl', 'china-only', 'restricted', 'announced'];
const PURCHASES = ['saas-seat', 'subscription-plan', 'cloud-payg', 'open-source', 'contact-sales'];

test('both files carry version 2026-10-31 and an entries array', () => {
  for (const f of [products, offerings]) {
    assert.equal(f.version, '2026-10-31');
    assert.ok(Array.isArray(f.entries) && f.entries.length > 0);
  }
  assert.equal(catalog.version, '2026-10-31');
  assert.equal(catalog.entries.length, all.length);
});

test('ids are unique across both files and short kebab-case', () => {
  const seen = new Set<string>();
  for (const e of all) {
    assert.match(e.id, /^[a-z0-9]+(-[a-z0-9]+)*$/, `bad id ${e.id}`);
    assert.ok(e.id.length <= 32, `id too long: ${e.id}`);
    assert.ok(!seen.has(e.id), `duplicate id ${e.id}`);
    seen.add(e.id);
  }
});

test('products.json holds services and constructs; offerings.json holds offerings (about 35-40)', () => {
  for (const e of products.entries) assert.ok(e.kind === 'service' || e.kind === 'construct', `${e.id} kind ${e.kind}`);
  for (const e of offerings.entries) assert.equal(e.kind, 'offering', `${e.id} kind ${e.kind}`);
  assert.ok(offerings.entries.length >= 35 && offerings.entries.length <= 42, `offerings: ${offerings.entries.length}`);
  assert.ok(products.entries.length >= 176, `products: ${products.entries.length}`);
});

test('every pairsWith, alternatives, successor and attach.hosts id exists', () => {
  for (const e of all) {
    const refs: Array<[string, string]> = [
      ...(e.pairsWith ?? []).map((r): [string, string] => ['pairsWith', r]),
      ...(e.alternatives ?? []).map((r): [string, string] => ['alternatives', r]),
      ...(e.successor ? [['successor', e.successor] as [string, string]] : []),
      ...(e.attach?.hosts ?? []).map((r): [string, string] => ['attach.hosts', r]),
    ];
    for (const [field, r] of refs) {
      assert.ok(catalog.byId.has(r), `${e.id}.${field} -> unknown id ${r}`);
      assert.notEqual(r, e.id, `${e.id}.${field} points at itself`);
    }
    if (e.attach) {
      assert.ok(e.attach.as === 'badge' || e.attach.as === 'attachment', `${e.id} attach.as`);
      assert.ok(e.attach.hosts.length > 0, `${e.id} attach without hosts`);
    }
  }
});

test('every entry has scope, lane, icon, a purpose of at most 16 words and a verified date', () => {
  for (const e of all) {
    assert.ok(SCOPES.includes(e.scope), `${e.id} scope ${e.scope}`);
    assert.ok(LANES.includes(e.lane), `${e.id} lane ${e.lane}`);
    assert.ok(ICONS.includes(e.icon), `${e.id} icon ${e.icon}`);
    assert.ok(STATUSES.includes(e.status), `${e.id} status ${e.status}`);
    assert.ok(AVAILABILITY.includes(e.availability), `${e.id} availability ${e.availability}`);
    assert.ok(typeof e.purpose === 'string' && e.purpose.length > 0, `${e.id} purpose`);
    assert.ok(words(e.purpose) <= 16, `${e.id} purpose has ${words(e.purpose)} words`);
    if (e.useWhen) assert.ok(words(e.useWhen) <= 20, `${e.id} useWhen has ${words(e.useWhen)} words`);
    if (e.avoidWhen) assert.ok(words(e.avoidWhen) <= 20, `${e.id} avoidWhen has ${words(e.avoidWhen)} words`);
    assert.match(e.verified, DATE, `${e.id} verified`);
    assert.ok(e.name && e.category, `${e.id} name/category`);
    assert.ok(e.short && e.short.length <= 18, `${e.id} short '${e.short}' exceeds 18 characters`);
    assert.ok(Array.isArray(e.aliases), `${e.id} aliases`);
    assert.ok(!/[|\n]/.test(e.purpose + e.name), `${e.id} purpose or name breaks the prompt row format`);
    if (e.pathRank !== undefined) assert.ok(Number.isInteger(e.pathRank) && e.pathRank >= 0 && e.pathRank <= 100, `${e.id} pathRank`);
    if (e.docs) assert.match(e.docs, /^https:\/\//, `${e.id} docs`);
    if (e.regions) for (const r of e.regions) assert.match(r, /^[a-z]{2}-[a-z]+-\d$|^cn-hongkong$/, `${e.id} region ${r}`);
  }
});

test('constructs are present and drawn outside the cloud', () => {
  const ids = ['users', 'mobile-app', 'iot-devices', 'onprem-dc', 'branch-office', 'third-party-api', 'other-cloud'];
  for (const id of ids) {
    const e = get(id);
    assert.equal(e.kind, 'construct', id);
    assert.equal(e.scope, 'external', id);
  }
  assert.equal(get('users').pathRank, 0);
  // other clouds (research/phase1-asks-and-scope.md, section 2): external scope in the onprem lane, so a node sits in an external group named for the provider
  assert.equal(get('other-cloud').lane, 'onprem');
  assert.equal(placementOf(get('other-cloud')).container, 'onprem');
  assert.deepEqual(placementOf(get('other-cloud')).targets, ['onprem', 'external']);
  assert.equal(get('other-cloud').pathRank, undefined);
  assert.deepEqual(all.filter((e) => e.kind === 'construct').map((e) => e.id).sort(), [...ids].sort());
});

test('offerings carry audience, purchase model and dated prices', () => {
  for (const e of all) {
    if (e.price) {
      assert.ok(e.price.summary.length > 0, `${e.id} price summary`);
      assert.match(e.price.asOf, DATE, `${e.id} price asOf`);
    }
    if (e.purchase) assert.ok(PURCHASES.includes(e.purchase), `${e.id} purchase ${e.purchase}`);
  }
  for (const e of offerings.entries) assert.ok(e.audience, `${e.id} audience`);
  assert.match(get('qoder-teams').price!.summary, /\$40\/seat/);
  assert.match(get('qoder-enterprise').price!.summary, /\$20\/seat/);
  assert.match(get('qwenwork').price!.summary, /\$30\/seat/);
  assert.match(get('coding-plan').price!.summary, /\$50\/month/);
  assert.equal(get('agentrun').price, undefined, 'unknown prices stay empty');
});

test('no legacy, no-new-purchases or retired entry lacks a successor or note', () => {
  for (const e of all) {
    if (e.status === 'ga' || e.status === 'preview') continue;
    assert.ok(e.successor || (e.note && e.note.length > 0), `${e.id} (${e.status}) has neither successor nor note`);
  }
  for (const id of ['api-gateway', 'mse-cloud-native-gateway']) {
    const e = get(id);
    assert.equal(e.status, 'no-new-purchases', id);
    assert.equal(e.successor, 'cloud-native-api-gateway', id);
    assert.match(e.note ?? '', /2026-08-23/, id);
  }
  assert.equal(get('lingma').status, 'no-new-purchases');
  assert.match(get('lingma').note ?? '', /2026-09-15/);
  for (const [id, succ] of [['airec', 'opensearch'], ['id-verification-global', 'id-verification'], ['cassandra', 'lindorm'], ['tsdb', 'lindorm'],
    ['oceanbase', 'polardb'], ['hybrid-cloud-storage', 'csg'], ['batch-compute', 'ehpc'], ['ack-dedicated', 'ack'], ['ack-edge', 'ack'], ['ack-serverless', 'acs'],
    ['arms-basic', 'arms'], ['clb-pay-by-spec', 'alb'], ['anti-ddos-native-payg', 'anti-ddos-native'], ['gtm-legacy', 'gtm']]) {
    assert.ok(!isRecommendable(get(id)), `${id} should not be recommendable`);
    assert.equal(get(id).successor, succ, `${id} successor`);
  }
});

test('availability: China-only and restricted items are flagged; Model Studio keeps its name', () => {
  assert.equal(get('qoder-cn').availability, 'china-only');
  assert.equal(get('model-studio-apps').availability, 'restricted');
  assert.equal(get('icp-filing').availability, 'china-only');
  assert.equal(get('qoder').availability, 'intl');
  assert.equal(get('model-studio').name, 'Alibaba Cloud Model Studio');
  assert.notEqual(catalog.resolve('Qwen Cloud').entry?.id, 'model-studio', 'Qwen Cloud is a separate portal');
  assert.equal(get('qwen-cloud').kind, 'offering');
});

test('placement follows seed section E with the fact-check corrections', () => {
  // R1 request path order
  const order = ['users', 'dns', 'esa', 'anti-ddos-proxy', 'waf', 'alb', 'ecs', 'tair', 'rds', 'oss'];
  const ranks = order.map((id) => get(id).pathRank as number);
  for (let i = 1; i < ranks.length; i++) assert.ok(ranks[i - 1] < ranks[i], `${order[i - 1]}(${ranks[i - 1]}) before ${order[i]}(${ranks[i]})`);
  for (const id of ['cdn', 'ga', 'anycast-eip']) assert.equal(get(id).pathRank, 10, id);
  for (const id of ['nlb', 'clb', 'cloud-native-api-gateway']) assert.equal(get(id).pathRank, 30, id);
  for (const id of ['ack', 'acs', 'sae', 'fc', 'eci']) assert.equal(get(id).pathRank, 40, id);
  assert.ok((get('ai-gateway').pathRank as number) > 40, 'AI Gateway sits after the app, before the model');
  // WAF: cloud-native badge on gateways, rank 20 when inline
  assert.deepEqual(get('waf').attach, { as: 'badge', hosts: ['alb', 'nlb', 'clb', 'cloud-native-api-gateway', 'esa', 'fc'] });
  assert.equal(get('waf').pathRank, 20);
  // DNS is a resolve hop
  assert.equal(get('dns').pathRank, 5);
  assert.equal(get('dns').lane, 'dns');
  // attachments
  for (const id of ['ebs', 'eip', 'certificate-management', 'ess', 'anti-ddos-native', 'privatezone', 'alinux']) assert.ok(get(id).attach, `${id} attaches`);
  assert.ok(get('ebs').attach!.hosts.includes('ecs'));
  assert.ok(get('eip').attach!.hosts.includes('nat'));
  assert.ok(get('certificate-management').attach!.hosts.includes('alb'));
  assert.ok(get('ess').attach!.hosts.includes('ecs'));
  // R2 regional managed services stay outside the VPC
  for (const id of ['oss', 'sls', 'cloudmonitor', 'arms', 'prometheus', 'grafana', 'opentelemetry', 'security-center', 'kms', 'acr', 'maxcompute', 'hologres', 'dataworks',
    'datahub', 'dlf', 'quick-bi', 'datav', 'model-studio', 'pai', 'pai-eas', 'pai-dlc', 'pai-dsw', 'pai-model-gallery', 'pai-instant', 'pai-token-service', 'dashvector', 'opensearch', 'eventbridge', 'smq', 'cloudflow', 'schedulerx', 'fc', 'tablestore', 'dts',
    'dms', 'das', 'agentrun', 'agentbay', 'agentcore', 'agentloop', 'starops', 'imm', 'mqtt', 'iot-platform']) {
    assert.ok(get(id).scope !== 'vpc' && get(id).scope !== 'vpc-edge', `${id} must not be VPC-scoped`);
  }
  assert.equal(get('fc').vpcAttachable, true);
  // R3 inside the VPC, or on its boundary
  for (const id of ['ecs', 'egs', 'ebm', 'ddh', 'eci', 'ack', 'acs', 'sae', 'ehpc', 'alb', 'nlb', 'gwlb', 'clb', 'bastionhost', 'nas', 'cpfs', 'rds', 'polardb', 'tair',
    'mongodb', 'lindorm', 'hbase', 'analyticdb', 'clickhouse', 'selectdb', 'elasticsearch', 'milvus', 'flink', 'emr', 'mse', 'rocketmq', 'kafka', 'rabbitmq', 'confluent',
    'cloud-native-api-gateway']) assert.equal(get(id).scope, 'vpc', id);
  for (const id of ['nat', 'vpn-gateway', 'ipv6-gateway', 'cloud-firewall']) assert.equal(get(id).scope, 'vpc-edge', id);
  // R5 governance band
  for (const id of ['ram', 'cloudsso', 'resource-management', 'acgc', 'actiontrail', 'cloud-config', 'advisor', 'security-center', 'agent-identity', 'agent-security-center',
    'dsc']) assert.equal(get(id).scope, 'account', id);
  // R6 seats used outside the customer's cloud
  for (const id of ['qoder', 'qoder-teams', 'qoder-enterprise', 'qwenwork', 'eds']) assert.equal(get(id).scope, 'saas', id);
  // R7 multi-AZ
  for (const id of ['alb', 'nlb', 'ecs', 'ack', 'rds', 'polardb', 'tair']) assert.equal(get(id).multiAz, true, id);
});

test('lookup keys (ids, names, short labels, aliases) are unambiguous', () => {
  assert.deepEqual(catalogKeyConflicts(all), []);
  assert.equal(normalizeKey('Log Service (SLS)'), 'logservicesls');
  assert.equal(normalizeKey('  Tair (Redis® OSS-Compatible) '), 'tairredisosscompatible');
  assert.equal(normalizeKey('通义灵码'), '通义灵码');
});

test('resolve: exact ids, case and separators', () => {
  assert.deepEqual(catalog.resolve('ecs'), { entry: get('ecs'), via: 'id' });
  assert.equal(catalog.resolve('ECS').via, 'id');
  assert.equal(catalog.resolve(' model_studio ').entry?.id, 'model-studio');
  assert.equal(catalog.resolve('Security Center').entry?.id, 'security-center');
});

test('resolve: renames and aliases', () => {
  const cases: Array<[string, string | string[]]> = [
    ['SLB', ['clb', 'alb', 'nlb', 'gwlb']],
    ['Server Load Balancer', ['clb', 'alb', 'nlb', 'gwlb']],
    ['Redis', 'tair'],
    ['ApsaraDB for Redis', 'tair'],
    ['DCDN', 'esa'],
    ['Dynamic Route for CDN', 'esa'],
    ['Log Service', 'sls'],
    ['Tongyi Lingma', 'qoder'],
    ['TONGYI Lingma', 'qoder'],
    ['Lingma', 'qoder'],
    ['通义灵码', 'qoder'],
    ['API Gateway', 'cloud-native-api-gateway'],
    ['MSE cloud-native gateway', 'cloud-native-api-gateway'],
    ['Bailian', 'model-studio'],
    ['DashScope', 'model-studio'],
    ['百炼', 'model-studio'],
    ['MNS', 'smq'],
    ['Serverless Workflow', 'cloudflow'],
    ['Tracing Analysis', 'opentelemetry'],
    ['Hybrid Backup Recovery', 'cloud-backup'],
    ['SSL Certificates Service', 'certificate-management'],
    ['SDDP', 'dsc'],
    ['ASK', 'acs'],
    ['Serverless Kubernetes', 'acs'],
    ['Cloud Governance Center', 'acgc'],
    ['Multi-agent Governance and Collaboration Platform', 'agentcore'],
    ['AgentTeams', 'agentcore'],
    ['JVS Agent Suite', 'agentic-computer'],
    ['Cloud Skills Portal', 'cloud-agent-catalog'],
    ['Wuying Workspace', 'eds'],
    ['QoderWork', 'qwenwork'],
    ['Anti-DDoS Origin', 'anti-ddos-native'],
    ['DRDS', 'polardb'],
  ];
  for (const [q, want] of cases) {
    const r = catalog.resolve(q);
    const wants = Array.isArray(want) ? want : [want];
    assert.ok(r.entry && wants.includes(r.entry.id), `${q} -> ${r.entry?.id}, want ${wants.join('|')}`);
    assert.ok(r.via === 'alias' || r.via === 'successor', `${q} via ${r.via}`);
    assert.ok(r.warning && (r.warning.code === 'alias-resolved' || r.warning.code === 'retired-product'), `${q} warning ${r.warning?.code}`);
    assert.equal(r.warning.code, r.via === 'successor' ? 'retired-product' : 'alias-resolved', q);
  }
});

test('resolve: legacy, no-new-purchases and retired entries switch to their successor', () => {
  const r = catalog.resolve('api-gateway');
  assert.equal(r.entry?.id, 'cloud-native-api-gateway');
  assert.equal(r.via, 'successor');
  assert.equal(r.warning?.code, 'retired-product');
  assert.equal(r.warning?.severity, 'warn');
  assert.equal(r.warning?.repaired, true);
  assert.match(r.warning?.msg ?? '', /2026-08-23/);
  assert.equal(catalog.resolve('tsdb').entry?.id, 'lindorm');
  assert.equal(catalog.resolve('InfluxDB').entry?.id, 'lindorm');
  assert.equal(catalog.resolve('gtm-legacy').entry?.id, 'gtm');
  // entries without a successor resolve as they are; the validator reports their status
  const g = catalog.resolve('graphcompute');
  assert.equal(g.entry?.id, 'graphcompute');
  assert.equal(g.via, 'id');
  assert.equal(catalog.resolve('clb').entry?.id, 'clb', 'legacy CLB stays CLB for existing deployments');
  assert.equal(catalog.resolve('qoder-cn').entry?.id, 'qoder-cn', 'China-only entries resolve; the validator adds the china-only warning');
});

test('resolve: unknown or empty references give unknown-product', () => {
  for (const q of ['definitely-not-a-product', '', '   ']) {
    const r = catalog.resolve(q);
    assert.equal(r.entry, undefined, q);
    assert.equal(r.warning?.code, 'unknown-product', q);
  }
  assert.equal(catalog.resolve('SAS').entry, undefined, "'SAS' is ambiguous (Simple Application Server vs Security Center)");
});

test('resolve: ids from the recorded probe streams', () => {
  const map: Record<string, string> = {
    anti_ddos: 'anti-ddos-proxy', api_gateway: 'cloud-native-api-gateway', auto_scaling: 'ess', cloud_firewall: 'cloud-firewall', model_studio: 'model-studio',
    quick_bi: 'quick-bi', security_center: 'security-center', third_party: 'third-party-api', analyticdb_pg: 'analyticdb', pai_eas: 'pai-eas',
  };
  for (const [q, want] of Object.entries(map)) assert.equal(catalog.resolve(q).entry?.id, want, q);
});

test('promptRows: one row per recommendable entry, ordered by scope then lane, under 12k tokens', () => {
  const text = catalog.promptRows();
  const rows = text.split('\n');
  const expected = all.filter(isRecommendable);
  assert.equal(rows.length, expected.length);
  let prev = -1;
  const ids = new Set<string>();
  for (const row of rows) {
    const cols = row.split(' | ');
    const e = get(cols[0]);
    assert.ok(!ids.has(e.id), `row twice: ${e.id}`);
    ids.add(e.id);
    assert.equal(cols[1], e.name);
    assert.equal(cols[2], e.scope);
    assert.equal(cols[3], e.lane);
    assert.ok(cols.includes(e.purpose), `${e.id} purpose column`);
    if (typeof e.pathRank === 'number') assert.equal(cols[4], String(e.pathRank));
    const pos = SCOPE_ORDER.indexOf(e.scope) * 100 + LANE_ORDER.indexOf(e.lane);
    assert.ok(pos >= prev, `${e.id} out of scope/lane order`);
    prev = pos;
  }
  for (const id of ['api-gateway', 'lingma', 'tsdb', 'qoderwork', 'ack-serverless']) assert.ok(!ids.has(id), `${id} must not be offered to the model`);
  assert.ok(ids.has('qoder-cn') && /china-only/.test(rows.find((r) => r.startsWith('qoder-cn |')) ?? ''), 'China-only rows are flagged');
  assert.match(rows.find((r) => r.startsWith('waf |')) ?? '', /\[badge on alb,/);
  const tokens = estimateTokens(text);
  assert.ok(tokens < 12000, `prompt rows ~${tokens} tokens`);
  // byte-stable regardless of input order, so the cached prompt prefix never changes by accident
  const shuffled = createCatalog({ version: products.version, entries: [...offerings.entries].reverse() }, { version: offerings.version, entries: [...products.entries].reverse() });
  assert.equal(shuffled.promptRows(), text);
  assert.equal(catalog.promptRows(), text);
});

test('AI depth: PAI stages are separate entries and the umbrella keeps no stage aliases', () => {
  for (const id of ['pai-eas', 'pai-dlc', 'pai-dsw', 'pai-model-gallery', 'pai-token-service']) {
    const e = get(id);
    assert.equal(e.kind, 'service', id);
    assert.equal(e.scope, 'region', id);
    assert.equal(e.lane, 'ai', id);
    assert.equal(e.status, 'ga', id);
    assert.equal(e.pathRank, undefined, `${id} is called by apps, so it has no fixed request-path rank`);
  }
  for (const id of ['pai-eas', 'pai-dlc', 'pai-dsw']) assert.equal(get(id).vpcAttachable, true, id);
  const cases: Array<[string, string]> = [['EAS', 'pai-eas'], ['PAI-EAS', 'pai-eas'], ['Elastic Algorithm Service', 'pai-eas'], ['DLC', 'pai-dlc'], ['PAI-DLC', 'pai-dlc'],
    ['PAI-DSW', 'pai-dsw'], ['Data Science Workshop', 'pai-dsw'], ['Model Gallery', 'pai-model-gallery'], ['PAI QuickStart', 'pai-model-gallery'], ['PAI Studio', 'pai'],
    ['Platform for AI', 'pai'], ['Token Service', 'pai-token-service']];
  for (const [q, want] of cases) assert.equal(catalog.resolve(q).entry?.id, want, q);
  const pai = get('pai');
  for (const stale of ['PAI-EAS', 'EAS', 'pai_eas', 'PAI-DSW', 'PAI-DLC', 'Model Gallery']) assert.ok(!pai.aliases.includes(stale), `pai must not keep the alias ${stale}`);
  assert.ok(['pai-dsw', 'pai-dlc', 'pai-eas'].every((id) => pai.pairsWith?.includes(id)));
  // PAI Token Service is not Model Studio: no Singapore region is claimed (only the Beijing endpoint is confirmed), and the two point at each other
  assert.equal(get('pai-token-service').regions, undefined);
  assert.ok(get('model-studio').alternatives?.includes('pai-token-service') && get('model-studio').alternatives?.includes('pai-eas'));
  assert.match(get('pai-token-service').price?.summary ?? '', /1\.2 times/);
  assert.match(get('pai-token-service').avoidWhen ?? '', /model-studio/);
  assert.match(get('model-studio').avoidWhen ?? '', /PAI-EAS/);
  // nothing in the catalog still points at the umbrella where a stage is meant
  for (const id of ['egs', 'cpfs', 'ai-gateway', 'lingjun']) assert.ok(!(get(id).pairsWith ?? []).concat(get(id).alternatives ?? []).includes('pai'), `${id} still names the umbrella`);
});

test('AI depth: PAI-Instant is a china-only guard and LangStudio redirects to PAI-EAS with its retirement date', () => {
  const inst = get('pai-instant');
  assert.equal(inst.availability, 'china-only');
  assert.equal(checkLifecycle(inst, catalog.byId).availability?.code, 'china-only');
  assert.equal(catalog.resolve('PAI Sandbox').entry?.id, 'pai-instant');
  assert.match(catalog.promptRows().split('\n').find((r) => r.startsWith('pai-instant |')) ?? '', /\[china-only\]/);
  const ls = catalog.resolve('LangStudio');
  assert.equal(ls.entry?.id, 'pai-eas');
  assert.equal(ls.via, 'successor');
  assert.equal(ls.warning?.code, 'retired-product');
  assert.match(ls.warning?.msg ?? '', /2027-03-09/);
  assert.ok(!isRecommendable(get('pai-langstudio')));
});

test('AI depth: Agent Sandbox is GA in two editions that cite the standalone docs, with no GPU', () => {
  const flash = get('agent-sandbox');
  const box = get('acs-agent-sandbox');
  for (const e of [flash, box]) {
    assert.equal(e.status, 'ga', `${e.id} was commercialised on 2026-09-21`);
    assert.equal(e.kind, 'offering', e.id);
    assert.equal(e.availability, 'intl', e.id);
    assert.ok(e.regions?.includes('ap-southeast-1'), `${e.id} is in Singapore`);
    assert.match(e.docs ?? '', /^https:\/\/www\.alibabacloud\.com\/help\/en\/agent-sandbox\//, `${e.id} cites the standalone product docs, never the stale ACS user-guide page`);
    assert.match(e.note ?? '', /no GPU/i, e.id);
    assert.match(e.note ?? '', /2026-09-21/, e.id);
    assert.ok(!/preview/i.test(`${e.purpose} ${e.useWhen} ${e.avoidWhen}`), `${e.id}: no preview wording in the model-facing text`);
  }
  assert.match(box.note ?? '', /stale public-preview banner/);
  assert.equal(box.scope, 'vpc');
  assert.equal(box.lane, 'compute');
  assert.equal(box.pathRank, 40);
  assert.equal(flash.scope, 'region');
  assert.equal(flash.name, 'Agent Sandbox (Flash Edition)');
  assert.ok(flash.alternatives?.includes('acs-agent-sandbox') && box.alternatives?.includes('agent-sandbox'));
  assert.ok(get('acs').pairsWith?.includes('acs-agent-sandbox'));
  assert.equal(catalog.resolve('ACS Agent Sandbox').entry?.id, 'acs-agent-sandbox');
  assert.equal(catalog.resolve('SandboxSet').entry?.id, 'acs-agent-sandbox');
  assert.equal(catalog.resolve('E2B sandbox').entry?.id, 'agent-sandbox');
  assert.equal(catalog.resolve('Agent Sandbox').entry?.id, 'agent-sandbox');
  assert.equal(catalog.resolve('FC Agent Sandbox').entry?.id, 'agent-sandbox');
  assert.ok(!/ACS Agent Sandbox/i.test(flash.aliases.join('|')), 'the ACS alias belongs to the Container edition');
  assert.match(get('agentbay').alternatives?.join(',') ?? '', /agent-sandbox/);
});

test('AI depth: GPU notes name only what Singapore sells, and Lingjun is allowlist-only', () => {
  for (const id of ['egs', 'pai-eas']) {
    const n = get(id).note ?? '';
    assert.match(n, /A10, T4, V100 and P100/, id);
    assert.match(n, /L20 and H20 (\(gn8is, gn8v\) )?are sales-negotiated/, id);
    assert.match(n, /A100, A800, H100 and H800 are never offered internationally/, id);
  }
  assert.match(get('acs').note ?? '', /invitational preview/);
  assert.match(get('acs').note ?? '', /T4 and A10 only/);
  // the model-facing text never names a GPU model
  for (const e of all.filter(isRecommendable)) assert.ok(!/\b(A100|A800|H100|H800|H20|L20)\b/.test(`${e.purpose} ${e.useWhen ?? ''} ${e.avoidWhen ?? ''}`), `${e.id}: GPU model in model-facing text`);
  const l = get('lingjun');
  assert.match(l.purpose, /Allowlist-only/);
  assert.match(l.avoidWhen ?? '', /PoCs and demos/);
  assert.match(l.avoidWhen ?? '', /pai-dlc/);
  assert.match(l.note ?? '', /no pay-as-you-go/);
  assert.match(l.note ?? '', /whole machines by the week/);
  assert.match(get('pai-dlc').useWhen ?? '', /no allowlist/);
});

test('AI depth: other-cloud nodes are labelled per provider; EC2 and S3 still mean a build on Alibaba Cloud', () => {
  const oc = get('other-cloud');
  assert.equal(oc.name, 'Other cloud environment');
  for (const q of ['AWS', 'Azure', 'Google Cloud', 'GCP', 'Other cloud', 'Multi-cloud']) assert.equal(catalog.resolve(q).entry?.id, 'other-cloud', q);
  assert.equal(catalog.resolve('S3').entry?.id, 'oss', 'S3 stays an OSS alias, so a build on Alibaba Cloud keeps mapping to the Alibaba product');
  for (const q of ['EC2', 'Lambda']) assert.notEqual(catalog.resolve(q).entry?.id, 'other-cloud', `${q} must not become an other-cloud node`);
  assert.match(oc.useWhen ?? '', /keeps part of their system/);
  for (const id of ['vpn-gateway', 'express-connect', 'cen', 'dts']) assert.ok(oc.pairsWith?.includes(id), `other-cloud pairs with ${id}`);
  assert.match(oc.note ?? '', /provider and the role/);
});

// Docs links were confirmed 2026-11-01, one GET each on alibabacloud.com/help/en with a 200 and a matching page title. An entry stays
// without a link rather than guess one; this list is those entries (no matching page on the international site was found).
const NO_DOCS = ['accio-work', 'cloud-application-platform', 'cloud-contact-center', 'graphcompute', 'gtm-legacy', 'id-verification-global', 'meoo', 'mobile-testing', 'tsdb'];

test('docs: every service and offering links to official docs except the nine with no confirmed page', () => {
  const missing = all.filter((e) => e.kind !== 'construct' && !e.docs).map((e) => e.id).sort();
  assert.deepEqual(missing, NO_DOCS);
  for (const e of all) if (e.kind === 'construct') assert.equal(e.docs, undefined, `${e.id}: constructs have no product docs`);
  const covered = all.filter((e) => e.kind !== 'construct' && e.docs).length / all.filter((e) => e.kind !== 'construct').length;
  assert.ok(covered >= 0.95, `docs coverage ${(covered * 100).toFixed(1)}%`);
  // never the China site, and the Agent Sandbox editions never the stale ACS user-guide page
  for (const e of all) if (e.docs) assert.ok(!/aliyun\.com/.test(e.docs), `${e.id} docs point at the China site`);
  for (const e of all) if (e.docs) assert.ok(!/\/help\/en\/cs\/user-guide\/agent-sandbox/.test(e.docs), `${e.id} cites the stale ACS agent-sandbox page`);
  // every filled link is a canonical help URL (no redirect-only aliases such as /user-guide/overview-2)
  assert.equal(get('pai-eas').docs, 'https://www.alibabacloud.com/help/en/pai/overview-2');
  assert.match(get('lingma').docs ?? '', /\/help\/en\/lingma\//);
});

test('createCatalog rejects duplicate ids and stays browser-safe', () => {
  assert.throws(() => createCatalog(products, { version: '2026-10-31', entries: [products.entries[0]] }), /duplicate catalog id/);
  const src = readFileSync(new URL('../src/catalog.ts', import.meta.url), 'utf8');
  assert.ok(!/from\s+['"](node:|fs['"])/.test(src), 'catalog.ts must not import Node modules');
});
