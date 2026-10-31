// Two synthetic replay fixtures for "Draw first, then ask" (research/phase1-asks-and-scope.md section 1), in English and
// Korean (four files). The model does not emit assume and ask ops yet, so these are composed by hand and run through the
// same graph code the server uses (core applyOp), so every graph, every added/updated/removed list and every commit
// memory in them is the real shape. When the core workflow lands the ops, these stay as the console's fixtures and
// can be re-recorded.
//
//   asks-shop   a web shop: assume ops (public-facing, Singapore) and two ask ops after the drawing; an option answers
//               the scale question; the Change on the public-facing chip settles it (a requirement pins, the chip goes).
//   asks-vague  "We need cloud for our company": two ask ops and no nodes; an option then draws a web store.
//
// The drawing steps come from the recorded "ha" fixture (a real two-zone web store), so the canvas is a real stream.
// Run by `npm run replay:build` (build-fixtures.ts calls askFixtures).
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Graph, Op, SessionMemory, Turn } from '@ali/core/types.ts';
import { applyOp, createCtx, emptyGraph } from '@ali/core/reducer.ts';
import type { Fixture, FixtureTurn } from './build-fixtures.ts';

type Lang = 'en' | 'ko';
type Wire = FixtureTurn['ev'][number][1];
interface Item {
  at: number;
  op: Op;
}

// ---------- copy ----------

interface Copy {
  ask1: string;
  say1: string;
  say1b: string;
  exposure: string;
  exposureAlt: string;
  region: string;
  regionAlt: string;
  askScale: string;
  scaleOpts: string[];
  askWhere: string;
  whereOpts: string[];
  summary1: string;
  say2: string;
  req2: string;
  scalingWhy: string;
  replicaLabel: string;
  replicaWhy: string;
  summary2: string;
  say3: string;
  req3: string;
  usersLabel: string;
  usersWhy: string;
  internetLabel: string;
  summary3: string;
  vpnLabel: string;
  // the vague request
  vSay1: string;
  vAskWhat: string;
  vWhatOpts: string[];
  vAskWho: string;
  vWhoOpts: string[];
  vSummary1: string;
  vSay2: string;
  vAsk1: string;
  // the drawn store, localized
  nodes: Record<string, { label: string; why: string }>;
  groups: Record<string, string>;
}

