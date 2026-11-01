// Screenshots of the assumption editor (an open chip with a half-typed answer) against the fake drawing service:
// 1440x900 in light and dark, and 1280x720 in light and dark. Output: apps/web/screenshots/console/editor/.
//   node scripts/console/editor-shots.mjs [--lang en|ko]
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { startVite, startFakeServer, launch, sleep, WEB } from './lib.mjs';

const args = process.argv.slice(2);
const lang = args.includes('--lang') ? args[args.indexOf('--lang') + 1] : 'en';
const outDir = path.resolve(WEB, 'screenshots/console/editor');
mkdirSync(outDir, { recursive: true });

const fx = lang === 'en' ? 'asks-shop' : 'asks-shop-ko';
const browser = await launch();
const typedText = lang === 'en' ? 'Only our staff, over the VPN' : '직원만 VPN으로 접속';
try {
  for (const theme of ['light', 'dark']) {
    for (const [w, h] of [[1440, 900], [1280, 720]]) {
      // a fresh fake service per page: it streams its recorded turns in order, one per request
      const fake = await startFakeServer(fx, { speed: 10 });
      const vite = await startVite(fake.url, new Set([fake.port]));
      const p = await browser.newPage();
      await p.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
      await p.evaluateOnNewDocument((l, th) => {
        try {
          localStorage.clear();
          localStorage.setItem('ab.lang', l);
          localStorage.setItem('ab.theme', th);
        } catch {}
      }, lang, theme);
      await p.goto(vite.url, { waitUntil: 'networkidle0' });
      await sleep(300);
      const brief = JSON.parse((await import('node:fs')).readFileSync(path.join(WEB, 'src/replay/fixtures', `${fx}.json`), 'utf8')).turns[0].ask;
      await p.type('.brief__input', brief);
      await p.keyboard.press('Enter');
      await p.waitForFunction(() => { const r = window.__ab.store.getState().session.revisions; return r.length === 1 && r[0].status === 'done'; }, { timeout: 40000 });
      await sleep(1200);
      await p.click('.asm__chip:first-child .asm__btn');
      await p.waitForSelector('.asme__field');
      await p.type('.asme__field', typedText, { delay: 5 });
      await sleep(400);
      const file = `editor-${theme}-${w}x${h}-${lang}.png`;
      await p.screenshot({ path: path.join(outDir, file) });
      process.stdout.write(`shot ${file}\n`);
      await p.close();
      fake.stop();
      vite.stop();
    }
  }
} finally {
  await browser.close();
}
