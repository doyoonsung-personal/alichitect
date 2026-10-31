// Renders a PDF's pages to PNG with pdf.js and prints its page sizes and extracted text: the finish check on an exported proposal.
//   node --import ./scripts/alias.mjs scripts/finish/render-pdf.ts <file.pdf> <out dir> [scale]
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { inspectPdf, renderPdf } from '../export/inspect.ts';

const [file, outDir, scale] = process.argv.slice(2);
const bytes = new Uint8Array(readFileSync(file));
const info = await inspectPdf(bytes);
console.log(`title: ${info.title}`);
for (const p of info.pages) console.log(`p${p.n} ${p.width}x${p.height} links=${p.links.length} chars=${p.text.length}`);
const files = await renderPdf(bytes, pathToFileURL(path.resolve(outDir) + '/'), 'page', scale ? Number(scale) : 1.4);
console.log(files.join('\n'));
if (process.env.TEXT) for (const p of info.pages) console.log(`--- p${p.n}\n${p.text}`);
