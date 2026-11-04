// The proposal as data (pure): everything the PDF prints, assembled from the session record, the drawn graph and the
// catalog. Nothing here draws or measures. Names, reasons, prices and links come from the same builders the console,
// the canvas popover and the products panel use, so the document says what the screen says. A drafted narrative
// (POST /api/proposal), when there is one, adds the business "why" on top; without one the model is exactly as before.
import type { Catalog, CatalogEntry, Graph, NeedSource, ProposalDraft, SessionMemory } from '@ali/core/types.ts';
import { estimateWorkflow } from '@ali/core/workflow-estimate.ts';
import { pricingDesignKey, type SolutionEstimate } from '@ali/core/solution-pricing.ts';
import { workflowPanelOrder } from '../workflow/panel-model.ts';
import type { WorkflowLayoutState } from '@ali/core/workflow-layout.ts';
import type { WorkflowEstimate } from '@ali/core/workflow-estimate.ts';
import { createModelTable } from '@ali/core/models.ts';
import type { ModelFile } from '@ali/core/models.ts';
import modelFile from '@ali/catalog/models.json' with { type: 'json' };
import type { LayoutState } from '@ali/core/layout.ts';
import { regionLabel } from '@ali/core/regions.ts';
import type { Lang } from '../i18n/t.ts';
import { makeT } from '../i18n/t.ts';
import { deploymentNotices } from '../workflow/deployment-notices.ts';
import { cautionOf, entryFor } from '../canvas/scene.ts';
import { lineView } from '../console/logic.ts';
import { buildPanelModel } from '../panel/model.ts';
import type { PanelRow } from '../panel/model.ts';
import { requirementViews } from '../store/requirements.ts';
import type { ChangeLine, ReqState, Revision, SessionRecord } from '../store/types.ts';
import { makeXT } from './strings.ts';
import type { XT } from './strings.ts';

export type { XT };

export interface ProposalInput {
  session: SessionRecord;
  /** The graph the diagram shows (the committed one). */
  graph: Graph;
  layout: LayoutState | null;
  workflowLayout?: WorkflowLayoutState;
  catalog: Catalog;
  lang: Lang;
  /** Cover title; empty falls back to the session title, then to "Untitled architecture". */
  title?: string;
  /** Customer name; empty leaves the line out. */
  customer?: string;
  now: Date;
  /** The drafted narrative; null or absent prints the document without it. */
  draft?: ProposalDraft | null;
}

export interface RequirementItem {
  text: string;
  state: ReqState;
  /** "Held", "Not met in revision 3" ... */
  stateText: string;
  pinned: string;
}

export interface SummaryModel {
  narration: string;
  facts: string;
  requirements: RequirementItem[];
  assumptions: Array<{ text: string; alt?: string }>;
  /** One line per pinned region list and per ruled-out product list. */
  constraints: string[];
  questions: Array<{ text: string; options: string[] }>;
}

export interface RoleLine {
  /** The card label, when the product appears more than once and the lines need telling apart. */
  label?: string;
  /** The model's reason; empty when it gave none. */
  why: string;
  /** Where it sits: the frame group, zones, or the host. */
  where: string;
}

export interface ComponentEntry {
  /** First node or recommendation id that draws it: the key for tests and links. */
  id: string;
  product: string;
  /** Official full name. */
  name: string;
  /** Catalog short name. */
  short: string;
  /** The card label, when it differs from the short name. */
  label?: string;
  category: string;
  roles: RoleLine[];
  /** The catalog's purpose, in our own words. */
  what: string;
  /** Lifecycle and availability caution with the catalog's note, or null. */
  notes: string | null;
  /** "<summary>, as of <date>". Null when the catalog has no price. */
  price: string | null;
  /** An https link to the official documentation, or null when the catalog has none yet. */
  docs: string | null;
  fit?: 'primary' | 'complement';
  addedIn?: number;
  /** Why it is in this design for this customer, from the drafted narrative. Present only with a draft. */
  draftWhy?: string;
  /** Not a product (users, a mobile app, a data center): its entry has no documentation row. Present only with a draft. */
  construct?: boolean;
}

export interface RecEntry {
  product: string;
  name: string;
  fit: 'primary' | 'complement';
  fitText: string;
  why: string;
  price: string | null;
  docs: string | null;
  /** The drafted why for this customer. Present only with a draft. */
  draftWhy?: string;
}