const EN: Copy = {
  ask1: 'Build a web app for our online store.',
  say1: "I'll draw a public web store in Singapore: ESA and ALB with WAF in front, ECS web servers behind Auto Scaling, a Tair cache and RDS.",
  say1b: 'Sessions go to Tair and orders to RDS, both across two zones.',
  exposure: 'Public-facing',
  exposureAlt: 'Internal only',
  region: 'Singapore region',
  regionAlt: 'Hong Kong region',
  askScale: 'How many shoppers do you expect on a busy day?',
  scaleOpts: ['Under 10,000 shoppers', 'About 100,000 shoppers', 'Over 1 million shoppers'],
  askWhere: 'Does anything run outside Alibaba Cloud today?',
  whereOpts: ['No, this is a new build', 'Yes, on-premises', 'Yes, on another cloud'],
  summary1: 'Public web store in Singapore with ESA, ALB with WAF, ECS with Auto Scaling, a Tair cache and RDS.',
  say2: "At about 100,000 shoppers I'll size Auto Scaling for flash-sale peaks and add a read replica for the order database.",
  req2: 'About 100,000 shoppers on a busy day',
  scalingWhy: 'Scales out for about 100,000 shoppers and flash-sale peaks.',
  replicaLabel: 'Read replica',
  replicaWhy: 'Serves order lookups so the primary stays free for writes.',
  summary2: 'Sized for about 100,000 shoppers: Auto Scaling for peaks and an RDS read replica.',
  say3: 'Switching to internal only: the public edge goes away and staff reach the ALB over a private connection.',
  req3: 'Internal only, no public access',
  usersLabel: 'Staff',
  usersWhy: 'Employees and partners using the store from the corporate network.',
  internetLabel: 'Corporate network',
  summary3: 'Internal-only store: no public edge, staff reach ALB with WAF over a private connection.',
  vpnLabel: 'private access',
  vSay1: 'Before I draw anything I need two details, because they decide the whole design.',
  vAskWhat: 'What should the cloud run first?',
  vWhatOpts: ['A website or online store', 'Internal business apps', 'Data and analytics', 'An AI assistant'],
  vAskWho: 'Who will use it?',
  vWhoOpts: ['Customers on the internet', 'Our employees only'],
  vSummary1: 'Nothing drawn yet: waiting for what to build and who will use it.',
  vSay2: "A web store it is. I'll draw it as a public site in Singapore: ESA and ALB with WAF in front, ECS web servers behind Auto Scaling, a Tair cache and RDS.",
  vAsk1: 'We need cloud for our company.',
  nodes: {
    users: { label: 'Shoppers', why: 'Shoppers browsing the online store.' },
    dns: { label: 'Cloud DNS', why: 'Resolves the store domain to ESA edge nodes.' },
    esa: { label: 'ESA', why: 'Caches static assets and accelerates dynamic pages across Southeast Asia.' },
    alb: { label: 'ALB', why: 'Distributes traffic across two zones for high availability.' },
    waf: { label: 'WAF', why: 'Blocks OWASP attacks and bots before reaching the app.' },
    app: { label: 'Web servers', why: 'Runs the store application across two zones.' },
    scaling: { label: 'Auto Scaling', why: 'Adds instances automatically during big sales peaks.' },
    cache: { label: 'Session cache', why: 'Keeps carts and sessions fast with zone-level HA.' },
    db: { label: 'Orders DB', why: 'Stores orders with a standby replica in the second zone.' },
    media: { label: 'Product images', why: 'Stores product images that ESA serves from the edge.' },
    logs: { label: 'Logs', why: 'Centralizes logs and alerts for monitoring store health.' },
  },
  groups: { internet: 'Internet', edge: 'Edge', sg: 'Singapore (ap-southeast-1)', vpc: 'Store VPC' },
};

