// Checks of drafted proposals (eval/proposal/out/<id>.json) against the writing rules, with no network: the engine's
// own post-check (packages/core/src/proposal.ts lintSection) on every section as it arrived, plus the measures the
// business and honesty reviews asked for that are judged across a draft rather than per line.
//
//   node eval/proposal/checks.ts [id ...] [--dir out/before-review] [--json] [--lines]
//
// Per draft it prints: lint hits by rule (hard / soft) over the arrived sections; the share of why lines with a
// counterfactual tail ("Without it", "누락 시", "若缺失"; at most 30%); whether the first next step is homework
// ("Confirm ...") rather than the decision asked of the customer; 'stated' needs whose text shares no content word with
// their quote, or fewer than a quarter of its own (Latin script only); numbers in exec and needs that no customer message contains; raw region ids left.
// --lines prints each hit. Drafts written before run.ts saved the cover name are checked without the name rule.
// The lint hits on drafts the engine wrote are zero by construction (it refused those lines as they arrived): run it on
// out/before-review to see what the rules catch, and read stats.lint in each draft for what was refused while drafting. The session of a draft is sessions/<id>.json, or the session it was drafted from (SESSION_OF).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCatalog } from '../../packages/core/src/catalog-node.ts';
import { lintSection, proposalCtx } from '../../packages/core/src/proposal.ts';
import { customerWords } from '../../packages/core/src/proposal-prompt.ts';
import type { ProposalDraft, ProposalRequest, ProposalSection, SessionMemory } from '../../packages/core/src/types.ts';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const SESSION_OF: Record<string, string> = {
  'en-flashsale-backup': 'en-flashsale',
  'fashion-ko-final': 'fashion-ko',
  'fashion-zh': 'fashion-ko',
  'ticketing-en-2': 'ticketing-en',
  'ticketing-en-final': 'ticketing-en',
};

const COUNTERFACTUAL = /without (?:it|them|this)\b|누락 ?시|미적용 ?시|미도입 ?시|없으면|없다면|若缺失|若无|如果没有|缺少该/i;
const HOMEWORK = /^(?:Confirm|Provide|Share|Send|Tell us|확인|확정|제공|确认|提供)/i;
const REGION_ID = /\b(?:ap|cn|us|eu|me|na|sa)-[a-z]+-\d+\b/;
const STOP = new Set('the and for with that this your you our are was were have has from into over will can not but they them their its which what when where who how all any more most such than then there these those about also just only very much many each other some time sale sales need needs want wants must stay keep'.split(' '));

export interface DraftCheck {
  id: string;
  lang: string;
  sections: number;
  hard: Record<string, number>;
  soft: Record<string, number>;
  whyCounterfactual: { n: number; of: number };
  nextHomework: boolean;
  statedNoOverlap: string[];
  unsourcedNumbers: string[];
  regionIds: number;
  lines: string[];
}

const words = (s: string): Set<string> =>
  new Set(
    (s.toLowerCase().match(/[a-z0-9][a-z0-9-]{2,}/g) ?? [])
      .filter((w) => !STOP.has(w))
      .map((w) => (/^\d/.test(w) ? w : w.slice(0, 5))),
  );