export interface NeedItem {
  need: string;
  source: NeedSource;
  /**
   * The customer's words in quotation marks (marked "original wording" when they are in another language than the
   * document), "Implied by what you described", or "Typical for businesses like yours".
   */
  sourceText: string;
  answer: string;
  /** Official names of the products in the design that answer it. */
  products: string[];
}

/** The drafted narrative, ready to print: the business case first, the honest trade-offs and next steps after. */
export interface NarrativeModel {
  /** Executive summary paragraphs. */
  exec: string[];
  outcomes: Array<{ title: string; text: string }>;
  needs: NeedItem[];
  tradeoffs: Array<{ text: string; mitigation?: string }>;
  next: string[];
  /**
   * Fewer than half of the needs are the customer's own words (a one-line request, say): the needs page is headed as
   * what businesses like theirs usually need, not "What you told us".
   */
  mostlyTypical: boolean;
  /** Invites the reader to size the solution when there is no estimate or published component rate. */
  pricingNote: string | null;
}

export interface ConnectionRow {
  from: string;
  to: string;
  label: string;
  kind: 'data' | 'async' | 'control' | 'resolve';
  kindText: string;
}

export interface RevisionEntry {
  n: number;
  ask: string;
  askLang: string;
  status: Revision['status'];
  note: string;
  changes: Array<{ mark: 'plus' | 'minus' | 'arrow' | 'ring' | 'info'; text: string; struck: boolean }>;
  drawn: string | null;
  applied: boolean;
}

export interface WorkflowProposalModel {
  steps: Array<{ id: string; label: string; text: string }>;
  cost: WorkflowEstimate;
  costTitle: string;
  mapping: Array<{ id: string; label: string; runtime: string; service: string; on?: string }>;
  mappingTitle: string;
  openQuestions: Array<{ source: 'assumption' | 'question' | 'boundary'; text: string; options: string[] }>;
  questionsTitle: string;
}

export interface ProposalModel {
  lang: Lang;
  title: string;
  customer: string;
  /** yyyy-mm-dd, in the viewer's time zone. */
  date: string;
  dateText: string;
  catalogDate: string;
  mode: 'architecture' | 'solution' | 'empty';
  /** Revisions that were drawn (status done) and products drawn, for the cover's title block. */
  revisionsDone: number;
  productCount: number;
  summary: SummaryModel;
  components: ComponentEntry[];
  recs: RecEntry[];
  gaps: Array<{ need: string; note: string }>;
  connections: ConnectionRow[];
  revisions: RevisionEntry[];
  /** Present only when a drafted narrative was given. */
  narrative?: NarrativeModel;
  /** Generated workflow data; phase 7b supplies the PDF layout. */
  workflow?: WorkflowProposalModel;
  pricing?: { stale: true } | { stale: false; estimate: SolutionEstimate; interpretation?: string };
}

const pad = (n: number): string => String(n).padStart(2, '0');
export const isoDate = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function longDate(d: Date, lang: Lang): string {
  try {
    return new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : lang === 'ko' ? 'ko-KR' : 'en-GB', { dateStyle: 'long' }).format(d);
  } catch {
    return isoDate(d);
  }
}

/** The default cover title: the session title (the first ask) cut to a readable length. */
export function defaultTitle(session: SessionRecord, xt: XT): string {
  const raw = (session.title || session.revisions[0]?.ask || '').replace(/\s+/g, ' ').trim();
  if (!raw) return xt('doc.untitled');
  const chars = Array.from(raw);
  // an ask of several sentences: the first one is the title when it is long enough to name the design
  const sentence = /^(.{10,100}?[.!?。！？])(?:\s+|(?=\S))/u.exec(raw)?.[1];
  if (sentence && sentence.length < raw.length - 1) return sentence.replace(/[.。]$/u, '');
  if (chars.length <= 90) return raw;
  // cut at a word boundary when there is one near the end, else at the limit
  const cut = chars.slice(0, 90).join('');
  const space = cut.lastIndexOf(' ');
  return (space > 55 ? cut.slice(0, space) : cut).replace(/[\s,;:.\-–—]+$/, '') + '…';
}

function reqStateText(state: ReqState, rev: number | null, xt: XT): string {
  switch (state) {
    case 'held':
      return xt('req.held');
    case 'repaired':
      return xt('req.heldByFix', { n: rev ?? 1 });
    case 'broken':
      return xt('req.notMet', { n: rev ?? 1 });
    case 'atRisk':
      return xt('req.atRisk', { n: rev ?? 1 });
    case 'checking':
      return xt('req.checking');
  }
}