// First drafted by qwen3.8-flash (tools/qwen/ask.ts), then corrected by hand (spacing, product names, wording).
const KO: Copy = {
  ask1: '온라인 스토어용 웹 앱을 만들어 주세요.',
  say1: '싱가포르에 공개 웹 스토어를 그립니다. 앞단에 ESA와 WAF를 적용한 ALB, Auto Scaling이 붙은 ECS 웹 서버, Tair 캐시, RDS를 둡니다.',
  say1b: '세션은 Tair에, 주문은 RDS에 저장하고 둘 다 두 가용 영역에 걸쳐 둡니다.',
  exposure: '외부 공개',
  exposureAlt: '내부 전용',
  region: '싱가포르 리전',
  regionAlt: '홍콩 리전',
  askScale: '가장 바쁜 날 쇼핑객이 얼마나 될 것으로 예상하시나요?',
  scaleOpts: ['쇼핑객 10,000명 미만', '쇼핑객 약 100,000명', '쇼핑객 100만 명 이상'],
  askWhere: '지금 Alibaba Cloud 밖에서 운영 중인 시스템이 있나요?',
  whereOpts: ['아니요, 신규 구축입니다', '예, 온프레미스입니다', '예, 다른 클라우드입니다'],
  summary1: '싱가포르의 공개 웹 스토어: ESA, WAF를 적용한 ALB, Auto Scaling이 붙은 ECS, Tair 캐시, RDS.',
  say2: '쇼핑객이 약 100,000명이면 세일 피크에 맞춰 Auto Scaling을 키우고 주문 DB에 읽기 복제본을 추가합니다.',
  req2: '가장 바쁜 날 쇼핑객 약 100,000명',
  scalingWhy: '쇼핑객 약 100,000명과 세일 피크에 맞춰 확장합니다.',
  replicaLabel: '읽기 복제본',
  replicaWhy: '주문 조회를 맡아 주 인스턴스는 쓰기에 집중합니다.',
  summary2: '쇼핑객 약 100,000명 기준: 피크용 Auto Scaling과 RDS 읽기 복제본.',
  say3: '내부 전용으로 바꿉니다. 공개 엣지를 없애고 직원은 비공개 연결로 ALB에 접속합니다.',
  req3: '내부 전용, 외부 접근 없음',
  usersLabel: '직원',
  usersWhy: '사내 네트워크에서 스토어를 쓰는 직원과 파트너.',
  internetLabel: '사내 네트워크',
  summary3: '내부 전용 스토어: 공개 엣지 없이 직원이 비공개 연결로 WAF가 적용된 ALB에 접속.',
  vpnLabel: '비공개 접속',
  vSay1: '설계를 좌우하는 두 가지가 아직 불분명해서, 그리기 전에 먼저 여쭙니다.',
  vAskWhat: '클라우드에서 가장 먼저 운영할 것은 무엇인가요?',
  vWhatOpts: ['웹사이트 또는 온라인 스토어', '사내 업무 앱', '데이터 및 분석', 'AI 어시스턴트'],
  vAskWho: '누가 사용하나요?',
  vWhoOpts: ['인터넷의 고객', '직원만 사용'],
  vSummary1: '아직 그린 것 없음: 무엇을 만들지, 누가 쓸지 확인 중.',
  vSay2: '웹 스토어로 진행하겠습니다. 싱가포르의 공개 사이트로 그립니다. 앞단에 ESA와 WAF를 적용한 ALB, Auto Scaling이 붙은 ECS 웹 서버, Tair 캐시, RDS를 둡니다.',
  vAsk1: '회사에 클라우드가 필요합니다.',
  nodes: {
    users: { label: '쇼핑객', why: '온라인 스토어를 둘러보는 쇼핑객.' },
    dns: { label: 'Cloud DNS', why: '스토어 도메인을 ESA 엣지 노드로 연결합니다.' },
    esa: { label: 'ESA', why: '정적 자산을 캐싱하고 동남아 전역에서 동적 페이지를 가속합니다.' },
    alb: { label: 'ALB', why: '두 가용 영역에 트래픽을 분산해 고가용성을 확보합니다.' },
    waf: { label: 'WAF', why: '앱에 닿기 전에 OWASP 공격과 봇을 차단합니다.' },
    app: { label: '웹 서버', why: '두 가용 영역에서 스토어 애플리케이션을 실행합니다.' },
    scaling: { label: 'Auto Scaling', why: '대규모 세일 피크 때 인스턴스를 자동으로 늘립니다.' },
    cache: { label: '세션 캐시', why: '가용 영역 단위 HA로 장바구니와 세션을 빠르게 유지합니다.' },
    db: { label: '주문 DB', why: '두 번째 가용 영역의 대기 복제본과 함께 주문을 저장합니다.' },
    media: { label: '상품 이미지', why: 'ESA가 엣지에서 제공하는 상품 이미지를 저장합니다.' },
    logs: { label: '로그', why: '로그와 알림을 한곳에 모아 스토어 상태를 모니터링합니다.' },
  },
  groups: { internet: '인터넷', edge: '엣지', sg: 'Singapore (ap-southeast-1)', vpc: '스토어 VPC' },
};

const COPY: Record<Lang, Copy> = { en: EN, ko: KO };

/** The "Change" follow-up the console sends for an assumption chip: the same template as asm.changeAsk in strings.json. */
const changeAsk = (lang: Lang, c: Copy): string => (lang === 'ko' ? `변경: ${c.exposure} 대신 ${c.exposureAlt}` : `Change: ${c.exposureAlt} instead of ${c.exposure}`);

// ---------- composing a turn ----------

const words = (s: string): string[] => s.split(/(?<=[\s,.:;])/u).filter(Boolean);

/** Partial say events (cumulative text) ending at `at`, then the final one. */
function sayEvents(text: string, id: number, at: number): Array<[number, Wire]> {
  const parts = text.includes(' ') ? words(text) : [...text];
  const n = Math.min(7, parts.length);
  const out: Array<[number, Wire]> = [];
  for (let i = 1; i < n; i++) {
    const upto = Math.round((parts.length * i) / n);
    out.push([at - (n - i) * 150, { type: 'say', id, text: parts.slice(0, upto).join(''), final: false, phase: 'main' }]);
  }
  out.push([at, { type: 'say', id, text, final: true, phase: 'main' }]);
  return out;
}

interface Composed {
  turn: FixtureTurn;
  memory: SessionMemory;
}