export function checkDraft(id: string, out: { lang: ProposalRequest['lang']; customer?: string; draft: ProposalDraft | null; sections?: Array<{ section: ProposalSection }> }, memory: SessionMemory): DraftCheck {
  const catalog = loadCatalog();
  const ctx = proposalCtx({ sessionId: id, lang: out.lang, title: '', customer: out.customer ?? '', memory }, catalog);
  const r: DraftCheck = { id, lang: out.lang, sections: 0, hard: {}, soft: {}, whyCounterfactual: { n: 0, of: 0 }, nextHomework: false, statedNoOverlap: [], unsourcedNumbers: [], regionIds: 0, lines: [] };
  const arrived = out.sections?.map((x) => x.section) ?? [];
  r.sections = arrived.length;
  for (const s of arrived) {
    const p = lintSection(s, ctx);
    if (p) {
      const bag = p.level === 'hard' ? r.hard : r.soft;
      bag[p.rule] = (bag[p.rule] ?? 0) + 1;
      r.lines.push(`[${p.level} ${p.rule}] ${JSON.stringify(s).slice(0, 260)}`);
    }
    if (REGION_ID.test(JSON.stringify(s))) r.regionIds++;
  }
  const d = out.draft;
  if (!d) return r;
  const whys = Object.values(d.why);
  r.whyCounterfactual = { n: whys.filter((w) => COUNTERFACTUAL.test(w)).length, of: whys.length };
  r.nextHomework = !!d.next[0] && HOMEWORK.test(d.next[0].trim());
  const said = (memory.turns ?? []).filter((t) => t.role === 'user').map((t) => customerWords(t.text)).join('\n');
  for (const n of d.needs) {
    if (n.source !== 'stated' || !n.quote) continue;
    const latin = /^[\x00-\x7f“”‘’–—…]*$/.test(n.need + n.quote);
    if (!latin) continue;
    // the review's measure (one shared content word) passes "internal" in a long invented pain, so a stated need also
    // fails when under a quarter of its own content words come from the quote
    const q = words(n.quote);
    const own = [...words(n.need)];
    const shared = own.filter((w) => q.has(w)).length;
    if (!shared || shared / Math.max(1, own.length) < 0.25) r.statedNoOverlap.push(`${n.need} <- "${n.quote}"`);
  }
  const nums = [d.exec, ...d.needs.flatMap((n) => [n.need, n.answer])].join('\n').match(/\d+(?:[.,]\d+)?/g) ?? [];
  r.unsourcedNumbers = [...new Set(nums)].filter((x) => !said.includes(x));
  return r;
}

function sessionFor(id: string): SessionMemory | null {
  const f = path.join(DIR, 'sessions', `${SESSION_OF[id] ?? id}.json`);
  return existsSync(f) ? (JSON.parse(readFileSync(f, 'utf8')) as { memory: SessionMemory }).memory : null;
}

function main(): void {
  const args = process.argv.slice(2);
  const asJson = args.includes('--json');
  const showLines = args.includes('--lines');
  const at = args.indexOf('--dir');
  const dir = path.join(DIR, at >= 0 ? args[at + 1] : 'out');
  const ids = args.filter((a, i) => !a.startsWith('--') && !(at >= 0 && i === at + 1));
  const list = ids.length ? ids : readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5));
  const results: DraftCheck[] = [];
  for (const id of list) {
    const out = JSON.parse(readFileSync(path.join(dir, `${id}.json`), 'utf8'));
    const memory = sessionFor(id);
    if (!memory) {
      console.log(`${id}: no session`);
      continue;
    }
    results.push(checkDraft(id, out, memory));
  }
  if (asJson) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }
  const fmt = (o: Record<string, number>): string => Object.entries(o).map(([k, v]) => `${k} ${v}`).join(', ') || '-';
  for (const r of results) {
    const pct = r.whyCounterfactual.of ? Math.round((100 * r.whyCounterfactual.n) / r.whyCounterfactual.of) : 0;
    console.log(
      `${r.id} (${r.lang}, ${r.sections} sections): hard [${fmt(r.hard)}] soft [${fmt(r.soft)}] | why counterfactual ${r.whyCounterfactual.n}/${r.whyCounterfactual.of} (${pct}%) | next[0] homework ${r.nextHomework ? 'YES' : 'no'} | stated w/o overlap ${r.statedNoOverlap.length} | unsourced numbers ${r.unsourcedNumbers.join(' ') || '-'} | region ids ${r.regionIds}`,
    );
    if (showLines) {
      for (const l of r.lines) console.log(`    ${l}`);
      for (const l of r.statedNoOverlap) console.log(`    [stated-overlap] ${l}`);
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
