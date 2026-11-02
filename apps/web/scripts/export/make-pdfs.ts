// Generates the sample proposals (English, Korean, Chinese, plus a product-need answer), each without and with a drafted
// narrative (scripts/export/drafts/, one of them long), reads each one back with pdf.js and checks it (checks.ts),
// renders every page to PNG, and times a 25-plus-card diagram against the 3 s budget.
//   npm run export:samples            (in apps/web)
// Output: screenshots/export/samples/<id>.pdf and <id>-pNN.png. Exit code 1 when a check fails or the budget is missed.
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { generateProposalPdf } from '../../src/export/generate.ts';
import { nodeFontSource } from '../../src/export/fonts-node.ts';
import { avoidRoute, catalog, loadDraft, logoFor, playFixture } from './node-env.ts';
import { bigGraph } from './big.ts';
import { checkPdf } from './checks.ts';
import { renderPdf } from './inspect.ts';

const OUT = new URL('../../screenshots/export/samples/', import.meta.url);
mkdirSync(OUT, { recursive: true });
const path = (u: URL): string => fileURLToPath(u);

const SAMPLES = [
  { id: 'sample-en', fixture: 'residency', lang: 'en' as const, title: 'Customer portal for a Singapore fintech', customer: 'Acme Pay Pte Ltd' },
  { id: 'sample-ko', fixture: 'korean', lang: 'ko' as const, title: '음식 배달 앱 백엔드 제안서', customer: '한빛푸드' },
  { id: 'sample-zh', fixture: 'chinese', lang: 'zh' as const, title: '外卖应用后端架构方案', customer: '星河餐饮有限公司' },
  { id: 'sample-en-solution-map', fixture: 'ai-agent', lang: 'en' as const, title: 'An AI coding agent for 15 developers', customer: '' },
  // with a drafted narrative: the business sections first, the technical record after
  { id: 'draft-en', fixture: 'residency', lang: 'en' as const, title: 'Customer portal for a Singapore fintech', customer: 'Acme Pay Pte Ltd', draft: 'residency-en' },
  { id: 'draft-ko', fixture: 'korean', lang: 'ko' as const, title: '음식 배달 앱 백엔드 제안서', customer: '한빛푸드', draft: 'korean-ko' },
  { id: 'draft-zh', fixture: 'chinese', lang: 'zh' as const, title: '外卖应用后端架构方案', customer: '星河餐饮有限公司', draft: 'chinese-zh' },
  { id: 'draft-en-long', fixture: 'ecommerce', lang: 'en' as const, title: 'Cross-border e-commerce for Southeast Asia', customer: 'Lumen Retail Group', draft: 'ecommerce-en-long' },
] as Array<{ id: string; fixture: string; lang: 'en' | 'ko' | 'zh'; title: string; customer: string; draft?: string }>;

let failed = false;
const rows: string[] = [];

for (const s of SAMPLES) {
  const state = playFixture(s.fixture, s.lang).getState();
  const draft = s.draft ? loadDraft(s.draft) : null;
  const result = await generateProposalPdf({
    session: state.session,
    graph: state.display.graph,
    layout: state.display.layout,
    catalog,
    lang: s.lang,
    title: s.title,
    customer: s.customer,
    now: new Date(2026, 9, 31, 12),
    fontSource: nodeFontSource(),
    route: avoidRoute,
    logo: logoFor(s.lang),
    draft,
  });
  writeFileSync(new URL(`${s.id}.pdf`, OUT), result.bytes);
  const check = await checkPdf(result.bytes, state, { title: s.title, customer: s.customer, draft });
  const pngs = await renderPdf(result.bytes, OUT, s.id, 1.5);
  const r = result.report;
  rows.push(
    `${s.id.padEnd(24)} ${check.ok ? 'PASS' : 'FAIL'}  pages ${r.pages} (landscape ${check.summary.landscape.join(',')}; diagram on ${r.diagramPage?.size} at ${r.diagramPage?.scale})  ` +
      `products ${check.summary.names}  links ${check.summary.links}/${check.summary.expectedLinks}  no-docs ${check.summary.missingDocs}  ` +
      `${(result.bytes.length / 1024).toFixed(0)} KB  fonts ${r.faces} faces ${(r.fontBytes / 1024).toFixed(0)} KB  ${r.totalMs} ms (${r.router} ${r.routeMs} ms, draw ${r.drawMs} ms)  png ${pngs.length}`,
  );
  if (!check.ok) {
    failed = true;
    for (const p of check.problems) rows.push(`    - ${p}`);
  }
}

// ---- speed: a 25-plus-card diagram, three runs, the slowest counts ----
{
  const state = playFixture('ecommerce', 'en').getState();
  const { graph, layout } = bigGraph(state, 26);
  const cards = Object.keys(layout.cards).length;
  const times: number[] = [];
  let last: Awaited<ReturnType<typeof generateProposalPdf>> | null = null;
  for (let i = 0; i < 3; i++) {
    last = await generateProposalPdf({
      session: state.session,
      graph,
      layout,
      catalog,
      lang: 'en',
      title: 'Large design',
      customer: '',
      now: new Date(2026, 9, 31, 12),
      fontSource: nodeFontSource(),
      route: avoidRoute,
      logo: logoFor('en'),
    });
    times.push(last.report.totalMs);
  }
  const worst = Math.max(...times);
  writeFileSync(new URL('sample-en-large.pdf', OUT), last!.bytes);
  const pngs = await renderPdf(last!.bytes, OUT, 'sample-en-large', 1.5);
  rows.push(`speed: ${cards} cards, ${Object.keys(graph.edges).length} edges, ${last!.report.pages} pages: ${times.join(', ')} ms (budget 3000) -> ${worst < 3000 ? 'PASS' : 'FAIL'}; diagram on ${last!.report.diagramPage?.size} at ${last!.report.diagramPage?.scale}; png ${pngs.length}`);
  if (worst >= 3000 || cards < 25) failed = true;
}

console.log(rows.join('\n'));
console.log('output:', path(OUT));
process.exit(failed ? 1 : 0);