interface TurnSpec {
  prev: SessionMemory;
  ask: string;
  items: Item[];
  summary: string;
  /** The compact change line the server keeps in the memory's assistant turn. */
  changes: string;
  /** Assumption ids the server drops this turn because a pinned requirement settled them. */
  settled?: string[];
}

function compose(spec: TurnSpec): Composed {
  const { prev } = spec;
  const ctx = createCtx();
  let graph: Graph = prev.graph;
  const tombstones = [...prev.tombstones];
  const requirements = [...prev.requirements];
  const assumes = new Map((prev.assumptions ?? []).map((a) => [a.id, a]));
  const questions: NonNullable<SessionMemory['questions']> = [];
  const says: string[] = [];
  const ev: Array<[number, Wire]> = [];
  let seq = 0;
  let sayId = 0;
  let last = 0;
  const items = [...spec.items].sort((a, b) => a.at - b.at);
  for (const { at, op } of items) {
    if (op.t === 'say') {
      ev.push(...sayEvents(op.text, sayId++, at));
      says.push(op.text);
    }
    let added: string[] = [];
    let updated: string[] = [];
    let removed: string[] = [];
    if (op.t === 'assume') assumes.set(op.id, op.alt ? { id: op.id, text: op.text, alt: op.alt } : { id: op.id, text: op.text });
    else if (op.t === 'ask') questions.push(op.options ? { id: op.id, text: op.text, options: op.options } : { id: op.id, text: op.text });
    else {
      if (op.t === 'req' && !requirements.includes(op.text)) requirements.push(op.text);
      const r = applyOp(graph, op, ctx);
      const bad = r.warnings.filter((w) => w.severity !== 'info');
      if (bad.length) throw new Error(`ask fixtures: ${op.t} ${'id' in op ? op.id : ''} gave ${bad.map((w) => `${w.code}: ${w.msg}`).join('; ')}`);
      graph = r.graph;
      tombstones.push(...r.tombstones);
      ({ added, updated, removed } = r);
    }
    ev.push([at, { type: 'op', seq: ++seq, op, added, updated, removed, phase: 'main' }]);
    last = Math.max(last, at);
  }
  for (const id of spec.settled ?? []) assumes.delete(id);
  const doneAt = last + 380;
  ev.push([doneAt, { type: 'op', seq: ++seq, op: { t: 'done', summary: spec.summary }, added: [], updated: [], removed: [], phase: 'main' }]);
  ev.push([
    doneAt + 5,
    {
      type: 'done',
      summary: spec.summary,
      timings: { headersMs: 0, firstByteMs: 0, firstContentMs: 0, firstSayMs: 1, firstOpMs: 1, firstNodeMs: 1, lastOpMs: 3, totalMs: 3, maxGapMs: 0, hedgeAtMs: null },
      finishReason: 'stop',
      truncated: false,
      phase: 'main',
    },
  ]);
  const turns: Turn[] = [...prev.turns, { role: 'user', text: spec.ask }, { role: 'assistant', text: says.join('\n'), changes: spec.changes }];
  const memory: SessionMemory = { turns, requirements, graph, tombstones };
  if (assumes.size) memory.assumptions = [...assumes.values()];
  if (questions.length) memory.questions = questions;
  ev.push([doneAt + 30, { type: 'commit', memory, changes: spec.changes, warnings: [] } as unknown as Wire]);
  ev.sort((a, b) => a[0] - b[0]);
  return { turn: { ask: spec.ask, ev: ev as FixtureTurn['ev'] }, memory };
}

// ---------- the drawing: the recorded "ha" store, with this copy ----------

function drawing(ha: Fixture, c: Copy): Item[] {
  const out: Item[] = [];
  for (const [at, e] of ha.turns[0].ev) {
    if (e.type !== 'op') continue;
    const op = e.op;
    if (op.t === 'say' || op.t === 'done') continue;
    if (op.t === 'node') out.push({ at, op: { ...op, label: c.nodes[op.id]?.label ?? op.label, why: c.nodes[op.id]?.why ?? op.why } });
    else if (op.t === 'group') out.push({ at, op: { ...op, label: c.groups[op.id] ?? op.label } });
    else out.push({ at, op });
  }
  return out;
}

