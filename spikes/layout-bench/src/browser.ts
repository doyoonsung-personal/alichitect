// Headless Chrome for PNG export and text checks: puppeteer-core from the spike's node_modules (read-only use) and
// the local Chrome install (same candidates as spikes/canvas/scripts/measure.mjs).
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const CANVAS_MODULES = new URL('../../canvas/node_modules/', import.meta.url);

/** The handful of puppeteer calls the bench makes. */
export interface Page {
  setViewport(v: { width: number; height: number; deviceScaleFactor: number }): Promise<void>;
  setContent(html: string, o?: { waitUntil?: string }): Promise<void>;
  screenshot(o: { path: string; type?: 'png'; omitBackground?: boolean }): Promise<unknown>;
  evaluate<T>(fn: string | ((...args: never[]) => T | Promise<T>), ...args: unknown[]): Promise<T>;
  close(): Promise<void>;
}
export interface Browser {
  newPage(): Promise<Page>;
  version(): Promise<string>;
  close(): Promise<void>;
}

export function chromePath(): string | undefined {
  const candidates = process.env.CHROME_PATH
    ? [process.env.CHROME_PATH]
    : [
        'C:/Program Files/Google/Chrome/Application/chrome.exe',
        'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
        `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
        'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
        '/usr/bin/google-chrome',
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      ];
  return candidates.find((p) => p && existsSync(p));
}

export async function launchBrowser(): Promise<Browser> {
  const executablePath = chromePath();
  if (!executablePath) throw new Error('No Chrome or Edge found; set CHROME_PATH');
  const mod = await import(new URL('puppeteer-core/lib/puppeteer/puppeteer-core.js', CANVAS_MODULES).href);
  const pp = mod.default ?? mod;
  return (await pp.launch({ executablePath, headless: true, args: ['--hide-scrollbars', '--force-color-profile=srgb', '--font-render-hinting=none'] })) as Browser;
}

/** The Inter Variable latin subset the canvas spike ships (@fontsource-variable/inter), as a base64 data URL. */
export function interDataUrl(): string {
  const file = new URL('@fontsource-variable/inter/files/inter-latin-wght-normal.woff2', CANVAS_MODULES);
  return 'data:font/woff2;base64,' + readFileSync(file).toString('base64');
}

/** @font-face rule for the canvas font stack, embedded in every SVG and test page. */
export function interFontFace(): string {
  return `@font-face{font-family:'Inter Variable';font-style:normal;font-weight:100 900;src:url(${interDataUrl()}) format('woff2-variations');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}`;
}

/** The canvas font stack (spikes/canvas/src/ui/tokens.css). */
export const FONT_STACK = `'Inter Variable', 'Inter', ui-sans-serif, system-ui, 'Segoe UI', sans-serif`;

export const libavoidUrl = (): string => new URL('libavoid-js/dist/index-node.mjs', CANVAS_MODULES).href;

export const pathOf = (u: URL): string => fileURLToPath(u);
export const urlOf = (p: string): string => pathToFileURL(p).href;
