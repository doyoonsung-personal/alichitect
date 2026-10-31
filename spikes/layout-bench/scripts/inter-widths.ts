// Measures Inter advance widths in headless Chrome (DOM text layout) and writes data/inter-advances.json, the table the bench uses to
// estimate truncation without a browser. One entry per text style the canvas uses (weights and caps from
// spikes/canvas/src/canvas/canvas.css). Widths are in em; kerning is ignored (the bench's browser check measures the
// resulting error). CJK falls back to the system font, so Hangul, Han and kana get one average width each.
//   node spikes/layout-bench/scripts/inter-widths.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { FONT_STACK, interFontFace, launchBrowser } from '../src/browser.ts';
import { STYLES } from '../src/text.ts';

const chars: string[] = [];
for (let c = 0x20; c <= 0x7e; c++) chars.push(String.fromCharCode(c));
for (let c = 0xa0; c <= 0xff; c++) chars.push(String.fromCharCode(c));
for (const ch of '–—‘’“”…·×→•€™') chars.push(ch);

const SAMPLES = {
  hangul: '가나다라마바사아자차카타파하데이터서버웹앱보안',
  han: '数据仓库网站应用服务器负载均衡对象存储',
  kana: 'アイウエオカキクケコデータ',
};

const browser = await launchBrowser();
try {
  const page = await browser.newPage();
  await page.setContent(`<html><head><style>${interFontFace()}</style></head><body></body></html>`);
  const styles = Object.entries(STYLES).map(([key, s]) => ({ key, weight: s.weight, smallCaps: s.smallCaps, ls: s.letterSpacingEm }));
  // DOM measurement, so small caps and fallback fonts resolve exactly as the canvas's CSS does. Chrome adds
  // letter-spacing after every character, so each width minus the tracking is the advance.
  const res = await page.evaluate(
    `(async () => {
      const styles = ${JSON.stringify(styles)};
      const chars = ${JSON.stringify(chars)};
      const samples = ${JSON.stringify(SAMPLES)};
      const stack = ${JSON.stringify(FONT_STACK)};
      for (const s of styles) await document.fonts.load(s.weight + ' 100px "Inter Variable"', 'Aa');
      const el = document.createElement('span');
      el.style.cssText = 'display:inline-block;white-space:pre;font-size:100px;font-family:' + stack;
      document.body.appendChild(el);
      const width = (text) => { el.textContent = text; return el.getBoundingClientRect().width; };
      const out = {};
      for (const s of styles) {
        el.style.fontWeight = String(s.weight);
        el.style.fontVariantCaps = s.smallCaps ? 'all-small-caps' : 'normal';
        el.style.letterSpacing = s.ls + 'em';
        const widths = {};
        for (const ch of chars) widths[ch] = Math.round((width(ch) / 100 - s.ls) * 10000) / 10000;
        const cjk = {};
        for (const [k, str] of Object.entries(samples)) cjk[k] = Math.round((width(str) / 100 / [...str].length - s.ls) * 10000) / 10000;
        out[s.key] = { widths, cjk };
      }
      return out;
    })()`,
  );
  const table = { generatedAt: new Date().toISOString(), chrome: await browser.version(), font: '@fontsource-variable/inter 5.2.8 (latin, wght axis)', unit: 'em', styles: res };
  mkdirSync(new URL('../data/', import.meta.url), { recursive: true });
  writeFileSync(new URL('../data/inter-advances.json', import.meta.url), JSON.stringify(table, null, 1) + '\n');
  console.log('wrote data/inter-advances.json for styles', Object.keys(res as object).join(', '));
} finally {
  await browser.close();
}
