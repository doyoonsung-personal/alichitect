// What a proposal PDF must contain, checked by reading the file back with pdf.js (not by trusting the generator): the
// page count and orientations, the extractable text (cover words, every product name, page numbers and the catalog date
// on every page), and the link annotations (one per product with a documentation URL, none invented).
import type { AppState } from '../../src/store/types.ts';
import { buildProposal } from '../../src/export/model.ts';
import type { ProposalModel } from '../../src/export/model.ts';
import { makeXT } from '../../src/export/strings.ts';
import { catalog } from './node-env.ts';
import { inspectPdf } from './inspect.ts';
import type { PdfInfo } from './inspect.ts';

const squash = (s: string): string => s.replace(/\s+/g, '').normalize('NFC');

export interface CheckResult {
  ok: boolean;
  problems: string[];
  info: PdfInfo;
  model: ProposalModel;
  summary: { pages: number; landscape: number[]; links: number; expectedLinks: number; missingDocs: number; names: number };
}

export async function checkPdf(bytes: Uint8Array, state: AppState, o: { title?: string; customer?: string } = {}): Promise<CheckResult> {
  const model = buildProposal({ session: state.session, graph: state.display.graph, layout: state.display.layout, catalog, lang: state.lang, title: o.title ?? '', customer: o.customer ?? '', now: new Date(2026, 9, 31, 12) });
  const xt = makeXT(state.lang);
  const info = await inspectPdf(bytes);
  const problems: string[] = [];
  const all = squash(info.text);
  const total = info.pages.length;

  // pages: cover, summary, diagram (landscape), components, [recommendations], connections, revisions
  const wantPages = 5 + (model.components.length ? 1 : 0) + (model.recs.length ? 1 : 0);
  if (total < wantPages) problems.push(`expected at least ${wantPages} pages, got ${total}`);
  const landscape = info.pages.filter((p) => p.width > p.height).map((p) => p.n);
  if (landscape.length !== 1 || landscape[0] !== 3) problems.push(`the diagram must be the only landscape page, page 3 (landscape pages: ${landscape.join(',') || 'none'})`);

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

  // content: every product name, every section heading
  for (const c of model.components) if (!all.includes(squash(c.name))) problems.push(`product name missing from the text: ${c.name}`);
  for (const key of ['summary.heading', 'diagram.heading', 'components.heading', 'conn.heading', 'rev.heading'] as const) {
    if (!all.includes(squash(xt(key)))) problems.push(`heading missing: ${xt(key)}`);
  }
  for (const r of model.revisions) if (!all.includes(squash(r.ask.slice(0, 40)))) problems.push(`revision ${r.n}'s ask is missing`);
  if (model.components.length && !all.includes(squash(xt('components.role')))) problems.push('"Role in this design" label is missing');
  if (model.components.length && !all.includes(squash(xt('components.what')))) problems.push('"What it does" label is missing');

  // links: exactly the catalog's documentation URLs
  const wantLinks = model.components.map((c) => c.docs).filter((d): d is string => !!d).concat(model.recs.map((r) => r.docs).filter((d): d is string => !!d));
  const missing = model.components.filter((c) => !c.docs).length + model.recs.filter((r) => !r.docs).length;
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

  return {
    ok: problems.length === 0,
    problems,
    info,
    model,
    summary: { pages: total, landscape, links: info.links.length, expectedLinks: wantLinks.length, missingDocs: missing, names: model.components.length },
  };
}
