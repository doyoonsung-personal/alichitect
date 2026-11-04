// What a proposal PDF must contain, checked by reading the file back with pdf.js (not by trusting the generator): the
// page count and orientations, the extractable text (cover words, every product name, page numbers and the catalog date
// on every page), and the link annotations (one per product with a documentation URL, none invented). With a drafted
// narrative it also checks the business sections and their order, that each need, quote and drafted reason made it into
// the text, and on every PDF that no text runs off the page or into the footer, and that no hidden word appears.
import type { ProposalDraft } from '@ali/core/types.ts';
import type { AppState } from '../../src/store/types.ts';
import { buildProposal } from '../../src/export/model.ts';
import type { ProposalModel } from '../../src/export/model.ts';
import { wt } from '../../src/export/workflow-strings.ts';
import { makeXT } from '../../src/export/strings.ts';
import type { ExportKey } from '../../src/export/strings.ts';
import { catalog } from './node-env.ts';
import { inspectPdf } from './inspect.ts';
import type { PdfInfo } from './inspect.ts';

const squash = (s: string): string => s.replace(/\s+/g, '').normalize('NFC');
/** The backup's vendor and model family, assembled so this file does not spell them (check-dist.mjs does the same). */
export const HIDDEN = new RegExp(['cl' + 'aude', 'anth' + 'ropic'].join('|'), 'i');
/** The pages' side margins and the footer rule (pdf.ts MARGIN and FOOTER_RULE_FROM_BOTTOM). */
const MARGIN = 48;
const FOOTER = 40;

export interface CheckResult {
  ok: boolean;
  problems: string[];
  info: PdfInfo;
  model: ProposalModel;
  summary: { pages: number; landscape: number[]; links: number; expectedLinks: number; missingDocs: number; names: number };
}

