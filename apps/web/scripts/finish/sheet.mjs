// A contact sheet of screenshots in one PNG, for reviewing many shots in one look.
//   node scripts/finish/sheet.mjs <out.png> <cols> <cellWidth> <file>...
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { launch } from '../console/lib.mjs';
const [out, cols, cw, ...files] = process.argv.slice(2);
const html = `<body style="margin:0;background:#888;font:12px Arial"><div style="display:grid;grid-template-columns:repeat(${cols},${cw}px);gap:6px;padding:6px">${files.map((f) => `<figure style="margin:0;background:#fff"><img src="${pathToFileURL(path.resolve(f)).href}" style="width:${cw}px;display:block"><figcaption style="padding:2px 4px">${path.basename(path.dirname(f))}/${path.basename(f)}</figcaption></figure>`).join('')}</div></body>`;
const b = await launch();
const p = await b.newPage();
await p.setViewport({ width: Number(cols) * (Number(cw) + 6) + 6, height: 600 });
const tmp = path.resolve(out + '.html');
(await import('node:fs')).writeFileSync(tmp, html);
await p.goto(pathToFileURL(tmp).href, { waitUntil: 'load' });
await p.screenshot({ path: out, fullPage: true });
await b.close();
(await import('node:fs')).unlinkSync(tmp);
