import { test } from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { loadCatalog } from '../../../../packages/core/src/catalog-node.ts';
import type { Graph, GraphNode, GraphGroup } from '../../../../packages/core/src/types.ts';
import type { LayoutCard } from '../../../../packages/core/src/layout.ts';
import { STACKED, layoutStacked } from './layout.ts';
import { stackedCardText } from './text.ts';

const catalog = loadCatalog();

function g(groups: GraphGroup[], nodes: GraphNode[], recs: Array<{ product: string; fit: 'primary' | 'complement'; why: string }> = []): Graph {
  const gMap: Record<string, GraphGroup> = {};
  for (const gr of groups) gMap[gr.id] = gr;
  const nMap: Record<string, GraphNode> = {};
  for (const n of nodes) nMap[n.id] = n;
  return { groups: gMap, nodes: nMap, edges: {}, recs };
}

const OPTS = { canvas: { w: 1040, h: 800 } } as const;

const fullGroups: GraphGroup[] = [
  { id: 'users-g', kind: 'external', label: 'Users', parent: null },
  { id: 'edge-g', kind: 'edge', label: 'Edge', parent: null },
  { id: 'region', kind: 'region', label: 'Region', parent: null },
  { id: 'vpc', kind: 'vpc', label: 'VPC', parent: 'region' },
];

const fullNodes: GraphNode[] = [
  { id: 'users', product: 'users', label: 'Users', group: 'users-g' },
  { id: 'cdn', product: 'cdn', label: 'CDN', group: 'edge-g' },
  { id: 'esa', product: 'esa', label: 'ESA', group: 'edge-g' },
  { id: 'dns', product: 'dns', label: 'Cloud DNS', group: null },
  { id: 'alb', product: 'alb', label: 'ALB', group: 'vpc' },
  { id: 'ecs', product: 'ecs', label: 'ECS', group: 'vpc' },
  { id: 'rds', product: 'rds', label: 'RDS', group: 'vpc' },
  { id: 'tair', product: 'tair', label: 'Tair', group: 'vpc' },
  { id: 'oss', product: 'oss', label: 'OSS', group: 'region' },
  { id: 'sls', product: 'sls', label: 'SLS', group: 'region' },
  { id: 'hologres', product: 'hologres', label: 'Hologres', group: 'vpc' },
  { id: 'nat', product: 'nat', label: 'NAT Gateway', group: 'vpc' },
  { id: 'ram', product: 'ram', label: 'RAM', group: null },
  { id: 'qoder', product: 'qoder', label: 'Qoder', group: null },
];

const fullGraph = g(fullGroups, fullNodes, [{ product: 'qoder', fit: 'primary', why: '' }]);
const fullState = layoutStacked(fullGraph, catalog, undefined, OPTS);

test('request path row is y=0 for users, the first edge-stack card and the first card of each VPC column', () => {
  const st = fullState;
  assert.equal(st.cards['users']!.y, 0);
  const edgeFrame = Object.values(st.frames).find(f => f.kind === 'edge')!;
  const edgeCards = Object.values(st.cards).filter(c => c.frame === edgeFrame.id && c.slot.endsWith('#stack'));
  edgeCards.sort((a, b) => a.index - b.index);
  assert.equal(edgeCards[0]!.y, 0);
  assert.ok(st.cards['dns']!.y < 0, 'DNS sits above the path row');
  assert.equal(st.cards['alb']!.y, 0);
  assert.equal(st.cards['ecs']!.y, 0);
  // the data column orders by lane (cache before database), so its first card is Tair
  const data = Object.values(st.cards).filter(c => c.slot === 'vpc#data').sort((a, b) => a.index - b.index);
  assert.deepEqual(data.map(c => c.id), ['tair', 'rds']);
  assert.equal(data[0]!.y, 0);
  assert.equal(st.pathY, 0);
});

