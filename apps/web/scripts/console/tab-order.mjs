// Prints the tab order of the working view from the page start to the composer (spec section 13).
import { startVite, startFakeServer, launch, sleep } from './lib.mjs';
const fake = await startFakeServer('residency', { speed: 8 });
const vite = await startVite(fake.url, new Set([fake.port]));
const b = await launch();
const p = await b.newPage();
await p.setViewport({ width: 1440, height: 900 });
await p.evaluateOnNewDocument(() => { try { localStorage.clear(); localStorage.setItem('ab.lang', 'en'); } catch {} });
await p.goto(vite.url, { waitUntil: 'networkidle0' });
await sleep(400);
await p.type('.brief__input', "We're a Singapore fintech and customer data must stay in Singapore. Design a web app with a database for our customer portal.");
await p.keyboard.press('Enter');
await p.waitForFunction(() => window.__ab.store.getState().session.revisions[0]?.status === 'done', { timeout: 30000 });
await sleep(600);
await p.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
const out = [];
for (let i = 0; i < 40; i++) {
  await p.keyboard.press('Tab');
  const d = await p.evaluate(() => {
    const e = document.activeElement;
    const label = (e.getAttribute('aria-label') || e.textContent || e.className || '').trim().replace(/\s+/g, ' ').slice(0, 56);
    return `${e.tagName.toLowerCase()}.${(e.className && e.className.baseVal === undefined ? e.className : '').toString().split(' ')[0]} ${label}`;
  });
  out.push(d);
  if (d.startsWith('textarea.cmp__field')) break;
}
console.log(out.map((s, i) => `${String(i + 1).padStart(2)}  ${s}`).join('\n'));
await b.close(); vite.stop(); fake.stop();