const priceText = (e: CatalogEntry | undefined, xt: XT): string | null => (e?.price ? xt('components.priceAsOf', { summary: e.price.summary, date: e.price.asOf }) : null);

function docsOf(row: { docs?: string }): string | null {
  return row.docs ?? null;
}

function connectionKinds(xt: XT): Record<ConnectionRow['kind'], string> {
  return { data: xt('conn.kind.data'), async: xt('conn.kind.async'), control: xt('conn.kind.control'), resolve: xt('conn.kind.resolve') };
}

export function buildProposal(i: ProposalInput): ProposalModel {
  const { session, graph, layout, catalog, lang } = i;
  const xt = makeXT(lang);
  const t = makeT(lang);
  const mem = session.memory;
  const title = (i.title ?? '').trim() || defaultTitle(session, xt);

  // ---- components: one entry per product, in the reading order of the products panel ----
  const panel = buildPanelModel(graph, layout, catalog, t, session.provenance);
  const solution = layout?.mode === 'solution';
  const order: string[] = [];
  const byProduct = new Map<string, ComponentEntry>();
  for (const g of panel.groups) {
    for (const row of g.rows) {
      const e = entryFor(catalog, row.product);
      const role: RoleLine = {
        label: row.label,
        why: row.whyIsCatalog ? '' : row.why,
        where: roleWhere(row, g.label),
      };
      const have = byProduct.get(row.product);
      if (have) {
        have.roles.push(role);
        if (have.addedIn === undefined || (row.addedIn !== undefined && row.addedIn < have.addedIn)) have.addedIn = row.addedIn;
        continue;
      }
      order.push(row.product);
      byProduct.set(row.product, {
        id: row.id,
        product: row.product,
        name: row.fullName,
        short: row.name,
        label: row.label,
        category: e?.category ?? '',
        roles: [role],
        what: e?.purpose ?? '',
        notes: cautionOf(e, lang),
        price: priceText(e, xt),
        docs: docsOf(row),
        fit: row.fit,
        addedIn: row.addedIn,
      });
    }
  }
  for (const n of Object.values(mem.workflow?.nodes ?? {})) {
    for (const product of [n.product, n.runs]) {
      if (!product || product === 'customer' || byProduct.has(product)) continue;
      const e = catalog.byId.get(product);
      if (!e || e.kind === 'construct') continue;
      order.push(product);
      byProduct.set(product, {
        id: n.id, product, name: e.name, short: e.short, category: e.category,
        roles: [], what: e.purpose, notes: cautionOf(e, lang), price: priceText(e, xt), docs: safeHttps(e.docs),
      });
    }
  }
  const components = order.map((p) => byProduct.get(p)!);

  // ---- recommendations (product-need answers) ----
  const recs: RecEntry[] = [...graph.recs]
    .sort((a, b) => (a.fit === b.fit ? 0 : a.fit === 'primary' ? -1 : 1))
    .map((r) => {
      const e = entryFor(catalog, r.product);
      return {
        product: r.product,
        name: e?.name ?? r.product,
        fit: r.fit,
        fitText: xt(r.fit === 'primary' ? 'components.fit.primary' : 'components.fit.complement'),
        why: r.why.trim(),
        price: priceText(e, xt),
        docs: docsOf({ docs: panel.rows.find((x) => x.product === r.product)?.docs }),
      };
    });
  // docs for a rec whose product has no panel row is read straight from the catalog
  for (const r of recs) {
    if (!r.docs) {
      const row = panel.rows.find((x) => x.product === r.product);
      r.docs = row?.docs ?? safeHttps(entryFor(catalog, r.product)?.docs);
    }
  }
  const gaps = new Map<string, { need: string; note: string }>();
  for (const rev of session.revisions) for (const l of rev.changes) if (l.kind === 'gap' && l.need) gaps.set(l.need, { need: l.need, note: l.note ?? '' });

  // ---- connections ----
  const kinds = connectionKinds(xt);
  const connections: ConnectionRow[] = panel.edges.map((e) => ({ from: e.from, to: e.to, label: e.label ?? '', kind: e.kind, kindText: kinds[e.kind] }));

  // ---- summary ----
  const first = session.revisions.find((r) => r.status === 'done') ?? session.revisions[0];
  const reqs = requirementViews(session, null);
  const requirements: RequirementItem[] = reqs.map((r) => ({
    text: r.text,
    state: r.state,
    stateText: reqStateText(r.state, r.stateRev, xt),
    pinned: xt('summary.pinnedIn', { n: r.pinnedIn }),
  }));
  const constraints: string[] = [];
  for (const r of reqs) {
    if (r.regions.length) constraints.push(xt('summary.staysIn', { regions: r.regions.map(regionLabel).join(', ') }));
    if (r.avoid.length) constraints.push(xt('summary.ruledOut', { products: r.avoid.map((p) => entryFor(catalog, p)?.name ?? p).join(', ') }));
  }
  const products = panel.rows.length;
  const doneRevs = session.revisions.filter((r) => r.status === 'done').length;
  const summary: SummaryModel = {
    narration: (first?.note ?? '').trim(),
    facts: xt('summary.facts', { products, connections: Object.keys(graph.edges).length, revisions: doneRevs }),
    requirements,
    assumptions: (mem.assumptions ?? []).map((a) => ({ text: a.text, alt: a.alt })),
    constraints: [...new Set(constraints)],
    questions: (mem.questions ?? []).map((q) => ({ text: q.text, options: q.options ?? [] })),
  };

  // ---- revisions ----
  const revisions: RevisionEntry[] = session.revisions.map((r) => {
    const lines: ChangeLine[] = [...r.changes, ...r.fix.changes];
    const applied = r.status === 'done';
    return {
      n: r.n,
      ask: r.ask.trim(),
      askLang: r.askLang,
      status: r.status,
      note: r.note.trim(),
      changes: lines.map((l) => {
        const v = lineView(l, t);
        return { mark: v.mark, text: v.text, struck: v.struck };
      }),
      drawn: applied && r.durationMs !== null ? xt('rev.drawnIn', { s: (r.durationMs / 1000).toFixed(1) }) : null,
      applied,
    };
  });

  // ---- the drafted narrative ----
  const workflow = buildWorkflow(mem, catalog, xt, i.draft, i.workflowLayout);
  if (workflow) {
    for (const text of deploymentNotices(mem, catalog, t)) workflow.openQuestions.push({ source: 'question', text, options: [] });
  }
  const narrative = i.draft ? buildNarrative(i.draft, components, recs, xt, lang) : null;
  const pricing = session.pricing;
  if ((pricing || workflow) && narrative) narrative.pricingNote = null;
  if (i.draft) {
    for (const c of components) {
      const w = i.draft.why[c.product]?.trim();
      if (w) c.draftWhy = w;
      if (entryFor(catalog, c.product)?.kind === 'construct') c.construct = true;
    }
    for (const r of recs) {
      const w = i.draft.why[r.product]?.trim();
      if (w) r.draftWhy = w;
    }
  }

  return {
    lang,
    title,
    customer: (i.customer ?? '').trim(),
    date: isoDate(i.now),
    dateText: longDate(i.now, lang),
    catalogDate: catalog.version,
    mode: !workflow && components.length === 0 && recs.length === 0 ? 'empty' : solution ? 'solution' : 'architecture',
    revisionsDone: doneRevs,
    productCount: workflow ? new Set([...components.map((c) => c.product), ...recs.map((r) => r.product)]).size : products,
    summary,
    components,
    recs,
    gaps: [...gaps.values()],
    connections,
    revisions,
    ...(narrative ? { narrative } : {}),
    ...(workflow ? { workflow } : {}),
    ...(pricing ? { pricing: pricing.designKey !== pricingDesignKey(mem)
      ? { stale: true as const }
      : { stale: false as const, estimate: pricing.estimate, interpretation: i.draft?.cost } } : {}),
  };
}