test('shelf blocks are below the VPC, inside the region, aligned with a VPC column x', () => {
  const st = fullState;
  const vpc = Object.values(st.frames).find(f => f.kind === 'vpc')!;
  const region = Object.values(st.frames).find(f => f.kind === 'region')!;
  const lanes = Object.values(st.frames).filter(f => f.kind === 'lane');
  assert.ok(lanes.length > 0);
  const colXs = [st.cards['alb']!.x, st.cards['ecs']!.x, st.cards['rds']!.x];
  for (const lane of lanes) {
    assert.ok(lane.y >= vpc.y + vpc.h, `lane ${lane.id} not below VPC`);
    assert.ok(lane.x >= region.x && lane.x + lane.w <= region.x + region.w, `lane ${lane.id} outside region`);
    assert.ok(colXs.includes(lane.x), `lane ${lane.id} x not aligned to VPC column`);
  }
});

test('bands: Account, SaaS and Recommended under the left columns by default; Account and SaaS below the region in "below" mode', () => {
  const graph = g(fullGroups, [...fullNodes, { id: 'actiontrail', product: 'actiontrail', label: 'ActionTrail', group: null }], [{ product: 'qoder', fit: 'primary', why: '' }]);
  const st = layoutStacked(graph, catalog, undefined, OPTS);
  const region = Object.values(st.frames).find(f => f.kind === 'region')!;
  const leftBottom = Math.max(...Object.values(st.frames).filter(f => f.kind === 'external' || f.kind === 'edge').map(f => f.y + f.h));
  for (const id of ['~account', '~saas', '~recs']) {
    const f = st.frames[id]!;
    assert.ok(f.x + f.w <= region.x, `${id} sits left of the region`);
    assert.ok(f.y >= leftBottom, `${id} sits below the left columns`);
  }
  assert.equal(st.cards['ram']!.frame, '~account');
  assert.equal(st.cards['actiontrail']!.frame, '~account');
  assert.equal(st.cards['qoder']!.frame, '~saas');
  assert.equal(st.cards['rec:qoder']!.frame, '~recs');
  const below = layoutStacked(graph, catalog, undefined, { ...OPTS, bands: 'below' });
  const r2 = Object.values(below.frames).find(f => f.kind === 'region')!;
  for (const id of ['~account', '~saas']) assert.ok(below.frames[id]!.y >= r2.y + r2.h, `${id} below the region`);
  // Account fills from the left edge, SaaS ends at the right-most region column
  assert.equal(below.frames['~account']!.x, Math.min(...Object.values(below.frames).map(f => f.x)));
  assert.ok(below.frames['~saas']!.x + below.frames['~saas']!.w <= r2.x + r2.w);
  assert.ok(below.frames['~recs']!.x + below.frames['~recs']!.w <= r2.x, 'Recommended stays under the left columns');
});

test('region-scope products go to the shelf even when grouped in the VPC', () => {
  const st = fullState;
  const holo = st.cards['hologres'];
  assert.ok(holo, 'hologres card missing');
  const frame = st.frames[holo.frame];
  assert.equal(frame.kind, 'lane');
});

test('zones: multi-zone card in combined zone frame, per-zone member in its zone frame, zone frames <= 200px', () => {
  const zg: GraphGroup[] = [
    ...fullGroups,
    { id: 'za', kind: 'zone', label: 'Zone A', parent: 'vpc' },
    { id: 'zb', kind: 'zone', label: 'Zone B', parent: 'vpc' },
  ];
  const zn: GraphNode[] = [
    { id: 'users', product: 'users', label: 'Users', group: 'users-g' },
    { id: 'alb', product: 'alb', label: 'ALB', group: 'vpc' },
    { id: 'ack', product: 'ack', label: 'ACK', group: 'vpc', zones: ['a', 'b'] },
    { id: 'ecs-a', product: 'ecs', label: 'ECS A', group: 'za' },
  ];
  const st = layoutStacked(g(zg, zn), catalog, undefined, OPTS);
  const ackCard = st.cards['ack'];
  assert.ok(ackCard);
  const ackFrame = st.frames[ackCard.frame];
  assert.equal(ackFrame.kind, 'zone');
  assert.equal(ackFrame.label, 'Zones A \u00B7 B');
  assert.equal(st.frames['zb'], undefined, 'a zone with no cards of its own is not drawn under the multi-zone frame');
  const ecsA = st.cards['ecs-a'];
  const ecsFrame = st.frames[ecsA.frame];
  assert.equal(ecsFrame.kind, 'zone');
  assert.equal(ecsFrame.id, 'za');
  const zones = Object.values(st.frames).filter(f => f.kind === 'zone');
  for (const z of zones) assert.ok(z.h <= 200, `zone ${z.id} too tall: ${z.h}`);
});

