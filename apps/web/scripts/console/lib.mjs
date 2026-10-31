// Shared helpers for the console track's screenshot and behaviour scripts: a Vite server on a free port in 5185-5199
// (never 5173, the user's Phase 0 preview, and never 5174 unless the user has it running), headless Chrome, and a fake
// drawing service that streams a recorded fixture as NDJSON with its timings.
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const WEB = path.resolve(HERE, '../..');
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const free = (port) =>
  new Promise((res) => {
    const s = net.createServer();
    s.once('error', () => res(false));
    s.once('listening', () => s.close(() => res(true)));
    s.listen(port, '127.0.0.1');
  });

export async function freePort(from = 5185, to = 5199, skip = new Set()) {
  for (let p = from; p <= to; p++) if (!skip.has(p) && (await free(p))) return p;
  throw new Error('no free port in 5185-5199');
}

export async function startVite(apiTarget, skip = new Set()) {
  const port = await freePort(5185, 5199, skip);
  const env = { ...process.env, ...(apiTarget ? { API_TARGET: apiTarget } : {}) };
  const child = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { cwd: WEB, env, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', () => {});
  child.stderr.on('data', () => {});
  const url = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(url)).ok) return { url, port, stop: () => child.kill() };
    } catch {
      /* not up yet */
    }
    await sleep(250);
  }
  child.kill();
  throw new Error('vite did not start');
}

export const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find((p) => p && existsSync(p));

export const launch = () => puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--font-render-hinting=none'] });

/** A fake drawing service: GET /api/health, POST /api/turn streaming the n-th recorded turn of a fixture with its timings. */
export async function startFakeServer(fixtureId, { speed = 1, skip = new Set(), hold = false, file = null } = {}) {
  const fx = JSON.parse(readFileSync(file ?? path.join(WEB, 'src/replay/fixtures', `${fixtureId}.json`), 'utf8'));
  let turn = 0;
  const server = http.createServer((req, res) => {
    if (req.url?.startsWith('/api/health')) {
      res.setHeader('content-type', 'application/json');
      res.end(
        JSON.stringify({ ok: true, model: 'qwen3.8-max', fallbackModel: 'qwen3.8-plus', endpoint: 'dashscope-intl.aliyuncs.com', catalog: { version: '2026-10-31', entries: 223 }, keyConfigured: true, inFlight: 0, maxInFlight: 4, limits: { askChars: 6000, turns: 40, nodes: 80, requirements: 12, bodyBytes: 200000 }, uptimeS: 60 }),
      );
      return;
    }
    if (req.url?.startsWith('/api/turn') && req.method === 'POST') {
      req.resume();
      const t = fx.turns[Math.min(turn, fx.turns.length - 1)];
      turn++;
      res.setHeader('content-type', 'application/x-ndjson');
      if (hold) return; // never answers: the console stays in its waiting state
      let i = 0;
      const t0 = Date.now();
      const next = () => {
        if (i >= t.ev.length) return res.end();
        const [at, ev] = t.ev[i];
        const wait = Math.max(0, at / speed - (Date.now() - t0));
        setTimeout(() => {
          if (res.destroyed) return;
          res.write(JSON.stringify(ev) + '\n');
          i++;
          next();
        }, wait);
      };
      next();
      return;
    }
    res.statusCode = 404;
    res.end();
  });
  const port = await freePort(5185, 5199, skip);
  await new Promise((r) => server.listen(port, '127.0.0.1', r));
  return { port, url: `http://127.0.0.1:${port}`, stop: () => server.close(), reset: () => (turn = 0) };
}
