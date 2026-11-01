// Behaviour checks of the theme choice, against the BUILT app (apps/web/dist, so the real stylesheet link and the real
// blocking theme.js are in play, as in production), in real headless Chrome:
//   1  first paint   the first frame Chrome paints is already in the stored theme, whatever the device says
//   2  persistence   a choice made in the menu survives a reload, a second tab follows it live
//   3  System        with nothing stored the page follows prefers-color-scheme as it changes, no reload
//   4  reduced motion  the theme changes at once; no view transition, no running animation of the page
//   5  orange        no element outside the logo, product icons, Cursor and caret paints brand orange, in either theme
//   6  PDF           a proposal exported while the app is dark has white paper and ink text
// Build first (npm run build); the script serves dist on a free port in 5185-5199 and answers /api in the browser.
//   node --import ./scripts/alias.mjs scripts/theme-qa.mjs [--only paint,persist,system,motion,orange,pdf]
import { createReadStream, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { WEB, freePort, launch, sleep, startVite } from './console/lib.mjs';

const require = createRequire(import.meta.url);
const PNG = require('png-js');
const args = process.argv.slice(2);
const only = (args.includes('--only') ? args[args.indexOf('--only') + 1] : '').split(',').filter(Boolean);
const want = (n) => !only.length || only.includes(n);
const DIST = path.join(WEB, 'dist');
const OUT = path.join(WEB, 'screenshots', 'theme');
mkdirSync(OUT, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain' };
const delays = { js: 0 };

async function serveDist() {
  const port = await freePort(5185, 5199);
  const server = http.createServer(async (rq, rs) => {
    const u = new URL(rq.url, 'http://x');
    if (u.pathname.startsWith('/api/')) {
      rs.writeHead(404, { 'content-type': 'application/json' });
      return void rs.end('{"error":"not-found"}');
    }
    let f = path.join(DIST, decodeURIComponent(u.pathname));
    if (!f.startsWith(DIST) || !existsSync(f) || statSync(f).isDirectory()) f = path.join(DIST, 'index.html');
    const ext = path.extname(f);
    if (ext === '.js' && delays.js) await sleep(delays.js);
    rs.writeHead(200, { 'content-type': MIME[ext] ?? 'application/octet-stream' });
    createReadStream(f).pipe(rs);
  });
  await new Promise((r) => server.listen(port, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${port}`, stop: () => server.close() };
}

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  process.stdout.write(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}\n`);
};

const lin = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const hex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const parseRgb = (s) => (s.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);

async function pngPixels(buf) {
  const png = new PNG(buf);
  const data = await new Promise((res) => png.decode((d) => res(d)));
  const ch = data.length / (png.width * png.height);
  return { w: png.width, h: png.height, at: (x, y) => { const i = (Math.round(y) * png.width + Math.round(x)) * ch; return [data[i], data[i + 1], data[i + 2]]; }, data, ch };
}

async function main() {
  const server = await serveDist();
  // the recorded sessions (?replay=) are a demo tool the production build leaves out (check:dist), so the checks that need a
  // drawn diagram run on the dev server, which has the same stylesheets and the same export code
  const dev = want('orange') || want('pdf') ? await startVite('http://127.0.0.1:8805') : null;
  const browser = await launch();
  const errors = [];

  async function open(o = {}) {
    const ctx = o.ctx ?? browser;
    const p = await ctx.newPage();
    await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await p.emulateMediaFeatures([
      { name: 'prefers-color-scheme', value: o.device ?? 'light' },
      { name: 'prefers-reduced-motion', value: o.reduced ? 'reduce' : 'no-preference' },
    ]);
    if (o.theme !== undefined || o.clear !== false) {
      await p.evaluateOnNewDocument(
        (t, keep) => {
          try {
            if (!keep && !sessionStorage.getItem('qa-seeded')) {
              localStorage.clear();
              if (t === 'light' || t === 'dark') localStorage.setItem('ab.theme', t);
              localStorage.setItem('ab.lang', 'en');
              sessionStorage.setItem('qa-seeded', '1');
            }
          } catch {}
        },
        o.theme,
        !!o.keep,
      );
    }
    p.on('pageerror', (e) => errors.push(e.message));
    if (o.api) {
      await p.setRequestInterception(true);
      p.on('request', (r) => (new URL(r.url()).pathname.startsWith('/api/') ? r.respond({ status: 404, contentType: 'application/json', body: '{"error":"not-found"}' }) : r.continue()));
    }
    return p;
  }
  const attr = (p) => p.evaluate(() => document.documentElement.getAttribute('data-theme'));
  const bodyBg = (p) => p.evaluate(() => getComputedStyle(document.body).backgroundColor);

  /* ---- 1: first paint ---- */
  if (want('paint')) {
    process.stdout.write('\n1  first paint (the JS bundle is held back 1.5 s, so only the HTML and the stylesheet decide the first frame)\n');
    delays.js = 1500;
    const blank = await browser.newPage();
    const frameOf = async (stored, device) => {
      const p = await open({ theme: stored, device });
      await p.tracing.start({ screenshots: true, categories: ['disabled-by-default-devtools.screenshot', 'devtools.timeline', 'loading', 'blink.user_timing'] });
      await p.goto(server.url + '/', { waitUntil: 'domcontentloaded' });
      await sleep(900);
      const early = await p.screenshot(); // before the bundle arrives
      const earlyAttr = await attr(p);
      const trace = JSON.parse(Buffer.from(await p.tracing.stop()).toString('utf8'));
      // the first frame of OUR document: the first screenshot at or after the document's First Paint (the frames before it are
      // the blank page that was open before the navigation)
      const fp = trace.traceEvents.filter((e) => e.name === 'firstPaint' && e.ts).sort((x, y) => x.ts - y.ts).at(-1);
      const snaps = trace.traceEvents.filter((e) => e.name === 'Screenshot' && e.args?.snapshot && (!fp || e.ts >= fp.ts)).sort((x, y) => x.ts - y.ts);
      let firstColour = null;
      if (snaps.length) {
        firstColour = await blank.evaluate(async (b64) => {
          const img = new Image();
          img.src = 'data:image/jpeg;base64,' + b64;
          await img.decode();
          const c = document.createElement('canvas');
          c.width = img.width; c.height = img.height;
          const x = c.getContext('2d');
          x.drawImage(img, 0, 0);
          const d = x.getImageData(Math.floor(img.width / 2), Math.floor(img.height / 2), 1, 1).data;
          return [d[0], d[1], d[2]];
        }, snaps[0].args.snapshot);
      }
      const px = await pngPixels(early);
      const e = px.at(700, 450);
      await p.close();
      return { earlyAttr, earlyPixel: e, firstColour, frames: snaps.length };
    };
    const near = (a, b, tol = 12) => a && b && Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) <= tol * 3;
    const DARK = [0x18, 0x19, 0x1c];
    const LIGHT = [255, 255, 255];
    for (const [stored, device, expect] of [['dark', 'light', DARK], ['light', 'dark', LIGHT], ['system', 'dark', DARK], ['system', 'light', LIGHT]]) {
      const r = await frameOf(stored, device);
      check(`first paint: stored ${stored}, device ${device} -> ${expect === DARK ? 'dark' : 'light'}`, near(r.earlyPixel, expect) && (!r.firstColour || near(r.firstColour, expect, 24)), `data-theme=${r.earlyAttr} pixel ${hex(r.earlyPixel)}${r.firstColour ? ' first traced frame ' + hex(r.firstColour) : ' (no traced frame)'}`);
    }
    await blank.close();
    delays.js = 0;
  }

  /* ---- 2: persistence and a second tab ---- */
  if (want('persist')) {
    process.stdout.write('\n2  persistence\n');
    const ctx = await browser.createBrowserContext();
    const a = await open({ ctx, device: 'light', theme: 'system' });
    await a.goto(server.url + '/', { waitUntil: 'networkidle0' });
    check('nothing stored: no data-theme, light device -> light sheet', (await attr(a)) === null && near2(parseRgb(await bodyBg(a)), [255, 255, 255]));
    await a.click('.menu--theme > button');
    await sleep(200);
    await a.click('.menu--theme [role="menuitemradio"]:nth-of-type(2)');
    await sleep(500);
    check('chose Dark in the menu: data-theme=dark, stored', (await attr(a)) === 'dark' && (await a.evaluate(() => localStorage.getItem('ab.theme'))) === 'dark');
    const b = await open({ ctx, device: 'light', keep: true });
    await b.goto(server.url + '/', { waitUntil: 'networkidle0' });
    check('a second tab opened afterwards is dark', (await attr(b)) === 'dark' && (await bodyBg(b)) === 'rgb(24, 25, 28)');
    // a third tab already open follows a change made in the first
    await a.bringToFront();
    await a.click('.menu--theme > button');
    await sleep(200);
    await a.click('.menu--theme [role="menuitemradio"]:nth-of-type(1)');
    await sleep(500);
    await sleep(300);
    check('Light chosen in tab 1: the open tab 2 follows live (no reload)', (await attr(b)) === 'light' && (await bodyBg(b)) === 'rgb(255, 255, 255)', `tab2 data-theme=${await attr(b)}`);
    // choose Dark, reload: back dark
    await a.bringToFront();
    await a.click('.menu--theme > button');
    await sleep(200);
    await a.click('.menu--theme [role="menuitemradio"]:nth-of-type(2)');
    await sleep(500);
    await a.reload({ waitUntil: 'networkidle0' });
    check('reload in Dark: still Dark', (await attr(a)) === 'dark' && (await bodyBg(a)) === 'rgb(24, 25, 28)');
    const trigger = await a.$eval('.menu--theme > button', (e) => e.getAttribute('aria-label') ?? e.textContent);
    check('the trigger names the choice in force', /dark/i.test(trigger ?? ''), `"${trigger}"`);
    await a.close();
    await b.close();
    await ctx.close();
  }

  /* ---- 3: System follows the device live ---- */
  if (want('system')) {
    process.stdout.write('\n3  System follows prefers-color-scheme live\n');
    const p = await open({ device: 'light', theme: 'system' });
    await p.goto(server.url + '/', { waitUntil: 'networkidle0' });
    await sleep(500);
    const cardBg = () => p.evaluate(() => { const c = document.createElement('canvas').getContext('2d'); c.fillStyle = getComputedStyle(document.querySelector('.cv') ?? document.body).getPropertyValue('--sheet').trim(); return c.fillStyle; });
    check('device light: sheet #ffffff', (await cardBg()) === '#ffffff');
    await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
    await sleep(400);
    check('device turns dark: sheet #18191c, same page, no reload', (await cardBg()) === '#18191c' && (await bodyBg(p)) === 'rgb(24, 25, 28)' && (await attr(p)) === null);
    await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
    await sleep(400);
    check('device turns light again: sheet #ffffff', (await cardBg()) === '#ffffff');
    // a pinned choice ignores the device
    await p.click('.menu--theme > button');
    await sleep(200);
    await p.click('.menu--theme [role="menuitemradio"]:nth-of-type(2)');
    await sleep(500);
    await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
    check('Dark pinned, device light: stays dark', (await bodyBg(p)) === 'rgb(24, 25, 28)');
    await p.click('.menu--theme > button');
    await sleep(200);
    await p.click('.menu--theme [role="menuitemradio"]:nth-of-type(3)');
    await sleep(500);
    check('back to System, device light: light, nothing stored', (await bodyBg(p)) === 'rgb(255, 255, 255)' && (await p.evaluate(() => localStorage.getItem('ab.theme'))) === null);
    await p.close();
  }

  /* ---- 4: reduced motion ---- */
  if (want('motion')) {
    process.stdout.write('\n4  reduced motion\n');
    for (const reduced of [true, false]) {
      const p = await open({ device: 'light', theme: 'system', reduced });
      await p.evaluateOnNewDocument(() => {
        window.__vt = 0;
        const orig = document.startViewTransition?.bind(document);
        if (orig) document.startViewTransition = (cb) => { window.__vt++; return orig(cb); };
      });
      await p.goto(server.url + '/', { waitUntil: 'networkidle0' });
      await sleep(600);
      await p.click('.menu--theme > button');
      await sleep(150);
      const t0 = Date.now();
      await p.click('.menu--theme [role="menuitemradio"]:nth-of-type(2)');
      // how long until the sheet is dark, and how many view transitions ran
      let at = -1;
      for (let i = 0; i < 40; i++) {
        if ((await bodyBg(p)) === 'rgb(24, 25, 28)') { at = Date.now() - t0; break; }
        await sleep(15);
      }
      await sleep(500);
      const info = await p.evaluate(() => ({ vt: window.__vt, switching: document.documentElement.hasAttribute('data-theme-switching'), running: document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.getComputedTiming?.().iterations !== Infinity).length, blink: getComputedStyle(document.documentElement).getPropertyValue('--cursor-blink').trim(), rise: getComputedStyle(document.documentElement).getPropertyValue('--rise').trim() }));
      if (reduced) {
        check('reduced motion: no view transition runs', info.vt === 0, `view transitions ${info.vt}`);
        check('reduced motion: the switch lands within a frame or two', at >= 0 && at < 120, `${at} ms`);
        check('reduced motion: nothing left animating, the Cursor holds still, no rise', info.running === 0 && parseFloat(info.blink) === 0 && parseFloat(info.rise) === 0, JSON.stringify(info));
      } else {
        check('motion allowed: one cross-fade view transition', info.vt === 1, `view transitions ${info.vt}`);
        check('motion allowed: data-theme-switching released afterwards', !info.switching && info.running === 0, JSON.stringify(info));
      }
      await p.close();
    }
  }

  /* ---- 5: orange discipline ---- */
  if (want('orange')) {
    process.stdout.write('\n5  Intelligent Orange only where it belongs (logo, product icons, Cursor, caret)\n');
    // the logo, the official product icons (card, badge, popover, panel row), the Cursor and the build marks, and the text caret
    const ALLOWED = /cv-card__icon|cv-badge|cv-pop__icon|pp-prod__icon|cv-cursor|\bcursor\b|cv-mark|brand__logo| caret ::/;
    const scan = () => {
      const near = (s) => { const m = (s || '').match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/); return !!m && Math.abs(+m[1] - 255) <= 2 && Math.abs(+m[2] - 106) <= 3 && Math.abs(+m[3]) <= 3; };
      const hits = [];
      for (const el of document.querySelectorAll('*')) {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        if (cs.display === 'none' || (r.width === 0 && r.height === 0)) continue;
        const props = { color: cs.color, background: cs.backgroundColor, border: cs.borderTopColor, outline: cs.outlineColor, fill: cs.fill, stroke: cs.stroke, shadow: cs.boxShadow, caret: cs.caretColor };
        for (const [k, v] of Object.entries(props)) {
          if (!near(v) && !(k === 'shadow' && /255, 106, 0/.test(v))) continue;
          if (k === 'border' && cs.borderTopWidth === '0px') continue;
          if (k === 'outline' && (cs.outlineStyle === 'none' || cs.outlineWidth === '0px')) continue;
          if (k === 'color' && !el.textContent?.trim() && !el.querySelector('svg')) continue;
          if (k === 'caret' && !/^(INPUT|TEXTAREA)$/.test(el.tagName) && !el.isContentEditable) continue; // caret-color inherits from <html> to every element; only a text field shows one
          let cls = '';
          for (let e = el, n = 0; e && n < 5; e = e.parentElement, n++) cls += ' ' + (typeof e.className === 'string' ? e.className : (e.className?.baseVal ?? ''));
          hits.push(`${el.tagName.toLowerCase()}.${(typeof el.className === 'string' ? el.className : '').split(' ').slice(0, 2).join('.')} ${k} :: ancestors ${cls.trim().slice(0, 70)}`);
        }
      }
      return [...new Set(hits)];
    };
    const states = [
      ['landing', '/', async () => {}],
      ['working', '/?replay=ha&speed=instant', async () => {}],
      ['panel', '/?replay=ha&speed=instant', async (p) => { await p.waitForSelector('#products button', { timeout: 10000 }); await p.click('#products button'); await sleep(600); }],
      ['popover', '/?replay=ha&speed=instant', async (p) => { await p.waitForSelector('.cv-card', { timeout: 10000 }); const c = await p.$$('.cv-card'); await c[Math.min(3, c.length - 1)].hover(); await sleep(700); }],
      ['stream', '/?replay=ecommerce&speed=1x', async (p) => { await sleep(6500); }],
      ['export dialog', '/?replay=ha&speed=instant', async (p) => { const b = await p.waitForSelector('.xp > button', { timeout: 10000 }); await b.click(); await sleep(300); }],
      ['error', '/?replay=stub-fatal&speed=instant', async () => {}],
    ];
    for (const theme of ['light', 'dark']) {
      const stray = new Set();
      let total = 0;
      for (const [name, url, act] of states) {
        const p = await open({ device: 'light', theme, api: true });
        await p.goto(dev.url + url, { waitUntil: 'networkidle0' }).catch(() => {});
        await sleep(700);
        await act(p);
        const hits = await p.evaluate(scan);
        total += hits.length;
        for (const h of hits) if (!ALLOWED.test(h)) stray.add(`${name}: ${h}`);
        await p.close();
      }
      check(`${theme}: brand orange appears on ${total} painted properties, none of them text or a control`, stray.size === 0, stray.size ? '\n      ' + [...stray].join('\n      ') : '');
    }
    // the warning amber is its own colour, not the brand's: hue distance
    const p = await open({ device: 'light', theme: 'dark', api: true });
    await p.goto(dev.url + '/', { waitUntil: 'networkidle0' });
    const warn = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--warn').trim());
    const lightWarn = '#a85800';
    const hue = (h) => { const n = parseInt(h.slice(1), 16); const r = n >> 16, g = (n >> 8) & 255, b = n & 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return Math.round((60 * ((g - b) / (mx - mn)) + 360) % 360); };
    process.stdout.write(`   (info) --warn: dark ${warn} hue ${hue(warn)}, light ${lightWarn} hue ${hue(lightWarn)}, brand #ff6a00 hue ${hue('#ff6a00')}\n`);
    await p.close();
  }

  /* ---- 6: the PDF stays light ---- */
  if (want('pdf')) {
    process.stdout.write('\n6  PDF export from the dark theme\n');
    const { inspectPdf, renderPdf } = await import('./export/inspect.ts');
    const dl = path.join(OUT, 'pdf-from-dark');
    rmSync(dl, { recursive: true, force: true });
    mkdirSync(dl, { recursive: true });
    for (const theme of ['dark', 'light']) {
      const dir = path.join(dl, theme);
      mkdirSync(dir, { recursive: true });
      const p = await open({ device: theme === 'dark' ? 'dark' : 'light', theme, api: true });
      const cdp = await p.createCDPSession();
      await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: dir });
      await p.goto(dev.url + '/?replay=ha&speed=instant', { waitUntil: 'networkidle0' });
      await p.waitForSelector('.cv-card', { timeout: 20000 });
      await sleep(700);
      const appBg = await bodyBg(p);
      await (await p.waitForSelector('.xp > button')).click();
      await p.waitForSelector('.xp__panel');
      await sleep(200);
      const dialogBg = await p.$eval('.xp__panel', (e) => getComputedStyle(e).backgroundColor);
      await p.click('.xp__actions .btn--primary');
      let file = null;
      for (let i = 0; i < 200 && !file; i++) {
        await sleep(100);
        file = readdirSync(dir).find((n) => n.endsWith('.pdf')) ?? null;
      }
      await p.close();
      if (!file) { check(`PDF exported from the ${theme} app`, false, 'no download'); continue; }
      const bytes = new Uint8Array(readFileSync(path.join(dir, file)));
      const info = await inspectPdf(bytes);
      const pngs = await renderPdf(bytes, new URL(`file:///${dir.replace(/\\/g, '/')}/`), `proposal-${theme}`, 1.0);
      let worst = 0;
      let darkest = 255;
      const cover = [];
      for (const f of pngs) {
        const px = await pngPixels(readFileSync(f));
        let dark = 0, n = 0, paper = 0;
        for (let y = 0; y < px.h; y += 3) for (let x = 0; x < px.w; x += 3) {
          const c = px.at(x, y);
          const l = (c[0] + c[1] + c[2]) / 3;
          n++;
          if (l < 80) dark++;
          if (l > 240) paper++;
        }
        worst = Math.max(worst, dark / n);
        darkest = Math.min(darkest, paper / n);
        cover.push(`${(100 * paper / n).toFixed(0)}% paper`);
      }
      check(`PDF from the ${theme} app (app ground ${appBg}, dialog ${dialogBg}): ${pngs.length} pages, white paper on every page`, darkest > 0.6 && worst < 0.2, `paper per page: ${cover.join(', ')}; most dark pixels on a page ${(100 * worst).toFixed(1)}%; title "${info.title}"`);
    }
  }

  await browser.close();
  server.stop();
  dev?.stop();
  const failed = results.filter((r) => !r.ok);
  process.stdout.write(`\n${results.length - failed.length}/${results.length} checks pass${errors.length ? `\npage errors:\n${[...new Set(errors)].join('\n')}` : ''}\n`);
  if (failed.length) process.exit(1);
}

function near2(a, b, tol = 6) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) <= tol;
}
function near(a, b, tol = 12) {
  return a && b && Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) <= tol * 3;
}

main().catch((e) => {
  process.stderr.write(String(e.stack ?? e) + '\n');
  process.exit(1);
});