test('adding a data node with prev moves no card outside the data column', () => {
  const stA = fullState;
  const nodesB = [...fullNodes, { id: 'rocketmq', product: 'rocketmq', label: 'RocketMQ', group: 'vpc' }];
  const stB = layoutStacked(g(fullGroups, nodesB, fullGraph.recs), catalog, stA, OPTS);
  const vpcFrame = Object.values(stA.frames).find(f => f.kind === 'vpc')!;
  const dataSlot = `${vpcFrame.id}#data`;
  for (const [id, cardA] of Object.entries(stA.cards)) {
    const cardB = stB.cards[id];
    if (!cardB) continue;
    if (cardA.slot === dataSlot) continue;
    assert.equal(cardB.x, cardA.x, `${id} x moved`);
    assert.equal(cardB.y, cardA.y, `${id} y moved`);
  }
});

test('a late DNS does not move the Clients', () => {
  const gA = g([{ id: 'ug', kind: 'external', label: 'U', parent: null }, { id: 'rg', kind: 'region', label: 'R', parent: null }], [
    { id: 'users', product: 'users', label: 'Users', group: 'ug' },
    { id: 'oss', product: 'oss', label: 'OSS', group: 'rg' },
  ]);
  const stA = layoutStacked(gA, catalog, undefined, OPTS);
  const gB = g([...Object.values(gA.groups), { id: 'eg', kind: 'edge', label: 'E', parent: null }], [
    ...Object.values(gA.nodes),
    { id: 'dns', product: 'dns', label: 'DNS', group: 'eg' },
  ]);
  const stB = layoutStacked(gB, catalog, stA, OPTS);
  assert.equal(stB.cards['users']!.x, stA.cards['users']!.x);
  assert.equal(stB.cards['users']!.y, stA.cards['users']!.y);
});

test('solution map lanes in order and products in the right lane', () => {
  const sg = g([], [
    { id: 'users', product: 'users', label: 'Users', group: null },
  ], [
    { product: 'qoder', fit: 'primary', why: '' },
    { product: 'model-studio', fit: 'primary', why: '' },
  ]);
  const st = layoutStacked(sg, catalog, undefined, OPTS);
  assert.equal(st.mode, 'solution');
  const sols = Object.values(st.frames).filter(f => f.kind === 'solution').sort((a, b) => a.x - b.x);
  assert.equal(sols.length, 4);
  assert.equal(sols[0]!.label, 'Team');
  assert.equal(sols[1]!.label, 'SaaS');
  assert.equal(sols[2]!.label, 'Model service');
  assert.equal(sols[3]!.label, 'Cloud resources');
  assert.equal(st.cards['users']!.frame, sols[0]!.id);
  assert.equal(st.cards['rec:qoder']!.frame, sols[1]!.id);
  assert.equal(st.cards['rec:model-studio']!.frame, sols[2]!.id);
});

