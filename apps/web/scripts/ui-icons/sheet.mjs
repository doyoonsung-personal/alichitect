// Renders every UI icon large, on its 16 px grid, to screenshots/ui-icons.png (the check for path icons).
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const icons = JSON.parse(readFileSync(path.join(HERE, '../../.qwen/icons.json'), 'utf8'));
const cells = Object.entries(icons).map(([n, m]) => `<figure><svg viewBox="0 0 16 16" width="96" height="96"><rect width="16" height="16" fill="#f7f9fc"/><path d="M1.5 1.5h13v13h-13z" fill="none" stroke="#dcddde" stroke-width="0.1"/>${m}</svg><svg viewBox="0 0 16 16" width="16" height="16" style="vertical-align:middle">${m}</svg><figcaption>${n}</figcaption></figure>`).join('');
const html = `<body style="margin:16px;font:12px Arial;color:#181818;display:flex;flex-wrap:wrap;gap:12px;width:1000px">${cells}<style>figure{margin:0;width:110px;text-align:center}</style></body>`;
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`].find((p) => p && existsSync(p));
const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
const p = await b.newPage();
await p.setViewport({ width: 1040, height: 700 });
await p.setContent(html);
mkdirSync(path.join(HERE, '../../screenshots'), { recursive: true });
await p.screenshot({ path: path.join(HERE, '../../screenshots/ui-icons.png'), fullPage: true });
await b.close();
