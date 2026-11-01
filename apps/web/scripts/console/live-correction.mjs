// Live check of the assumption editor against real Qwen: draw a brief that yields assumptions, open a chip, type a
// correction, and confirm the next revision applies it and does not re-guess an assumption on the same topic.
// Starts its own turn server (PORT 8790-8799, ALLOWED_ORIGINS for the Vite port) and its own Vite (5185-5199); both are
// stopped at the end. The model key is read from the environment by the server child only; nothing here prints it.
//   node scripts/console/live-correction.mjs [--runs 3] [--lang en] [--out screenshots/console/live]
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { freePort, startVite, launch, sleep, WEB } from './lib.mjs';

const args = process.argv.slice(2);
const arg = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const runs = Number(arg('--runs', '3'));
const lang = arg('--lang', 'en');
const outDir = path.resolve(WEB, arg('--out', 'screenshots/console/live'));
mkdirSync(outDir, { recursive: true });

// each run: a brief, and what the user types for the chip whose text matches (the first matching rule wins)
const RUNS = [
  { brief: 'A web shop for our online store, with a database.', pick: /public|exposure|facing|internet/i, answer: 'No, internal only: our staff reach it over a VPN and nothing is public' },
  { brief: 'A web shop for our online store, with a database.', pick: /user|shopper|visitor|traffic|scale|10k/i, answer: 'Around 300,000 shoppers on a busy day' },
  { brief: 'A booking website for a chain of dental clinics.', pick: /patient|user|scale|10k/i, answer: 'About 40,000 patients across 25 clinics' },
];