export async function checkPdf(bytes: Uint8Array, state: AppState, o: { title?: string; customer?: string; draft?: ProposalDraft | null } = {}): Promise<CheckResult> {
  const model = buildProposal({ session: state.session, graph: state.display.graph, layout: state.display.layout, catalog, lang: state.lang, title: o.title ?? '', customer: o.customer ?? '', now: new Date(2026, 9, 31, 12), draft: o.draft ?? null });
  const xt = makeXT(state.lang);
  const info = await inspectPdf(bytes);
  const problems: string[] = [];
  const all = squash(info.text);
  const total = info.pages.length;
  const n = model.narrative;

  // pages: cover, [executive summary, needs], summary or design record, diagram (landscape), components, [recommendations], [considerations], connections, revisions
  const landscape = info.pages.filter((p) => p.width > p.height).map((p) => p.n);
  // a section starts on the page whose heading band (under the running header) opens with its heading
  const top = (p: PdfInfo['pages'][number]): string =>
    squash(
      p.items
        .filter((it) => it.y > 80 && it.y < 140)
        .sort((a, b) => a.y - b.y || a.x - b.x)
        .map((it) => it.str)
        .join(''),
    );
  const firstPageWith = (text: string): number => info.pages.find((p) => p.n > 1 && top(p).startsWith(squash(text)))?.n ?? -1;
  const diagramPage = firstPageWith(xt('diagram.heading'));
  const cloud = Object.keys(state.display.graph.nodes).length > 0 || state.display.graph.recs.length > 0;
  if (!model.workflow && (landscape.length !== Number(cloud) || (cloud && landscape[0] !== diagramPage))) problems.push('Cloud diagram page missing or unexpected');

  // the sections, each on a later page than the one before
  const order: ExportKey[] = n
    ? [
        ...(n.exec.length || n.outcomes.length ? (['exec.heading'] as const) : []),
        ...(n.tradeoffs.length || n.next.length ? (['next.heading'] as const) : []),
        ...(n.needs.length ? ([n.mostlyTypical ? 'needs.headingTypical' : 'needs.heading'] as const) : []),
        ...(model.workflow || cloud ? (['diagram.heading'] as const) : []),
        ...(model.components.length ? (['components.heading'] as const) : []),
        ...(model.recs.length ? (['recs.heading'] as const) : []),
        ...(model.connections.length ? (['conn.heading'] as const) : []),
      ]
    : [...(model.summary.narration || model.summary.requirements.length || model.summary.constraints.length ||
        (!model.workflow && (model.summary.assumptions.length || model.summary.questions.length)) ? (['summary.heading'] as const) : []),
      ...(model.workflow || cloud ? (['diagram.heading'] as const) : []), ...(model.components.length ? (['components.heading'] as const) : []),
      ...(model.recs.length ? (['recs.heading'] as const) : []), ...(model.connections.length ? (['conn.heading'] as const) : []),
      ...(model.revisions.length ? (['rev.heading'] as const) : [])];
  const wf = model.workflow;
  const mapping = wf?.mapping.filter(r => r.runtime !== xt('workflow.unspecified') || r.service !== xt('workflow.unspecified')) ?? [];
  const questions = n ? [] : wf?.openQuestions.filter(q => q.source !== 'boundary') ?? [];
  const showCost = wf && !(n && model.pricing) && (wf.cost.lines.length || wf.cost.fixed.length || wf.cost.unpriced.length);
  const titles = order.flatMap((k) => k === 'diagram.heading' && model.workflow
    ? [firstPageWith(wt(state.lang, 'diagram.overview')) > 0 ? wt(state.lang, 'diagram.overview') : wt(state.lang, 'diagram.heading'),
      ...(wf?.steps.some(s => s.text) ? [wt(state.lang, 'steps.heading')] : []), ...(mapping.length ? [model.workflow.mappingTitle] : []),
      ...(showCost ? [model.workflow.costTitle] : []), ...(questions.length ? [model.workflow.questionsTitle] : [])] : [xt(k)]);
  const at = titles.map(title => title === xt('next.heading')
    ? info.pages.find(p => p.n > 1 && squash(p.text).includes(squash(title)))?.n ?? -1 : firstPageWith(title));
  titles.forEach((title, idx) => {
    if (at[idx] < 0) problems.push(`heading missing: ${title}`);
    else if (idx > 0 && (at[idx] < at[idx - 1] || (at[idx] === at[idx - 1] && title !== xt('next.heading')))) problems.push(`"${title}" (page ${at[idx]}) must come after "${titles[idx - 1]}" (page ${at[idx - 1]})`);
  });

  if (model.workflow) {
    if (!landscape.length) problems.push('Workflow requires diagram pages');
    const wf = model.workflow;
    for (const value of [...mapping.flatMap((r) => [r.id, r.label, r.runtime, r.service]), ...questions.map((q) => q.text),
      ...(showCost ? [wf.cost.coverage] : []), ...(showCost && wf.cost.unpriced.length ? [wt(state.lang, 'cost.unpriced')] : [])]) {
      if (!all.includes(squash(value.slice(0, 100))) || !all.includes(squash(value.slice(-100)))) {
        problems.push(`Workflow content missing: ${value.slice(0, 100)}`);
      }
    }
  }

  // cover
  const cover = squash(info.pages[0]?.text ?? '');
  for (const [what, text] of [
    ['title', model.title],
    ['preparedWith', xt('doc.preparedWith')],
    ['AI notice', xt('doc.aiNotice')],
    ['date', model.dateText],
  ] as const) {
    if (!cover.includes(squash(text))) problems.push(`cover is missing ${what}: "${text}"`);
  }
  if (o.customer && !cover.includes(squash(o.customer))) problems.push(`cover is missing the customer name "${o.customer}"`);

  // every page: page number and the catalog date
  info.pages.forEach((p) => {
    const t = squash(p.text);
    if (!t.includes(squash(xt('page.of', { n: p.n, total })))) problems.push(`page ${p.n} has no "${xt('page.of', { n: p.n, total })}"`);
    if (!t.includes(squash(xt('page.catalog', { date: model.catalogDate })))) problems.push(`page ${p.n} has no catalog date`);
  });

  // content: every product name, every revision's ask, the entry labels
  for (const c of model.components) if (!all.includes(squash(c.name))) problems.push(`product name missing from the text: ${c.name}`);
  if (!n) for (const r of model.revisions) if (!all.includes(squash(r.ask.slice(0, 40)))) problems.push(`revision ${r.n}'s ask is missing`);
  if (model.components.length && !all.includes(squash(xt(n ? 'components.why' : 'components.role')))) problems.push(`"${xt(n ? 'components.why' : 'components.role')}" label is missing`);
  if (model.components.length && !all.includes(squash(xt('components.what')))) problems.push('"What it does" label is missing');

  // the drafted narrative: what the business reader is there for must all be in the text
  if (n) {
    const has = (text: string): boolean => all.includes(squash(text.slice(0, 60)));
    n.exec.forEach((p, k) => !has(p) && problems.push(`executive summary paragraph ${k + 1} is missing`));
    for (const o2 of n.outcomes) if (!has(o2.title) || !has(o2.text)) problems.push(`outcome missing: ${o2.title}`);
    for (const need of n.needs) {
      if (!has(need.need) || !has(need.answer)) problems.push(`need missing: ${need.need.slice(0, 60)}`);
      if (!all.includes(squash(need.sourceText))) problems.push(`the source line of a need is missing: ${need.sourceText.slice(0, 60)}`);
    }
    for (const c of model.components) if (c.draftWhy && !has(c.draftWhy)) problems.push(`the drafted why for ${c.product} is missing`);
    for (const r of model.recs) if (r.draftWhy && !has(r.draftWhy)) problems.push(`the drafted why for recommendation ${r.product} is missing`);
    for (const t of n.tradeoffs) if (!has(t.text) || (t.mitigation && !has(t.mitigation))) problems.push(`trade-off missing: ${t.text.slice(0, 60)}`);
    n.next.forEach((s, k) => !has(s) && problems.push(`next step ${k + 1} is missing`));
  }

  // links: exactly the catalog's documentation URLs
  const wantLinks = model.components.map((c) => c.docs).filter((d): d is string => !!d).concat(model.recs.map((r) => r.docs).filter((d): d is string => !!d));
  // with a draft a construct (users, a mobile app) prints no documentation row at all
  const missing = model.components.filter((c) => !c.docs && !c.construct).length + model.recs.filter((r) => !r.docs).length;
  if (model.workflow) wantLinks.push(...[...new Set([...model.workflow.cost.lines, ...model.workflow.cost.fixed]
    .map((r) => r.source).filter((source) => /^https:\/\//.test(source)))].flatMap((source) =>
      info.links.filter((link) => link === source)));
  const have = [...info.links];
  for (const url of wantLinks) {
    const i = have.indexOf(url);
    if (i < 0) problems.push(`link annotation missing for ${url}`);
    else have.splice(i, 1);
  }
  if (have.length) problems.push(`links that no product asked for: ${have.join(', ')}`);
  if (missing && !all.includes(squash(xt('components.noDocs')))) problems.push('products without a docs URL must say "Documentation link not yet available"');
  for (const c of model.components) {
    const entry = catalog.byId.get(c.product);
    if (!entry?.docs && c.docs) problems.push(`a docs URL was invented for ${c.product}: ${c.docs}`);
  }

  // no overflow: every run of text inside the side margins, and nothing but the footer below the footer rule
  for (const p of info.pages) {
    const footer = [squash(xt('page.of', { n: p.n, total })), squash(xt('page.catalog', { date: model.catalogDate }))].join('');
    for (const it of p.items) {
      if (it.x < MARGIN - 1 || it.x + it.w > p.width - MARGIN + 1) problems.push(`page ${p.n}: text runs past the side margin: "${it.str.slice(0, 40)}" (x ${it.x.toFixed(0)}..${(it.x + it.w).toFixed(0)})`);
      if (it.y > p.height - FOOTER && !footer.includes(squash(it.str))) problems.push(`page ${p.n}: text below the footer rule: "${it.str.slice(0, 40)}"`);
      if (it.y > p.height) problems.push(`page ${p.n}: text off the page: "${it.str.slice(0, 40)}"`);
    }
  }

  // no orphaned sub-heading: the last line of content on a page is never one
  const subs = new Set((['exec.outcomes', 'next.tradeoffs', 'next.steps', 'summary.design', 'summary.requirements', 'summary.constraints', 'summary.assumptions', 'summary.questions', 'recs.gaps'] as const).map((k) => squash(xt(k))));
  for (const p of info.pages) {
    const body = p.items.filter((it) => it.y > 60 && it.y < p.height - FOOTER).sort((a, b) => a.y - b.y || a.x - b.x);
    const lastY = body.at(-1)?.y;
    const last = squash(body.filter((it) => Math.abs(it.y - (lastY ?? 0)) < 1).map((it) => it.str).join(''));
    if (subs.has(last)) problems.push(`page ${p.n} ends with the sub-heading "${last}"`);
  }

  // nothing names the backup that may have finished a draft
  if (HIDDEN.test(info.text) || HIDDEN.test(info.title)) problems.push('the text names a hidden word');

  return {
    ok: problems.length === 0,
    problems,
    info,
    model,
    summary: { pages: total, landscape, links: info.links.length, expectedLinks: wantLinks.length, missingDocs: missing, names: model.components.length },
  };
}