test('deterministic, no overlaps, every card inside its frame', () => {
  const st2 = layoutStacked(fullGraph, catalog, undefined, OPTS);
  assert.deepEqual(fullState, st2);
  const cards = Object.values(fullState.cards);
  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      const a = cards[i]!;
      const b = cards[j]!;
      const ox = a.x < b.x + b.w && a.x + a.w > b.x;
      const oy = a.y < b.y + b.h && a.y + a.h > b.y;
      assert.ok(!(ox && oy), `cards overlap: ${a.id} ${b.id}`);
    }
  }
  for (const c of cards) {
    const f = fullState.frames[c.frame];
    assert.ok(f, `${c.id} frame ${c.frame} missing`);
    if (c.boundary) {
      assert.equal(c.y + c.h / 2, f.y);
    } else {
      assert.ok(c.x >= f.x && c.x + c.w <= f.x + f.w, `${c.id} x outside ${f.id}`);
      assert.ok(c.y >= f.y && c.y + c.h <= f.y + f.h, `${c.id} y outside ${f.id}`);
    }
  }
});

test('30 cards lay out in under 2 ms on average', () => {
  const ns: GraphNode[] = [];
  const add = (p: string, count: number, grp: string | null): void => {
    for (let i = 0; i < count; i++) ns.push({ id: `${p}-${i}`, product: p, label: p, group: grp });
  };
  add('users', 2, 'users-g');
  add('cdn', 2, 'edge-g');
  add('esa', 1, 'edge-g');
  add('alb', 3, 'vpc');
  add('ecs', 8, 'vpc');
  add('rds', 3, 'vpc');
  add('tair', 2, 'vpc');
  add('rocketmq', 2, 'vpc');
  add('oss', 2, 'region');
  add('sls', 1, 'region');
  add('cloudmonitor', 1, 'region');
  add('ram', 1, null);
  add('actiontrail', 1, null);
  add('qoder', 1, null);
  const graph = g(fullGroups, ns);
  let prev = layoutStacked(graph, catalog, undefined, OPTS);
  const t0 = performance.now();
  for (let i = 0; i < 200; i++) {
    prev = layoutStacked(graph, catalog, prev, OPTS);
  }
  const avg = (performance.now() - t0) / 200;
  assert.ok(avg < 2, `avg ${avg.toFixed(3)}ms >= 2ms`);
});

test('card text rule', () => {
  const mk = (id: string, kind: 'node' | 'rec', product: string): LayoutCard =>
    ({ id, kind, product, frame: '', slot: '', index: 0, x: 0, y: 0, w: 0, h: 0, badges: [] }) satisfies LayoutCard;
  const dg = g([], [{ id: 'n1', product: 'rds', label: 'Orders DB', group: null }]);
  const t1 = stackedCardText(mk('n1', 'node', 'rds'), dg, catalog);
  assert.equal(t1.title, 'Orders DB');
  assert.equal(t1.subtitle, 'RDS');
  const dg2 = g([], [{ id: 'n2', product: 'alb', label: 'ALB', group: null }]);
  const t2 = stackedCardText(mk('n2', 'node', 'alb'), dg2, catalog, () => true);
  assert.equal(t2.subtitle, 'Application Load Balancer (ALB)');
  const t3 = stackedCardText(mk('n2', 'node', 'alb'), dg2, catalog, s => !s.includes('('));
  assert.equal(t3.subtitle, 'Application Load Balancer');
  const t4 = stackedCardText(mk('rec:qoder', 'rec', 'qoder'), g([], []), catalog);
  assert.equal(t4.title, 'Qoder');
  assert.equal(t4.subtitle, 'Subscription plan');
  const bad = ['Database', 'Compute', 'Operations', 'AI', 'Storage'];
  for (const t of [t1, t2, t3, t4]) assert.ok(!bad.includes(t.subtitle));
});

