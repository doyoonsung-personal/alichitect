// Captures the landing-to-console handoff mid-flight (needs the live server; see e2e-live.mjs for how to start it).
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const url = process.argv[2] ?? 'http://127.0.0.1:5174';
const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../screenshots');
mkdirSync(out, { recursive: true });
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`].find((p) => p && existsSync(p));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.evaluateOnNewDocument(() => localStorage.clear());
await page.goto(url, { waitUntil: 'networkidle0' });
await sleep(700);
await page.type('.brief__input', 'We run an online store in Southeast Asia with about 30,000 daily users and big sales peaks.');
await page.keyboard.press('Enter');
await sleep(110);
await page.screenshot({ path: path.join(out, 'handoff-110ms.png') });
await sleep(140);
await page.screenshot({ path: path.join(out, 'handoff-250ms.png') });
await sleep(400);
const info = await page.evaluate(() => ({ ghosts: document.querySelectorAll('.handoff-ghost').length, handoff: window.__ab.store.getState().ui.handoff, focus: document.activeElement?.tagName + '.' + (document.activeElement?.closest('[data-flip]')?.getAttribute('data-flip') ?? '') }));
console.log(JSON.stringify(info));
await page.evaluate(() => window.__ab.controller.stop());
await browser.close();
