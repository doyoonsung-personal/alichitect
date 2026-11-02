// Live check of the proposal writer (packages/core/src/proposal.ts) against the real Model Studio API.
//
//   node eval/proposal/run.ts --id ticketing --ask "first message" [--correct "answer to the first assumption"] [--ask "..."] [--lang en|ko|zh]
//   node eval/proposal/run.ts --session eval/proposal/sessions/ticketing.json [--lang ko] [--id ticketing-ko]
//
// The first form builds a session by running real turns (the local server's executeTurn over core runTurn, exactly as
// the product does) for each --ask in order; --correct sends the assumption editor's correction of the session's first standing assumption ("About the
// assumption “...”: <answer>", the web app's asm.answerAsk wording), so a draft can be checked against a correction. The
// session memory and each turn's wire events go to eval/proposal/sessions/<id>.json. Then draftProposal runs on it and the draft, the sections in
// arrival order (with ms), the statuses and the stats go to eval/proposal/out/<id>.json; the exec text is printed.
// The second form redrafts a saved session without new turns; given --ask/--correct as well, it runs those turns on the
// saved session first (and saves it under --id). --assumption N corrects the Nth standing assumption instead of the first;
// --no-draft stops after saving the session.
// --customer and --title fill the cover fields.
//
// --force-backup (eval only, needs --backup): the first Model Studio call is cut after its second complete line and
// answers with Model Studio's content-filter error event, so the backup path runs live once. Nothing in packages/ or
// apps/ can reach this switch.
//
// DASHSCOPE_API_KEY is read from the environment and never printed or written. With --backup, ANTHROPIC_API_KEY attaches
// the Claude backup (it runs only when Model Studio's content filter stops the draft). Every call is booked in
// eval/results/ledger.jsonl under the label "proposal-<id>".
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCatalog } from '../../packages/core/src/catalog-node.ts';
import { buildSystemPrompt, createMemory } from '../../packages/core/src/prompt.ts';
import { createCacheTracker, DEFAULT_BASE_URL, DEFAULT_MODEL, FALLBACK_MODEL } from '../../packages/core/src/llm.ts';
import { constraintChecker } from '../../packages/core/src/validate.ts';
import { executeTurn } from '../../apps/server/src/turn.ts';
import type { WireEvent } from '../../apps/server/src/turn.ts';
import { claudeBackupConfig, createClaudeBackup } from '../../packages/core/src/claude.ts';
import { draftProposal } from '../../packages/core/src/proposal.ts';
import type { ProposalRequest, ProposalSection, SessionMemory } from '../../packages/core/src/types.ts';
import { appendLedger } from '../lib.ts';

const DIR = path.dirname(fileURLToPath(import.meta.url));

interface Step {
  kind: 'ask' | 'correct';
  text: string;
}

function parseArgs(argv: string[]): { steps: Step[]; flags: Record<string, string | boolean> } {
  const steps: Step[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const next = argv[i + 1];
    const value = next === undefined || next.startsWith('--') ? true : (i++, next);
    if ((a === '--ask' || a === '--correct') && typeof value === 'string') steps.push({ kind: a === '--ask' ? 'ask' : 'correct', text: value });
    else flags[a.slice(2)] = value;
  }
  return { steps, flags };
}

const str = (v: string | boolean | undefined): string | undefined => (typeof v === 'string' ? v : undefined);