test('a late VPC fills the room kept above a shelf that came first, and moves no shelf card', () => {
  const groups: GraphGroup[] = [
    { id: 'ug', kind: 'external', label: 'Users', parent: null },
    { id: 'rg', kind: 'region', label: 'Singapore', parent: null },
  ];
  const nodes: GraphNode[] = [
    { id: 'users', product: 'users', label: 'Employees', group: 'ug' },
    { id: 'docs', product: 'oss', label: 'Documents', group: 'rg' },
    { id: 'llm', product: 'model-studio', label: 'Model Studio', group: 'rg' },
  ];
  const a = layoutStacked(g(groups, nodes), catalog, undefined, OPTS);
  const b = layoutStacked(g([...groups, { id: 'vpc', kind: 'vpc', label: 'VPC', parent: 'rg' }], [...nodes, { id: 'db', product: 'rds', label: 'Vector DB', group: 'vpc' }]), catalog, a, OPTS);
  for (const id of ['users', 'docs', 'llm']) assert.deepEqual([b.cards[id]!.x, b.cards[id]!.y], [a.cards[id]!.x, a.cards[id]!.y], id);
  assert.ok(b.frames['vpc']!.y + b.frames['vpc']!.h <= Math.min(b.cards['docs']!.y, b.cards['llm']!.y), 'the VPC sits above the shelf');
  // a fresh layout (tidy) puts the VPC back on top
  const tidy = layoutStacked(g([...groups, { id: 'vpc', kind: 'vpc', label: 'VPC', parent: 'rg' }], [...nodes, { id: 'db', product: 'rds', label: 'Vector DB', group: 'vpc' }]), catalog, undefined, OPTS);
  assert.ok(tidy.frames['vpc']!.y < tidy.cards['docs']!.y);
});

test('removing a data card does not pull the shelf or the bands up', () => {
  const nodes = fullNodes.filter((n) => n.id !== 'tair');
  const b = layoutStacked(g(fullGroups, nodes, fullGraph.recs), catalog, fullState, OPTS);
  for (const id of ['oss', 'sls', 'hologres', 'ram', 'qoder']) assert.equal(b.cards[id]!.y, fullState.cards[id]!.y, id);
});

test('fixed width: every architecture state with Clients is as wide as Clients + Edge + a three-column region', () => {
  const small = layoutStacked(g(fullGroups.slice(0, 1), [fullNodes[0]!]), catalog, undefined, OPTS);
  const W = 2 * (STACKED.cardW + 2 * STACKED.padX) + 2 * STACKED.rootGap + 2 * STACKED.regionPadX + 2 * STACKED.vpcPadX + 3 * STACKED.cardW + 2 * STACKED.gapX;
  assert.equal(fullState.width, W);
  assert.ok(small.width < W, 'a lone Clients column is narrow');
});

test('vpc-edge cards stack in the ingress column above the ingress card', () => {
  const groups: GraphGroup[] = [
    { id: 'rg', kind: 'region', label: 'R', parent: null },
    { id: 'vpc', kind: 'vpc', label: 'VPC', parent: 'rg' },
  ];
  const nodes: GraphNode[] = [
    { id: 'alb', product: 'alb', label: 'ALB', group: 'vpc' },
    { id: 'ecs', product: 'ecs', label: 'ECS', group: 'vpc' },
    { id: 'rds', product: 'rds', label: 'RDS', group: 'vpc' },
    { id: 'nat', product: 'nat', label: 'NAT', group: 'vpc' },
  ];
  const st = layoutStacked(g(groups, nodes), catalog, undefined, OPTS);
  const ROW = STACKED.cardH + STACKED.gapY;
  assert.equal(st.cards['nat']!.x, st.cards['alb']!.x);
  assert.equal(st.cards['nat']!.y, -ROW);
  assert.equal(st.cards['nat']!.slot, 'vpc#ingress');
  const vpcFrame = st.frames['vpc']!;
  assert.ok(st.cards['nat']!.x >= vpcFrame.x);
  assert.ok(st.cards['nat']!.x + st.cards['nat']!.w <= vpcFrame.x + vpcFrame.w);
  assert.ok(st.cards['nat']!.y >= vpcFrame.y);
  assert.ok(st.cards['nat']!.y + st.cards['nat']!.h <= vpcFrame.y + vpcFrame.h);
});

