// Behaviour checks for the console in the browser, against a fake drawing service that streams recorded turns with their
// timings (no Qwen, no key). Covers: Enter and IME on the landing and in the composer, busy and Stop, follow-ups,
// fatal and Try again, Edit and resend, scroll anchoring and the Jump to latest chip, aria state, reduced motion,
// keyboard in the change list, unpin and Undo. Starts its own Vite and fake servers on free ports in 5185-5199.
//   node scripts/console/e2e.mjs
import { startVite, startFakeServer, launch, sleep } from './lib.mjs';

let failed = 0;
const ok = (cond, name, extra = '') => {
  if (!cond) failed++;
  process.stdout.write(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : `  ${extra}`}\n`);
};

const browser = await launch();
const servers = [];
const stopAll = () => servers.forEach((s) => s.stop());
const used = new Set();
async function env(fixture, opts = {}) {
  const fake = await startFakeServer(fixture, { ...opts, skip: new Set(used) });
  used.add(fake.port);
  const vite = await startVite(fake.url, new Set(used));
  used.add(vite.port);
  servers.push(fake, vite);
  // free the ports when a block is done: there are only fifteen in 5185-5199
  const done = () => {
    fake.stop();
    vite.stop();
    used.delete(fake.port);
    used.delete(vite.port);
  };
  return { fake, vite, done };
}
async function open(vite, { w = 1440, h = 900, lang = 'en', reduced = false } = {}) {
  const p = await browser.newPage();
  await p.setViewport({ width: w, height: h });
  if (reduced) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.evaluateOnNewDocument((l) => {
    try {
      localStorage.clear();
      localStorage.setItem('ab.lang', l);
    } catch {}
  }, lang);
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  p.errors = errors;
  await p.goto(vite.url, { waitUntil: 'networkidle0' });
  await sleep(500);
  return p;
}
const state = (p) => p.evaluate(() => JSON.parse(JSON.stringify((({ view, turn, session }) => ({ view, phase: turn.phase, revs: session.revisions.map((r) => ({ n: r.n, status: r.status, ask: r.ask, err: r.error && r.error.code })) }))(window.__ab.store.getState()))));
const until = async (p, fn, ms = 20000, arg) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await p.evaluate(fn, arg)) return true;
    await sleep(100);
  }
  return false;
};
const key = (p, sel, init) =>
  p.evaluate(
    (s, i) => {
      const el = document.querySelector(s);
      el.focus();
      const ev = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...i });
      el.dispatchEvent(ev);
      return ev.defaultPrevented;
    },
    sel,
    init,
  );

try {
  // ---------------------------------------------------------------- landing, IME, submit
  {
    const { vite, done } = await env('ha', { speed: 1 });
    const p = await open(vite);
    await p.type('.brief__input', 'We run an online store in Southeast Asia.');
    // Enter inside an IME composition (Korean or Chinese): the browser reports isComposing and keyCode 229
    const prevented = await key(p, '.brief__input', { key: 'Enter', code: 'Enter', keyCode: 229, isComposing: true });
    ok(!prevented && (await state(p)).view === 'landing', 'landing: Enter during IME composition does not submit and is left to the IME');
    const c = await p.createCDPSession();
    await p.focus('.brief__input');
    await c.send('Input.imeSetComposition', { text: '데이터', selectionStart: 3, selectionEnd: 3 });
    await p.keyboard.press('Enter');
    ok((await state(p)).view === 'landing', 'landing: Enter while a real IME composition is open does not submit');
    await c.send('Input.insertText', { text: '' });
    await p.evaluate(() => {
      const el = document.querySelector('.brief__input');
      el.value = '';
    });
    await p.click('.brief__input', { clickCount: 3 });
    await p.keyboard.press('Backspace');
    await p.type('.brief__input', 'We run an online store in Southeast Asia with big sales peaks. Design a highly available web architecture.');
    await p.keyboard.down('Shift');
    await p.keyboard.press('Enter');
    await p.keyboard.up('Shift');
    ok((await state(p)).view === 'landing', 'landing: Shift+Enter adds a line and does not submit');
    await p.keyboard.press('Backspace');
    await p.keyboard.press('Enter');
    ok(await until(p, () => window.__ab.store.getState().view === 'working', 5000), 'landing: Enter submits and the working view opens');
    await sleep(700);
    ok(await p.evaluate(() => document.activeElement?.classList.contains('cmp__field')), 'handoff ends with focus in the composer');
    const s1 = await state(p);
    ok(s1.revs.length === 1 && s1.revs[0].ask.startsWith('We run an online store'), 'revision 1 holds the ask verbatim');
    ok(await p.evaluate(() => !!document.querySelector('[data-flip="composer"]')), 'the composer box carries data-flip="composer"');

    // ------------------------------------------------------------ composer while streaming
    ok(await p.evaluate(() => !!document.querySelector('.cmp__stop')), 'composer: Stop replaces Send while a turn streams');
    ok(await p.evaluate(() => document.querySelector('.rec').getAttribute('aria-busy') === 'true' && document.querySelector('.rec').getAttribute('aria-live') === 'off'), 'record: aria-busy while streaming, aria-live off');
    await p.type('.cmp__field', 'oh i also want waf');
    const blocked = await key(p, '.cmp__field', { key: 'Enter', code: 'Enter', keyCode: 13 });
    ok(blocked && (await state(p)).revs.length === 1, 'composer: Enter while streaming does not send (and does not insert a newline)');
    ok((await p.$eval('.cmp__field', (e) => e.value)) === 'oh i also want waf', 'composer: the draft survives while streaming');
    ok((await p.$eval('#cmp-hint', (e) => e.textContent)).startsWith('Wait for this revision'), 'composer: the hint says to wait or stop');
    await p.click('.cmp__stop');
    ok(await until(p, () => window.__ab.store.getState().session.revisions[0].status === 'stopped', 3000), 'Stop ends the revision as stopped');
    await sleep(200);
    ok((await p.$eval('.rev__foot', (e) => e.textContent)).includes('Stopped'), 'a stopped revision says so in its footer');
    ok(await p.evaluate(() => !!document.querySelector('.cmp__send') && !document.querySelector('.cmp__stop')), 'composer: Send returns after Stop');
    ok(await p.evaluate(() => !document.querySelector('.rev__note') || !document.querySelector('.rev__note').textContent.includes('design a highly')), 'a stopped revision does not keep describing changes that were not applied');

    // ------------------------------------------------------------ composer idle: IME, Shift+Enter, Enter
    const ime = await key(p, '.cmp__field', { key: 'Enter', code: 'Enter', keyCode: 229, isComposing: true });
    ok(!ime && (await state(p)).revs.length === 1, 'composer: Enter during IME composition does not send');
    await p.focus('.cmp__field');
    await p.keyboard.down('Shift');
    await p.keyboard.press('Enter');
    await p.keyboard.up('Shift');
    ok((await p.$eval('.cmp__field', (e) => e.value)) === 'oh i also want waf\n', 'composer: Shift+Enter adds a newline');
    await p.keyboard.press('Backspace');
    const hBefore = await p.$eval('.cmp__field', (e) => e.getBoundingClientRect().height);
    for (let i = 0; i < 4; i++) {
      await p.keyboard.down('Shift');
      await p.keyboard.press('Enter');
      await p.keyboard.up('Shift');
      await p.keyboard.type('line');
    }
    const hAfter = await p.$eval('.cmp__field', (e) => e.getBoundingClientRect().height);
    ok(hAfter > hBefore && hAfter <= 216, 'composer: grows with its lines, up to eight', `${hBefore} -> ${hAfter}`);
    await p.click('.cmp__field', { clickCount: 3 });
    await p.keyboard.press('Backspace');
    await p.type('.cmp__field', 'oh i also want waf');
    await p.keyboard.press('Enter');
    ok(await until(p, () => window.__ab.store.getState().session.revisions.length === 2, 3000), 'composer: Enter sends the follow-up as revision 2');
    ok((await p.$eval('.cmp__field', (e) => e.value)) === '', 'composer: clears after sending');
    await sleep(500);
    ok(await p.evaluate(() => document.querySelectorAll('.revs > li .row').length === 1 && document.querySelectorAll('.rev').length === 1), 'revision 1 collapses to a row when revision 2 starts');
    await p.close();
    done();
  }

  // ---------------------------------------------------------------- fatal, retry, edit and resend
  {
    const { vite, done } = await env('stub-fatal', { speed: 4 });
    const p = await open(vite);
    await p.type('.brief__input', 'We run an online store in Southeast Asia.');
    await p.keyboard.press('Enter');
    ok(await until(p, () => !!document.querySelector('.err'), 15000), 'fatal: the revision shows an error block');
    const info = await p.evaluate(() => ({
      alert: document.querySelector('.err').getAttribute('role'),
      msg: document.querySelector('.err__msg').textContent,
      buttons: [...document.querySelectorAll('.err__actions button')].map((b) => b.textContent.trim()),
      ask: document.querySelector('.rev__ask')?.textContent,
      note: !!document.querySelector('.rev__note'),
    }));
    ok(info.alert === 'alert' && info.msg.length > 10, 'fatal: role=alert with the server message', info.msg);
    ok(info.buttons.includes('Try again') && info.buttons.includes('Edit and resend'), 'fatal: Try again and Edit and resend', info.buttons.join('|'));
    ok(info.ask.includes('We run an online store'), 'fatal: the revision keeps its ask');
    await p.click('.err__actions button:last-child');
    await sleep(300);
    ok((await p.$eval('.cmp__field', (e) => e.value)).startsWith('We run an online store'), 'Edit and resend puts the failed ask back in the composer');
    ok((await state(p)).revs.length === 0, 'Edit and resend removes the failed revision');
    await p.close();
    done();
  }

  // ---------------------------------------------------------------- reduced motion, the waiting state
  {
    const { vite, done } = await env('ha', { hold: true });
    const p = await open(vite, { reduced: true });
    await p.type('.brief__input', 'We run an online store in Southeast Asia.');
    await p.keyboard.press('Enter');
    await sleep(1200);
    const r = await p.evaluate(() => {
      const c = document.querySelector('.rev__note .cursor');
      return { cursor: !!c, anim: c ? getComputedStyle(c).animationName : null, text: document.querySelector('.rev__note')?.textContent };
    });
    ok(r.cursor && r.anim === 'none', 'reduced motion: the Cursor holds still', JSON.stringify(r));
    ok(r.text === 'Waiting for Qwen', 'waiting: "Waiting for Qwen" and the Cursor', r.text);
    await p.close();
    done();
  }
  {
    const { vite, done } = await env('ha', { hold: true });
    const p = await open(vite);
    await p.type('.brief__input', 'We run an online store in Southeast Asia.');
    await p.keyboard.press('Enter');
    await sleep(1200);
    const r = await p.evaluate(() => ({ anim: getComputedStyle(document.querySelector('.rev__note .cursor')).animationName, count: document.querySelectorAll('.cursor--blink').length }));
    ok(r.anim === 'cursor-blink' && r.count === 1, 'waiting: exactly one blinking Cursor', JSON.stringify(r));
    await sleep(8300);
    ok((await p.$eval('.rev__note', (e) => e.textContent)).startsWith('Waiting for Qwen · '), 'waiting: after 8 s the line carries a counter');
    await p.close();
    done();
  }

  // ---------------------------------------------------------------- scroll anchoring, change list keys, toast
  {
    const { vite, done } = await env('ecommerce', { speed: 3 });
    const p = await open(vite, { w: 1280, h: 720 });
    await p.type('.brief__input', 'We are launching a cross-border e-commerce site for Southeast Asia with 50k users. It must be highly available.');
    await p.keyboard.press('Enter');
    ok(await until(p, () => { const r = document.querySelector('.rec'); return r && r.scrollHeight > r.clientHeight + 40; }, 15000), 'record grows past its viewport mid-stream');
    const atBottom = await p.evaluate(() => { const r = document.querySelector('.rec'); return r.scrollHeight - r.scrollTop - r.clientHeight < 40; });
    ok(atBottom, 'record follows the bottom while streaming');
    // a real wheel: only the user's own scrolling lets the record stop following
    const rb = await p.$eval('.rec', (e) => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    await p.mouse.move(rb.x, rb.y);
    await p.mouse.wheel({ deltaY: -4000 });
    await sleep(900);
    const held = await p.evaluate(() => ({ top: document.querySelector('.rec').scrollTop, chip: !!document.querySelector('.rec__jump') }));
    ok(held.top < 30 && held.chip, 'scrolled up: the record stays put and shows "Jump to latest"', JSON.stringify(held));
    await p.click('.rec__jump');
    await sleep(200);
    ok(await p.evaluate(() => { const r = document.querySelector('.rec'); return r.scrollHeight - r.scrollTop - r.clientHeight < 40 && !document.querySelector('.rec__jump'); }), 'Jump to latest returns to the bottom and the chip goes');
    ok(await until(p, () => window.__ab.store.getState().turn.phase === 'idle', 30000), 'the turn commits');
    ok(await p.evaluate(() => document.querySelector('.rec').getAttribute('aria-busy') === 'false'), 'record: aria-busy clears at commit');
    // arrow keys move within the change list
    await p.focus('.chg');
    await p.keyboard.press('ArrowDown');
    const moved = await p.evaluate(() => { const all = [...document.querySelectorAll('button.chg')]; return all.indexOf(document.activeElement); });
    ok(moved === 1, 'change list: ArrowDown moves to the next line', String(moved));
    await p.keyboard.press('End');
    ok(await p.evaluate(() => { const all = [...document.querySelectorAll('button.chg')]; return all.indexOf(document.activeElement) === all.length - 1; }), 'change list: End moves to the last visible line');
    const tabStops = await p.evaluate(() => [...document.querySelectorAll('.rev .chgs__list button.chg')].filter((b) => b.tabIndex === 0).length);
    ok(tabStops === 1, 'change list: one tab stop (roving)', String(tabStops));
    // hover highlights through the store
    await p.hover('button.chg');
    ok(await p.evaluate(() => window.__ab.store.getState().ui.highlight?.source === 'line'), 'hovering a change line sets the highlight');
    await p.mouse.move(900, 300);
    ok(await p.evaluate(() => window.__ab.store.getState().ui.highlight === null), 'leaving clears the highlight');
    ok((await p.errors).length === 0, 'no page errors', p.errors.join('|'));
    await p.close();
    done();
  }
  {
    const { vite, done } = await env('residency', { speed: 8 });
    const p = await open(vite, { w: 1440, h: 900 });
    await p.type('.brief__input', "We're a Singapore fintech and customer data must stay in Singapore. Design a web app with a database for our customer portal.");
    await p.keyboard.press('Enter');
    ok(await until(p, () => window.__ab.store.getState().turn.phase === 'idle' && window.__ab.store.getState().session.revisions[0]?.status === 'done', 30000), 'residency: commits');
    const rows = await p.evaluate(() => document.querySelectorAll('.req__row').length);
    ok(rows >= 1, 'a requirement is pinned', String(rows));
    await p.hover('.req__row');
    await p.click('.req__unpin');
    await sleep(300);
    ok(await p.evaluate(() => !!document.querySelector('.toast') && document.querySelector('.toast').getAttribute('role') === 'status'), 'unpin: a toast with role=status');
    await p.click('.toast__action');
    await sleep(300);
    ok(await p.evaluate((n) => document.querySelectorAll('.req__row').length === n, rows), 'Undo puts the requirement back');
    await sleep(6400);
    ok(await p.evaluate(() => !document.querySelector('.toast')), 'the toast goes after 6 s');
    // over the limit: the hint says so in the danger colour and Send is disabled
    await p.evaluate(() => {
      const el = document.querySelector('.cmp__field');
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(el, 'x'.repeat(6001));
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await sleep(150);
    const over = await p.evaluate(() => ({ hint: document.querySelector('#cmp-hint').textContent, error: document.querySelector('#cmp-hint').hasAttribute('data-error'), disabled: document.querySelector('.cmp__send').disabled }));
    ok(over.hint.startsWith('This message is too long') && over.error && over.disabled, 'composer: over the limit shows the error hint and disables Send', JSON.stringify(over));
    ok((await p.errors).length === 0, 'no page errors', p.errors.join('|'));
    await p.close();
    done();
  }
  // ---------------------------------------------------------------- sessions, restore, the offline notice
  {
    const { fake, vite, done } = await env('ha', { speed: 8 });
    const p = await open(vite);
    const A = 'We run an online store in Southeast Asia with big sales peaks. Design a highly available web architecture.';
    const B = 'We want an internal assistant that answers employees questions from our policy documents.';
    await p.type('.brief__input', A);
    await p.keyboard.press('Enter');
    ok(await until(p, () => window.__ab.store.getState().session.revisions[0]?.status === 'done', 30000), 'session A commits');
    await p.evaluate(() => [...document.querySelectorAll('.header button')].find((b) => b.textContent.includes('New session'))?.click());
    await sleep(500);
    ok((await state(p)).view === 'landing', 'New session returns to the landing');
    await p.type('.brief__input', B);
    await p.keyboard.press('Enter');
    ok(await until(p, () => window.__ab.store.getState().session.revisions[0]?.status === 'done' && window.__ab.store.getState().session.revisions[0].ask.startsWith('We want'), 30000), 'session B commits');
    await sleep(500);
    await p.click('.header .menu--sessions > button');
    await sleep(200);
    const items = await p.evaluate(() => [...document.querySelectorAll('.menu__item')].map((b) => b.textContent));
    ok(items.length >= 2, 'the Sessions menu lists both sessions', items.join('|'));
    await p.evaluate(() => [...document.querySelectorAll('.menu__item')].find((b) => b.textContent.includes('online store'))?.click());
    await sleep(600);
    ok((await state(p)).revs[0]?.ask === A, 'opening a saved session shows its record');
    ok(await p.evaluate(() => !!document.querySelector('.toast') && document.querySelectorAll('.rev').length === 1), 'restored: one open revision and the restored toast');
    ok(await p.evaluate(() => !document.querySelector('.cursor') && document.querySelector('.rec').getAttribute('aria-busy') === 'false'), 'restored: no Cursor, record not busy');
    // the service goes away
    fake.stop();
    await p.evaluate(() => window.__ab.controller.checkHealth());
    await sleep(800);
    ok(await p.evaluate(() => !!document.querySelector('.rec__offline .notice')), 'offline: the notice sits at the top of the record');
    ok(await p.evaluate(() => [...document.querySelectorAll('.rec__offline button')].map((b) => b.textContent).join('|').includes('Try again')), 'offline: Try again is offered');
    ok((await p.errors).length === 0, 'no page errors', p.errors.join('|'));
    await p.close();
    done();
  }
} catch (e) {
  failed++;
  process.stdout.write(`FAIL  script error: ${e.stack ?? e}\n`);
} finally {
  await browser.close();
  stopAll();
}
process.stdout.write(failed ? `\n${failed} failed\n` : '\nall passed\n');
process.exit(failed ? 1 : 0);