function buildWorkflow(mem: SessionMemory, catalog: Catalog, xt: XT, draft?: ProposalDraft | null,
  layout?: WorkflowLayoutState): WorkflowProposalModel | null {
  const wf = mem.workflow;
  if (!wf || !Object.keys(wf.nodes).length) return null;
  const nodes = workflowPanelOrder(wf, layout);
  const name = (id: string | undefined): string => id === 'customer'
    ? xt('workflow.customerRuntime') : id ? catalog.byId.get(id)?.name ?? id : xt('workflow.unspecified');
  const openQuestions: WorkflowProposalModel['openQuestions'] = [
    ...(mem.assumptions ?? []).map((a) => ({
      source: 'assumption' as const, text: xt('workflow.confirm', { text: a.text }), options: a.alt ? [a.text, a.alt] : [],
    })),
    ...(mem.questions ?? []).map((q) => ({ source: 'question' as const, text: q.text, options: q.options ?? [] })),
    ...(['workflow.fields', 'workflow.identity', 'workflow.retention'] as const).map((key) => ({
      source: 'boundary' as const, text: xt(key), options: [],
    })),
  ];
  return {
    steps: nodes.filter((n) => !n.on && n.kind !== 'trigger' && n.kind !== 'end').map((n) => ({
      id: n.id, label: n.label, text: draft?.steps?.[n.id]?.trim() ?? '',
    })),
    cost: estimateWorkflow(wf, createModelTable(modelFile as ModelFile), catalog, mem.estimate),
    costTitle: xt('workflow.cost'),
    mapping: nodes.filter((n) => n.kind !== 'end').map((n) => ({
      id: n.id, label: n.label, runtime: name(n.runs), service: name(n.product), ...(n.on ? { on: n.on } : {}),
    })),
    mappingTitle: xt('workflow.mapping'),
    openQuestions,
    questionsTitle: xt('workflow.questions'),
  };
}