const SAY1_AT = 1700;
const SAY1B_AT = 12219;
const ASK_AT = 16700;

const CHANGES1 = ha1Changes();
function ha1Changes(): string {
  return '+internet[external] +edge[edge] +sg[region] +vpc[vpc] +users(users) +dns(dns) +esa(esa) +alb(alb, zones a,b) +waf(waf, badge on alb) +app(ecs, zones a,b) +scaling(ess, badge on app) +cache(tair, zones a,b) +db(rds, zones a,b) +media(oss) +logs(sls) +e-users-dns +e-users-esa +e-esa-alb +e-alb-app +e-app-cache +e-app-db +e-esa-media +e-app-logs';
}

const emptyMemory = (): SessionMemory => ({ turns: [], requirements: [], graph: emptyGraph(), tombstones: [] });

function assumeOps(c: Copy, at: number): Item[] {
  return [
    { at, op: { t: 'assume', id: 'exposure', text: c.exposure, alt: c.exposureAlt } },
    { at: at + 280, op: { t: 'assume', id: 'region', text: c.region, alt: c.regionAlt } },
  ];
}

function storeTurn(ha: Fixture, c: Copy, prev: SessionMemory, ask: string, say: string, withSecondAsk: boolean, summary: string): Composed {
  const items: Item[] = [
    { at: SAY1_AT, op: { t: 'say', text: say } },
    ...assumeOps(c, SAY1_AT + 60),
    ...drawing(ha, c),
    { at: SAY1B_AT, op: { t: 'say', text: c.say1b } },
    { at: ASK_AT, op: { t: 'ask', id: 'scale', text: c.askScale, options: c.scaleOpts } },
  ];
  if (withSecondAsk) items.push({ at: ASK_AT + 300, op: { t: 'ask', id: 'where', text: c.askWhere, options: c.whereOpts } });
  return compose({ prev, ask, items, summary, changes: CHANGES1 });
}

function shopFixture(ha: Fixture, lang: Lang): Fixture {
  const c = COPY[lang];
  const t1 = storeTurn(ha, c, emptyMemory(), c.ask1, c.say1, true, c.summary1);

  const t2 = compose({
    prev: t1.memory,
    ask: c.scaleOpts[1],
    summary: c.summary2,
    changes: '~scaling +replica(rds, zone b) +e-db-replica',
    items: [
      { at: 1500, op: { t: 'say', text: c.say2 } },
      { at: 2100, op: { t: 'req', text: c.req2 } },
      { at: 3100, op: { t: 'node', id: 'scaling', product: 'ess', label: c.nodes.scaling.label, group: 'vpc', attachTo: 'app', why: c.scalingWhy } },
      { at: 4300, op: { t: 'node', id: 'replica', product: 'rds', label: c.replicaLabel, group: 'vpc', zones: ['b'], why: c.replicaWhy } },
      { at: 5000, op: { t: 'edge', id: 'e-db-replica', from: 'db', to: 'replica', label: lang === 'ko' ? '복제' : 'replication' } },
    ],
  });

  const t3 = compose({
    prev: t2.memory,
    ask: changeAsk(lang, c),
    summary: c.summary3,
    changes: '-esa -edge -dns ~internet ~users +e-users-alb +e-app-media -e-users-dns -e-users-esa -e-esa-alb -e-esa-media',
    settled: ['exposure'],
    items: [
      { at: 1500, op: { t: 'say', text: c.say3 } },
      { at: 2100, op: { t: 'req', text: c.req3 } },
      { at: 3000, op: { t: 'remove', id: 'esa' } },
      { at: 3500, op: { t: 'remove', id: 'edge' } },
      { at: 4000, op: { t: 'remove', id: 'dns' } },
      { at: 4500, op: { t: 'group', id: 'internet', kind: 'external', label: c.internetLabel, parent: null } },
      { at: 5000, op: { t: 'node', id: 'users', product: 'users', label: c.usersLabel, group: 'internet', why: c.usersWhy } },
      { at: 5500, op: { t: 'edge', id: 'e-users-alb', from: 'users', to: 'alb', label: c.vpnLabel } },
      { at: 6000, op: { t: 'edge', id: 'e-app-media', from: 'app', to: 'media', label: lang === 'ko' ? '이미지' : 'images' } },
    ],
  });

  const id = lang === 'en' ? 'asks-shop' : 'asks-shop-ko';
  return {
    id,
    title: lang === 'en' ? 'Web shop: assumes public-facing, asks about scale, then a Change' : '웹 쇼핑몰: 외부 공개를 가정하고 규모를 묻고, 가정을 변경',
    lang,
    recordedAt: '2026-10-31',
    source: 'composed by apps/web/scripts/replay/ask-fixtures.ts from the recorded "ha" turn; the assume and ask ops are hand-written',
    model: 'qwen3.8-max',
    note: 'Synthetic. Draw first, then ask: two assume ops (public-facing, Singapore) and two ask ops after the drawing. Turn 2 answers the scale question with its option. Turn 3 is the Change on the public-facing chip: the requirement pins and the chip goes.',
    synthetic: true,
    turns: [t1.turn, t2.turn, t3.turn],
  };
}

