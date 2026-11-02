// Proposals from live drafts: plays each session eval/proposal/run.ts recorded (its turns' wire events, through the app's
// reducer, as a replay does), lays the PDF out with the drafted narrative from eval/proposal/out/<id>.json, checks it
// (checks.ts) and renders every page to PNG. --basic <id> also writes that session's PDF without a draft, for comparison.
//   node --import ./scripts/alias.mjs scripts/export/draft-pdfs.ts [id ...] [--basic <id>]      (in apps/web)
// Output: eval/proposal/pdf/<id>/<id>.pdf and page-NN.png. Exit code 1 when a check fails.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import type { ProposalDraft } from '@ali/core/types.ts';
import { generateProposalPdf } from '../../src/export/generate.ts';
import { nodeFontSource } from '../../src/export/fonts-node.ts';
import { createInitialState } from '../../src/store/reducer.ts';
import { createStore } from '../../src/store/store.ts';
import { play } from '../../src/test/fixtures.ts';
import type { Fixture, FixtureTurn } from '../../src/replay/plan.ts';
import { avoidRoute, catalog, logoFor } from './node-env.ts';
import { checkPdf } from './checks.ts';
import { renderPdf } from './inspect.ts';

const ROOT = path.resolve(import.meta.dirname, '../../../..');
const EVAL = path.join(ROOT, 'eval/proposal');

const COVER: Record<string, { title: string; customer: string }> = {
  'en-flashsale': { title: 'Flash-sale-ready storefront in Jakarta', customer: 'Nusantara Mart' },
  'en-thin': { title: 'Web application on Alibaba Cloud', customer: '' },
  'ko-game': { title: '글로벌 모바일 게임 출시 아키텍처', customer: '블루웨일 게임즈' },
  'en-hybrid': { title: 'Managed MySQL in Jakarta for an AWS estate', customer: 'Kirana Logistics' },
  'en-ai': { title: 'Internal agent platform in Singapore', customer: 'Straits Commerce Bank' },
  'zh-crossborder': { title: '东南亚跨境电商平台方案', customer: '海拓跨境' },
  'en-flashsale-backup': { title: 'Flash-sale-ready storefront in Jakarta', customer: 'Nusantara Mart' },
};

const args = process.argv.slice(2);
const basic = new Set<string>();
const ids: string[] = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--basic') basic.add(args[++i]);
  else ids.push(args[i]);
}
if (!ids.length) ids.push('en-flashsale', 'en-thin', 'ko-game', 'en-hybrid', 'en-ai', 'zh-crossborder');

let failed = false;
const jobs: Array<{ id: string; session: string; draft: boolean }> = [
  ...ids.map((id) => ({ id, session: id.replace(/-backup$/, ''), draft: true })),
  ...[...basic].map((id) => ({ id: `${id}-basic`, session: id, draft: false })),
];
for (const job of jobs) {
  const saved = JSON.parse(readFileSync(path.join(EVAL, 'sessions', `${job.session}.json`), 'utf8')) as { turns?: FixtureTurn[] };
  if (!saved.turns?.length) throw new Error(`${job.session}: the session has no recorded turns (re-run eval/proposal/run.ts)`);
  const outFile = path.join(EVAL, 'out', `${job.id.replace(/-basic$/, '')}.json`);
  const out = existsSync(outFile) ? (JSON.parse(readFileSync(outFile, 'utf8')) as { lang: 'en' | 'ko' | 'zh'; draft: ProposalDraft | null }) : null;
  const lang = out?.lang ?? 'en';
  const draft = job.draft ? (out?.draft ?? null) : null;
  if (job.draft && !draft) {
    console.log(`${job.id}: no draft in ${outFile}`);
    failed = true;
    continue;
  }
  const fx: Fixture = { id: job.session, title: job.session, lang, recordedAt: '', source: 'eval/proposal', model: '', note: '', synthetic: false, turns: saved.turns };
  const store = createStore(catalog, createInitialState({ lang, canvas: { w: 1040, h: 800 }, id: 'export-' + job.session, now: 0 }));
  play(store, fx);
  const state = store.getState();
  const cover = COVER[job.id.replace(/-basic$/, '')] ?? { title: job.id, customer: '' };
  const result = await generateProposalPdf({
    session: state.session,
    graph: state.display.graph,
    layout: state.display.layout,
    catalog,
    lang,
    title: cover.title,
    customer: cover.customer,
    now: new Date(2026, 9, 31, 12), // the date checks.ts expects on the cover
    fontSource: nodeFontSource(),
    route: avoidRoute,
    logo: logoFor(lang),
    draft,
  });
  const dir = path.join(EVAL, 'pdf', job.id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, `${job.id}.pdf`), result.bytes);
  const check = await checkPdf(result.bytes, state, { title: cover.title, customer: cover.customer, draft });
  const pngs = await renderPdf(result.bytes, pathToFileURL(dir + '/'), 'page', 1.5);
  console.log(`${job.id.padEnd(22)} ${check.ok ? 'PASS' : 'FAIL'}  pages ${result.report.pages}  cards ${Object.keys(state.display.layout?.cards ?? {}).length}  png ${pngs.length}  ${dir}`);
  if (!check.ok) {
    failed = true;
    for (const p of check.problems) console.log(`    - ${p}`);
  }
}
process.exit(failed ? 1 : 0);