const paragraphs = (text: string): string[] =>
  text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
const oneLine = (text: string): string => text.replace(/\s+/g, ' ').trim();

/** The script a text is written in, as far as the document languages go: Hangul, Han (with no Hangul), or other. */
function scriptOf(text: string): Lang {
  if (/[가-힯ᄀ-ᇿ㄰-㆏]/u.test(text)) return 'ko';
  if (/[一-鿿㐀-䶿]/u.test(text)) return 'zh';
  return 'en';
}

/** The draft as printable parts. A need names only products that are in the design, by their official names. */
function buildNarrative(d: ProposalDraft, components: ComponentEntry[], recs: RecEntry[], xt: XT, lang: Lang): NarrativeModel {
  const names = new Map<string, string>();
  for (const r of recs) names.set(r.product, r.name);
  for (const c of components) names.set(c.product, c.name);
  const sourceText = (n: ProposalDraft['needs'][number]): string => {
    if (n.source === 'stated') {
      const q = oneLine(n.quote ?? '');
      if (!q) return xt('needs.stated');
      // a Korean quote under Chinese text (or the other way round) is marked as the customer's original wording; the
      // need line above it carries its meaning in the document's language
      const foreign = scriptOf(q) !== lang && (scriptOf(q) !== 'en' || lang === 'en');
      return xt(foreign ? 'needs.quoteOriginal' : 'needs.quote', { quote: q });
    }
    return xt(n.source === 'inferred' ? 'needs.inferred' : 'needs.general');
  };
  const priced = components.some((c) => c.price) || recs.some((r) => r.price);
  const needs = d.needs.filter((n) => n.need.trim() && n.answer.trim());
  return {
    exec: paragraphs(d.exec),
    outcomes: d.outcomes.map((o) => ({ title: oneLine(o.title), text: oneLine(o.text) })).filter((o) => o.title && o.text),
    needs: needs
      .map((n) => ({
        need: oneLine(n.need),
        source: n.source,
        sourceText: sourceText(n),
        answer: oneLine(n.answer),
        products: [...new Set(n.products)].map((p) => names.get(p)).filter((x): x is string => !!x),
      })),
    tradeoffs: d.tradeoffs.filter((t) => t.text.trim()).map((t) => (t.mitigation?.trim() ? { text: oneLine(t.text), mitigation: oneLine(t.mitigation) } : { text: oneLine(t.text) })),
    next: d.next.map(oneLine).filter(Boolean),
    mostlyTypical: needs.filter((n) => n.source === 'stated').length * 2 < needs.length,
    pricingNote: priced ? null : xt('next.pricing'),
  };
}

function roleWhere(row: PanelRow, group: string): string {
  return [group, row.where && row.where !== group ? row.where : ''].filter(Boolean).join(' · ');
}

function safeHttps(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

/** Every string in the model, for the font loader's first pass and for tests. */
export function modelStrings(m: ProposalModel): string[] {
  const out: string[] = [];
  const walk = (v: unknown): void => {
    if (typeof v === 'string') out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(m);
  return out;
}