async function main(): Promise<void> {
  const { steps, flags } = parseArgs(process.argv.slice(2));
  const apiKey = process.env.DASHSCOPE_API_KEY ?? '';
  if (!apiKey) throw new Error('DASHSCOPE_API_KEY is not set');
  const catalog = loadCatalog();
  const lang = (str(flags.lang) ?? 'en') as ProposalRequest['lang'];
  const sessionFile = str(flags.session);
  const id = str(flags.id) ?? (sessionFile ? `${path.basename(sessionFile, '.json')}-${lang}` : `draft-${Date.now()}`);
  const label = `proposal-${id}`;
  const book = (model: string, phase: string, costUsd: number, usage: unknown, estimated = false): void =>
    appendLedger({ ts: new Date().toISOString(), label, model, phase, costUsd, estimated, usage, case: id });

  let memory: SessionMemory;
  let priorSteps: Step[] = [];
  const turns: Array<{ ask: string; ev: Array<[number, WireEvent]> }> = [];
  if (sessionFile) {
    const saved = JSON.parse(readFileSync(sessionFile, 'utf8')) as { steps?: Step[]; memory: SessionMemory; turns?: typeof turns };
    memory = saved.memory;
    priorSteps = saved.steps ?? [];
    turns.push(...(saved.turns ?? []));
  } else {
    if (!steps.length) throw new Error('give at least one --ask, or --session <file>');
    memory = createMemory();
  }
  if (steps.length) {
    const tracker = createCacheTracker();
    const system = buildSystemPrompt(catalog);
    const nth = Math.max(1, Number(str(flags.assumption) ?? 1)) - 1;
    for (const s of steps) {
      let ask = s.text;
      if (s.kind === 'correct') {
        const a = (memory.assumptions ?? [])[nth];
        if (!a) throw new Error(`--correct: the session has no standing assumption #${nth + 1} to correct`);
        ask = `About the assumption “${a.text}”: ${s.text}`;
        s.text = ask;
      }
      console.log(`\n> ${ask}`);
      // The server's own turn (apps/server executeTurn over core runTurn), so the wire events are kept: the web export
      // plays them through the app's reducer to rebuild the diagram (apps/web/scripts/export/draft-pdfs.ts).
      const ev: Array<[number, WireEvent]> = [];
      const t0 = Date.now();
      let committed: SessionMemory | null = null;
      const o = await executeTurn(
        { sessionId: id, ask, memory },
        { apiKey, catalog, system, model: DEFAULT_MODEL, fallbackModel: FALLBACK_MODEL, baseUrl: DEFAULT_BASE_URL, tracker, checkConstraints: constraintChecker },
        (e) => {
          ev.push([Date.now() - t0, e]);
          if (e.type === 'commit') committed = e.memory;
        },
        new AbortController().signal,
      );
      if (o.stats) book(o.stats.model, 'turn', o.stats.costUsd + o.summaryCostUsd, { prompt_tokens: o.stats.promptTokens, completion_tokens: o.stats.completionTokens });
      if (o.outcome !== 'commit' || !committed) throw new Error(`turn ended with ${o.outcome} ${o.fatalCode ?? ''}`);
      memory = committed;
      turns.push({ ask, ev });
      console.log(`  ${(o.says ?? []).join(' ').slice(0, 300)}`);
      console.log(`  nodes: ${o.nodes}; assumptions: ${(memory.assumptions ?? []).map((a, i) => `#${i + 1} ${a.text}`).join(' | ')}`);
    }
    mkdirSync(path.join(DIR, 'sessions'), { recursive: true });
    writeFileSync(path.join(DIR, 'sessions', `${id}.json`), JSON.stringify({ steps: [...priorSteps, ...steps], memory, turns }, null, 2));
  }

  if (flags['no-draft']) return;
  const cfg = flags.backup ? claudeBackupConfig(process.env) : undefined;
  const backup = cfg ? createClaudeBackup(cfg) : null;
  const req: ProposalRequest = { sessionId: id, lang, title: str(flags.title) ?? '', customer: str(flags.customer) ?? '', memory };
  const t0 = Date.now();
  const backupSpent = { costUsd: 0, prompt: 0, completion: 0 };
  const sections: Array<{ ms: number; section: ProposalSection }> = [];
  const statuses: Array<{ ms: number; code: string }> = [];
  if (flags['force-backup'] && !backup) throw new Error('--force-backup needs --backup and ANTHROPIC_API_KEY');
  const r = await draftProposal(req, catalog, {
    apiKey,
    backup,
    fetchImpl: flags['force-backup'] ? filterFirstCallAfter(2) : undefined,
    onBackupCall: (c) => {
      backupSpent.costUsd += c.costUsd;
      backupSpent.prompt += c.usage?.prompt_tokens ?? 0;
      backupSpent.completion += c.usage?.completion_tokens ?? 0;
      book(c.model, 'proposal-backup', c.costUsd, c.usage, c.estimated);
    },
    onSection: (s) => sections.push({ ms: Date.now() - t0, section: s }),
    onStatus: (code) => {
      statuses.push({ ms: Date.now() - t0, code });
      console.log(`  [status] ${code}`);
    },
  });
  // Qwen calls are booked as one line: draftProposal's totals include the backup's calls, which were booked above as
  // they ended, so those are taken out here.
  book(r.stats.model, 'proposal', r.stats.costUsd - backupSpent.costUsd, { prompt_tokens: r.stats.promptTokens - backupSpent.prompt, completion_tokens: r.stats.completionTokens - backupSpent.completion });
  mkdirSync(path.join(DIR, 'out'), { recursive: true });
  writeFileSync(path.join(DIR, 'out', `${id}.json`), JSON.stringify({ id, lang, customer: req.customer, title: req.title, outcome: r.outcome, error: r.error, stats: r.stats, statuses, draft: r.draft, sections }, null, 2));
  console.log(`\n${r.outcome}${r.error ? ` (${r.error.code})` : ''}: ${r.stats.sections} sections, ${r.stats.rejectedLines} rejected, ${r.stats.calls} calls, ${(r.stats.ms / 1000).toFixed(1)} s, $${r.stats.costUsd.toFixed(4)}; first section at ${sections[0]?.ms ?? '-'} ms; missing: ${r.stats.missing.join(', ') || 'none'}`);
  if (r.draft) console.log(`\nEXEC:\n${r.draft.exec}\n\nNEEDS:\n${r.draft.needs.map((n) => `- [${n.source}] ${n.need}${n.quote ? ` ("${n.quote}")` : ''}\n  -> ${n.answer}`).join('\n')}`);
}

/**
 * Eval-only fetch for --force-backup: the first call streams through until its content holds `lines` complete lines, then
 * ends with Model Studio's content-filter error event (the shape llm.ts reads mid-stream); later calls pass through.
 */
function filterFirstCallAfter(lines: number): typeof fetch {
  let calls = 0;
  return async (input, init) => {
    const res = await fetch(input, init);
    if (++calls > 1 || !res.ok || !res.body) return res;
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    const enc = new TextEncoder();
    const sse = (j: unknown): Uint8Array => enc.encode(`data: ${JSON.stringify(j)}\n\n`);
    let buf = '';
    let content = '';
    let done = false;
    const body = new ReadableStream<Uint8Array>({
      async pull(ctl) {
        if (done) return;
        const { value, done: end } = await reader.read();
        if (end) {
          if (buf) ctl.enqueue(enc.encode(buf));
          return ctl.close();
        }
        buf += dec.decode(value, { stream: true }).replace(/\r\n/g, '\n');
        let i: number;
        while (!done && (i = buf.indexOf('\n\n')) >= 0) {
          const ev = buf.slice(0, i + 2);
          buf = buf.slice(i + 2);
          let delta = '';
          try {
            const j = JSON.parse(ev.replace(/^data: ?/, '').trim()) as { choices?: Array<{ delta?: { content?: string } }> };
            delta = j.choices?.[0]?.delta?.content ?? '';
          } catch {
            /* [DONE] or a keep-alive */
          }
          const before = content.length;
          content += delta;
          if (content.split('\n').length - 1 < lines) {
            ctl.enqueue(enc.encode(ev));
            continue;
          }
          // Keep this event's text up to the end of the last wanted line, then the filter error.
          let cut = -1;
          for (let n = 0; n < lines; n++) cut = content.indexOf('\n', cut + 1);
          const keep = content.slice(before, cut + 1);
          if (keep) ctl.enqueue(sse({ choices: [{ index: 0, delta: { content: keep } }] }));
          ctl.enqueue(sse({ error: { code: 'DataInspectionFailed', message: 'Output data may contain inappropriate content.' } }));
          ctl.enqueue(enc.encode('data: [DONE]\n\n'));
          done = true;
          void reader.cancel();
          ctl.close();
        }
      },
      cancel() {
        void reader.cancel();
      },
    });
    return new Response(body, { status: res.status, headers: res.headers });
  };
}

main().catch((e: unknown) => {
  console.error(String((e as Error)?.message ?? e));
  process.exit(1);
});
