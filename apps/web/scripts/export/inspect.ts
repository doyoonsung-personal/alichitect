// Reads a PDF back with pdf.js: page count and sizes, the extractable text of each page, the link annotations, and PNG
// renders of every page. This is the check that the file is what it claims to be, independent of how it was drawn.
import { mkdirSync, writeFileSync } from 'node:fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

export interface PageInfo {
  n: number;
  width: number;
  height: number;
  text: string;
  links: string[];
  /** Every text run with its left edge, width and baseline, in pt from the page's top-left corner. */
  items: Array<{ str: string; x: number; w: number; y: number }>;
}

export interface PdfInfo {
  pages: PageInfo[];
  title: string;
  text: string;
  links: string[];
}

const std = new URL('../../node_modules/pdfjs-dist/standard_fonts/', import.meta.url).href;

function open(bytes: Uint8Array) {
  // pdf.js takes ownership of the buffer: hand it a copy
  const task = getDocument({ data: bytes.slice(), standardFontDataUrl: std, useSystemFonts: false, verbosity: 0 });
  return task.promise.then((pdf) => ({ pdf, close: () => task.destroy() }));
}

export async function inspectPdf(bytes: Uint8Array): Promise<PdfInfo> {
  const { pdf, close } = await open(bytes);
  const pages: PageInfo[] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const vp = page.getViewport({ scale: 1 });
    const tc = await page.getTextContent();
    const text = tc.items.map((it) => ('str' in it ? it.str + (it.hasEOL ? ' ' : '') : '')).join('');
    const items = tc.items.flatMap((it) => ('str' in it && it.str.trim() ? [{ str: it.str, x: it.transform[4], w: it.width, y: vp.height - it.transform[5] }] : []));
    const ann = await page.getAnnotations();
    const links = ann.filter((a) => a.subtype === 'Link' && typeof a.url === 'string').map((a) => a.url as string);
    pages.push({ n, width: Math.round(vp.width), height: Math.round(vp.height), text, links, items });
  }
  const meta = await pdf.getMetadata();
  const info = meta.info as { Title?: string };
  await close();
  return { pages, title: info.Title ?? '', text: pages.map((p) => p.text).join('\n'), links: pages.flatMap((p) => p.links) };
}

/** Renders every page to <dir>/<stem>-pNN.png at `scale` (1 = 72 dpi) and returns the file paths. */
export async function renderPdf(bytes: Uint8Array, dir: URL, stem: string, scale = 1.6): Promise<string[]> {
  const { createCanvas } = await import('@napi-rs/canvas');
  mkdirSync(dir, { recursive: true });
  const { pdf, close } = await open(bytes);
  const out: string[] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const vp = page.getViewport({ scale });
    const canvas = createCanvas(Math.ceil(vp.width), Math.ceil(vp.height));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas: canvas as unknown as HTMLCanvasElement, canvasContext: ctx as unknown as CanvasRenderingContext2D, viewport: vp }).promise;
    const file = new URL(`${stem}-p${String(n).padStart(2, '0')}.png`, dir);
    writeFileSync(file, canvas.toBuffer('image/png'));
    out.push(file.pathname.replace(/^\/([A-Za-z]:)/, '$1'));
  }
  await close();
  return out;
}

export interface PageOps {
  /** Raster images painted on the page (any kind). */
  images: number;
  /** Path constructions: the vector drawing. */
  paths: number;
  /** Text-showing operators. */
  texts: number;
}

/** What a page is made of: vector paths and text, or raster images. The diagram page must be paths and text only. */
export async function pageOps(bytes: Uint8Array, pageNo: number): Promise<PageOps> {
  const { OPS } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const { pdf, close } = await open(bytes);
  const page = await pdf.getPage(pageNo);
  const list = await page.getOperatorList();
  const images = new Set<number>([OPS.paintImageXObject, OPS.paintInlineImageXObject, OPS.paintImageMaskXObject].filter((x) => typeof x === 'number'));
  const out: PageOps = { images: 0, paths: 0, texts: 0 };
  for (const op of list.fnArray) {
    if (images.has(op)) out.images++;
    else if (op === OPS.constructPath) out.paths++;
    else if (op === OPS.showText || op === OPS.showSpacedText) out.texts++;
  }
  await close();
  return out;
}