function vagueFixture(ha: Fixture, lang: Lang): Fixture {
  const c = COPY[lang];
  const t1 = compose({
    prev: emptyMemory(),
    ask: c.vAsk1,
    summary: c.vSummary1,
    changes: '',
    items: [
      { at: 1500, op: { t: 'say', text: c.vSay1 } },
      { at: 2100, op: { t: 'ask', id: 'what', text: c.vAskWhat, options: c.vWhatOpts } },
      { at: 2500, op: { t: 'ask', id: 'who', text: c.vAskWho, options: c.vWhoOpts } },
    ],
  });
  const t2 = storeTurn(ha, c, t1.memory, c.vWhatOpts[0], c.vSay2, false, c.summary1);
  const id = lang === 'en' ? 'asks-vague' : 'asks-vague-ko';
  return {
    id,
    title: lang === 'en' ? '"We need cloud": asks before drawing anything' : '"클라우드가 필요합니다": 그리기 전에 먼저 질문',
    lang,
    recordedAt: '2026-10-31',
    source: 'composed by apps/web/scripts/replay/ask-fixtures.ts from the recorded "ha" turn; the assume and ask ops are hand-written',
    model: 'qwen3.8-max',
    note: 'Synthetic. A request too vague to pick any pattern: two ask ops and no nodes. Turn 2 answers with an option and draws a web store with two assumptions and one question.',
    synthetic: true,
    turns: [t1.turn, t2.turn],
  };
}

/** The four ask fixtures (two scenarios, English and Korean), built from the recorded "ha" fixture. */
export function askFixtures(ha: Fixture): Fixture[] {
  return [shopFixture(ha, 'en'), vagueFixture(ha, 'en'), shopFixture(ha, 'ko'), vagueFixture(ha, 'ko')];
}

// ---------- npm run replay:asks: rewrites only these fixtures and their manifest entries (no eval results needed) ----------

export function manifestEntry(fx: Fixture): Record<string, unknown> {
  return {
    id: fx.id,
    title: fx.title,
    lang: fx.lang,
    recordedAt: fx.recordedAt,
    synthetic: fx.synthetic,
    turns: fx.turns.length,
    ask: fx.turns[0].ask,
    durationMs: fx.turns.reduce((s, t) => s + (t.ev[t.ev.length - 1]?.[0] ?? 0), 0),
    note: fx.note,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src/replay/fixtures');
  const ha = JSON.parse(readFileSync(path.join(dir, 'ha.json'), 'utf8')) as Fixture;
  const fixtures = askFixtures(ha);
  const indexPath = path.join(dir, 'index.json');
  const manifest = (JSON.parse(readFileSync(indexPath, 'utf8')) as Array<{ id: string }>).filter((m) => !fixtures.some((f) => f.id === m.id));
  for (const fx of fixtures) {
    writeFileSync(path.join(dir, `${fx.id}.json`), JSON.stringify(fx));
    manifest.push(manifestEntry(fx) as { id: string });
    process.stdout.write(`  ${fx.id}: ${fx.turns.length} turns\n`);
  }
  writeFileSync(indexPath, JSON.stringify(manifest, null, 1));
}