test('a taller data tier never lifts a vpc-edge card', () => {
  const groups: GraphGroup[] = [
    { id: 'rg', kind: 'region', label: 'R', parent: null },
    { id: 'vpc', kind: 'vpc', label: 'VPC', parent: 'rg' },
  ];
  const nodesA: GraphNode[] = [
    { id: 'alb', product: 'alb', label: 'ALB', group: 'vpc' },
    { id: 'ecs', product: 'ecs', label: 'ECS', group: 'vpc' },
    { id: 'rds', product: 'rds', label: 'RDS', group: 'vpc' },
    { id: 'nat', product: 'nat', label: 'NAT', group: 'vpc' },
  ];
  const stA = layoutStacked(g(groups, nodesA), catalog, undefined, OPTS);
  const nodesB: GraphNode[] = [
    ...nodesA,
    { id: 'tair', product: 'tair', label: 'Tair', group: 'vpc' },
    { id: 'polardb', product: 'polardb', label: 'PolarDB', group: 'vpc' },
    { id: 'milvus', product: 'milvus', label: 'Milvus', group: 'vpc' },
  ];
  const stB = layoutStacked(g(groups, nodesB), catalog, stA, OPTS);
  assert.equal(stB.cards['nat']!.x, stA.cards['nat']!.x);
  assert.equal(stB.cards['nat']!.y, stA.cards['nat']!.y);
  assert.ok(stB.frames['vpc']!.y < stA.frames['vpc']!.y);
});

test('a tall compute tier wraps above the ingress column, and later data cards do not move it', () => {
  const groups: GraphGroup[] = [
    { id: 'rg', kind: 'region', label: 'R', parent: null },
    { id: 'vpc', kind: 'vpc', label: 'VPC', parent: 'rg' },
  ];
  const ecsNodes: GraphNode[] = Array.from({ length: 9 }, (_, i) => ({
    id: `ecs-${i}`,
    product: 'ecs',
    label: `Service ${i}`,
    group: 'vpc',
  }));
  const nodesA: GraphNode[] = [
    { id: 'alb', product: 'alb', label: 'ALB', group: 'vpc' },
    ...ecsNodes,
    { id: 'rds', product: 'rds', label: 'RDS', group: 'vpc' },
  ];
  const stA = layoutStacked(g(groups, nodesA), catalog, undefined, OPTS);
  const ROW = STACKED.cardH + STACKED.gapY;
  const computeX = stA.cards['ecs-0']!.x;
  const albX = stA.cards['alb']!.x;
  const atComputeX = ecsNodes.filter((n) => stA.cards[n.id]!.x === computeX);
  const atAlbX = ecsNodes.filter((n) => stA.cards[n.id]!.x === albX);
  // more than seven compute cards wrap: cap = max(7, ceil((9 + 2) / 2)) = 7 stay, 2 wrap above the ingress column
  assert.equal(atComputeX.length, 7);
  assert.equal(atAlbX.length, 2);
  for (const n of ecsNodes) {
    assert.equal(stA.cards[n.id]!.slot, 'vpc#compute');
  }
  const wrappedYs = atAlbX.map((n) => stA.cards[n.id]!.y).sort((a, b) => a - b);
  const expectedYs = [-3 * ROW, -2 * ROW];
  assert.deepEqual(wrappedYs, expectedYs);
  const allCards = Object.values(stA.cards);
  for (let i = 0; i < allCards.length; i++) {
    for (let j = i + 1; j < allCards.length; j++) {
      const a = allCards[i]!;
      const b = allCards[j]!;
      const ox = a.x < b.x + b.w && a.x + a.w > b.x;
      const oy = a.y < b.y + b.h && a.y + a.h > b.y;
      assert.ok(!(ox && oy), `cards overlap: ${a.id} ${b.id}`);
    }
  }
  const nodesB: GraphNode[] = [
    ...nodesA,
    { id: 'tair', product: 'tair', label: 'Tair', group: 'vpc' },
    { id: 'polardb', product: 'polardb', label: 'PolarDB', group: 'vpc' },
  ];
  const stB = layoutStacked(g(groups, nodesB), catalog, stA, OPTS);
  for (const n of ecsNodes) {
    assert.equal(stB.cards[n.id]!.x, stA.cards[n.id]!.x);
    assert.equal(stB.cards[n.id]!.y, stA.cards[n.id]!.y);
  }
});