const VITE_PORT = await freePort(5185, 5199);
const SERVER_PORT = await freePort(8790, 8799);
const server = spawn(process.execPath, ['apps/server/src/main.ts'], {
  cwd: path.resolve(WEB, '../..'),
  env: { ...process.env, PORT: String(SERVER_PORT), ALLOWED_ORIGINS: `http://127.0.0.1:${VITE_PORT},http://localhost:${VITE_PORT}`, TURN_LOG: '0' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverOut = '';
server.stdout.on('data', (d) => (serverOut += String(d).replace(/key [^|\n]*/g, 'key ***')));
server.stderr.on('data', (d) => (serverOut += String(d).replace(/key [^|\n]*/g, 'key ***')));
for (let i = 0; i < 60; i++) {
  try {
    if ((await fetch(`http://127.0.0.1:${SERVER_PORT}/api/health`)).ok) break;
  } catch {
    /* not up yet */
  }
  await sleep(250);
}
const vite = await startVite(`http://127.0.0.1:${SERVER_PORT}`, new Set([SERVER_PORT]));
if (vite.port !== VITE_PORT) throw new Error(`vite took ${vite.port}, the server allows ${VITE_PORT}`);
const browser = await launch();
const report = [];

const norm = (s) => String(s).normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '');

async function oneRun(i) {
  const spec = RUNS[i % RUNS.length];
  const p = await browser.newPage();
  await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await p.evaluateOnNewDocument((l) => {
    try {
      localStorage.clear();
      localStorage.setItem('ab.lang', l);
    } catch {}
  }, lang);
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(vite.url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.waitForSelector('.brief__input', { timeout: 90000 });
  await sleep(500);
  const t0 = Date.now();
  await p.type('.brief__input', spec.brief);
  await p.keyboard.press('Enter');
  const done = (n) => p.waitForFunction((k) => { const r = window.__ab.store.getState().session.revisions; return r.length === k && ['done', 'failed', 'stopped'].includes(r[k - 1].status); }, { timeout: 240000, polling: 500 }, n);
  await done(1);
  await sleep(1200);
  const rev1 = await p.evaluate(() => {
    const s = window.__ab.store.getState();
    const r = s.session.revisions[0];
    return { status: r.status, assumes: r.assumes ?? [], reqs: r.reqs, nodes: Object.values(s.session.memory.graph.nodes).map((n) => n.product), edges: Object.keys(s.session.memory.graph.edges).length, memAssumptions: s.session.memory.assumptions ?? [], requirements: s.session.memory.requirements };
  });
  const chips = await p.$$eval('.asm__chip .asm__what', (els) => els.map((e) => e.textContent.trim()));
  const result = { run: i + 1, brief: spec.brief, rev1: { ...rev1, secs: Math.round((Date.now() - t0) / 100) / 10 }, chips, errors };
  if (rev1.status !== 'done' || !chips.length) {
    result.fail = rev1.status !== 'done' ? `revision 1 ${rev1.status}` : 'no assumption chips';
    await p.close();
    return result;
  }
  const idx = Math.max(0, chips.findIndex((c) => spec.pick.test(c)));
  const corrected = rev1.memAssumptions.find((a) => a.text === chips[idx]) ?? rev1.memAssumptions[idx];
  result.corrected = corrected;
  // open the chip and type the answer, the way a person does
  const btn = (await p.$$('.asm__chip .asm__btn'))[idx];
  await btn.click();
  await p.waitForSelector('.asm__chip[data-open] .asme__field');
  const focused = await p.evaluate(() => document.activeElement?.classList.contains('asme__field'));
  await p.screenshot({ path: path.join(outDir, `run${i + 1}-1-open.png`) });
  await p.type('.asme__field', spec.answer, { delay: 8 });
  await p.screenshot({ path: path.join(outDir, `run${i + 1}-2-typed.png`) });
  const t1 = Date.now();
  await p.keyboard.press('Enter');
  await done(2);
  await sleep(1500);
  const rev2 = await p.evaluate(() => {
    const s = window.__ab.store.getState();
    const r = s.session.revisions[1];
    const nodes = Object.values(s.session.memory.graph.nodes).map((n) => n.product);
    return { status: r.status, ask: r.ask, note: r.note, assumes: r.assumes ?? [], reqs: r.reqs, added: r.added, removed: r.removed, changes: r.changes.map((c) => `${c.kind} ${c.name}`), nodes, edges: Object.keys(s.session.memory.graph.edges).length, groups: Object.values(s.session.memory.graph.groups ?? {}).map((g) => g.label), fix: r.fix?.state, warnings: (r.commitWarnings ?? []).map((w) => `${w.severity} ${w.code}`), memAssumptions: s.session.memory.assumptions ?? [], requirements: s.session.memory.requirements, asks: r.asks ?? [] };
  });
  const chipsAfter = await p.$$eval('.asm__chip .asm__what', (els) => els.map((e) => e.textContent.trim()));
  await p.screenshot({ path: path.join(outDir, `run${i + 1}-3-after.png`) });
  const expectedAsk = `About the assumption “${corrected.text}”: ${spec.answer}`;
  const checks = {
    editorFocusedAtOnce: focused,
    askNamesTheAssumption: rev2.ask === expectedAsk,
    revision2Done: rev2.status === 'done',
    answerPinnedAsRequirement: rev2.reqs.length > 0 && rev2.requirements.length > rev1.requirements.length,
    noAssumeWithSameId: !rev2.assumes.some((a) => a.id === corrected.id),
    noNewAssumeOnTheTopic: !rev2.assumes.some((a) => norm(a.text).includes(norm(corrected.text)) || norm(corrected.text).includes(norm(a.text)) || (corrected.alt && norm(a.text).includes(norm(corrected.alt)))),
    correctedChipGone: !chipsAfter.includes(corrected.text) && !rev2.memAssumptions.some((a) => a.id === corrected.id),
    diagramChanged: rev2.added + rev2.removed + rev2.changes.length > 0,
  };
  result.rev2 = { ...rev2, secs: Math.round((Date.now() - t1) / 100) / 10 };
  result.chipsAfter = chipsAfter;
  result.checks = checks;
  result.pass = Object.values(checks).every(Boolean);
  await p.close();
  return result;
}

try {
  for (let i = 0; i < runs; i++) {
    process.stdout.write(`run ${i + 1}/${runs} ...\n`);
    const r = await oneRun(i);
    report.push(r);
    process.stdout.write(`  ${r.pass ? 'PASS' : 'FAIL'} ${r.fail ?? ''}\n`);
    if (r.checks) for (const [k, v] of Object.entries(r.checks)) process.stdout.write(`    ${v ? 'ok  ' : 'FAIL'} ${k}\n`);
  }
} finally {
  await browser.close();
  vite.stop();
  server.kill();
}
writeFileSync(path.join(outDir, 'live-report.json'), JSON.stringify(report, null, 2));
process.stdout.write(`${report.filter((r) => r.pass).length}/${report.length} runs passed; report in ${path.relative(WEB, path.join(outDir, 'live-report.json'))}\n`);
