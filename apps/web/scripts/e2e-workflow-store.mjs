// Store-to-view adapters in headless Chrome; API and external requests never leave the browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import puppeteer from 'puppeteer-core';

test('C4/C5: mixed-view record feedback reaches only its own canvas and panel', async () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const server = await createServer({ root, cacheDir: mkdtempSync(join(tmpdir(), 'workflow-store-')),
    configLoader: 'native', server: { host: '127.0.0.1', port: 0 }, plugins: [{
      name: 'store-probe',
      resolveId(id) { if (id === '/store-probe.js') return '\0store-probe'; },
      load(id) {
        if (id !== '\0store-probe') return;
        return `import React from 'react';
          import {createRoot} from 'react-dom/client';
          import {AppProvider} from '/src/store/react.tsx';
          import {catalog} from '/src/catalog/catalog.ts';
          import {useCanvasProps, usePanelProps} from '/src/app/props.ts';
          import {useWorkflowProps} from '/src/workflow/props.ts';
          function Probe() {
            window.storeProps = {cloud: useCanvasProps(), panel: usePanelProps(), workflow: useWorkflowProps()};
            return null;
          }
          const el = document.createElement('div');
          document.body.append(el);
          createRoot(el).render(React.createElement(AppProvider, {...window.__ab, catalog}, React.createElement(Probe)));`;
      },
    }] });
  await server.listen();
  let browser;
  try {
    const url = server.resolvedUrls.local[0];
    const executablePath = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
      `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`, process.env.CHROME_PATH].find((p) => p && existsSync(p));
    browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (req.url().includes('/api/')) return void req.respond({ status: 200, contentType: 'application/json', body: '{}' });
      if (!req.url().startsWith(url) && !req.url().startsWith('data:')) return void req.abort();
      void req.continue();
    });
    await page.goto(url);
    await page.waitForFunction('!!window.__ab');
    await page.evaluate(async () => {
      const { store, controller } = window.__ab;
      await controller.startReplay('stub-mixed-workflow', { speed: 'instant' });
      store.dispatch({ type: 'replay/set', replay: null });
      await import('/store-probe.js');
    });
    await page.waitForFunction('!!window.storeProps');
    for (const view of ['cloud', 'workflow']) {
      const other = view === 'cloud' ? 'workflow' : 'cloud';
      for (const source of ['revision', 'line']) {
        await page.evaluate(({ view, other, source }) => {
          const { store, controller } = window.__ab;
          controller.setMode(view);
          const rev = store.getState().session.revisions.find((r) => r.mode === other);
          const line = rev.changes.find((l) => l.cards.includes('in'));
          const highlight = source === 'revision'
            ? { source, revision: rev.n, cards: rev.cards, ghosts: rev.gone }
            : { source, cards: line.cards, ghosts: line.ghosts };
          controller.highlight(highlight);
          controller.panTo(highlight.cards);
        }, { view, other, source });
        await page.waitForFunction((view) => window.storeProps[view].highlight === null, {}, view);
        const props = await page.evaluate((view) => ({ highlight: window.storeProps[view].highlight,
          panTo: window.storeProps[view].panTo, panel: window.storeProps.panel.highlight }), view);
        assert.equal(props.highlight, null);
        assert.equal(props.panTo, null);
        if (view === 'cloud') assert.equal(props.panel, null);
      }
      await page.evaluate(({ view, other }) => {
        const { store } = window.__ab;
        store.dispatch({ type: 'turn/start', mode: other, ask: 'Change input', now: 1 });
        store.dispatch({ type: 'turn/event', now: 2, event: { type: 'op', phase: 'main', op: other === 'workflow'
          ? { t: 'step', id: 'in', kind: 'trigger', label: 'Changed input' }
          : { t: 'node', id: 'in', product: 'eventbridge', label: 'Changed input' } } });
        store.dispatch({ type: 'turn/flush', now: 3 });
        store.dispatch({ type: 'session/mode', mode: view });
      }, { view, other });
      await page.waitForFunction((view) => window.storeProps[view].streaming, {}, view);
      assert.deepEqual(await page.evaluate((view) => window.storeProps[view].building, view), []);
      await page.evaluate(() => window.__ab.store.dispatch({ type: 'turn/stop', now: 4 }));
    }
  } finally {
    await browser?.close();
    await server.close();
  }
});
