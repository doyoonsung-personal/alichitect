// Real controls and DOM mutations, with API requests faked and external requests blocked.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import puppeteer from 'puppeteer-core';

test('workflow review browser regressions', async (t) => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const cacheDir = mkdtempSync(join(tmpdir(), 'workflow-review-'));
  const server = await createServer({ root, cacheDir, configLoader: 'native', server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  const url = server.resolvedUrls!.local[0];
  const executablePath = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
    process.env.CHROME_PATH,
  ].find((p) => p && existsSync(p));
  const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-sandbox'] }).catch(async (error) => {
    await server.close();
    throw error;
  });
  try {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (req.url().includes('/api/')) return void req.respond({ status: 200, contentType: 'application/json', body: '{}' });
      if (!req.url().startsWith(url) && !req.url().startsWith('data:')) return void req.abort();
      void req.continue();
    });
    await page.evaluateOnNewDocument(() => localStorage.setItem('ab.lang', 'en'));
    await page.goto(url);
    await page.waitForFunction('!!window.__ab');
    const seed = async (recommendations = false) => {
      await page.evaluate(`(() => {
        const {store} = window.__ab, s = store.getState();
        store.dispatch({type:'session/new', id:'review', now:0});
        store.dispatch({type:'session/open', now:1, record:{...s.session, mode:'workflow', memory:{
          turns:[], requirements:[], tombstones:[],
          graph:{nodes:${recommendations ? '{}' : "{c:{id:'c',product:'fc',label:'Cloud'}}"}, edges:{}, groups:{},
            recs:${recommendations ? "[{product:'fc',fit:'primary',need:'Compute'}]" : '[]'}},
          workflow:{nodes:{draft:{id:'draft',kind:'ai',label:'Draft',ai:'qwen-plus'}},edges:{},groups:{}}
        }}});
      })()`);
      await page.waitForSelector('.workflow-diagrams select');
    };
    await t.test('last workflow step removed: retained cloud is exportable and selectable', async () => {
      await seed();
      await page.evaluate(`(() => {
        const {store} = window.__ab;
        store.dispatch({type:'turn/start',mode:'workflow',ask:'Remove last step',now:2});
        store.dispatch({type:'turn/event',event:{type:'op',phase:'main',op:{t:'unstep',id:'draft'}},now:3});
        store.dispatch({type:'turn/flush',now:4});
        const s=store.getState();
        store.dispatch({type:'turn/event',event:{type:'commit',memory:{...s.session.memory,workflow:s.work.rawWorkflow},
          changes:'',warnings:[]},now:5});
      })()`);
      await page.waitForFunction('!window.__ab.store.getState().work');
      const actual = await page.evaluate(`({
        exportButtonDisabled:document.querySelector('.xp > button').disabled,
        choices:[...document.querySelectorAll('.workflow-diagrams option')].map(o=>o.value)
      })`);
      assert.deepEqual(actual, { exportButtonDisabled: false, choices: ['workflow', 'cloud'] });
      await page.select('.workflow-diagrams select', 'cloud');
      await page.waitForSelector('[data-view="cloud"]');
    });
    await t.test('cloud recommendations without nodes are selectable', async () => {
      await seed(true);
      assert.deepEqual(await page.$$eval('.workflow-diagrams option', (options) => options.map((o) => o.value)), ['workflow', 'cloud']);
    });
    await t.test('Enabled thinking with no override survives Tab and switching views', async () => {
      await seed();
      await page.click('#products .pp__handle');
      await page.$eval('.wf-cost details', (el) => { el.open = true; });
      const selector = '.wf-driver select';
      assert.equal(await page.evaluate('window.__ab.store.getState().session.memory.estimate?.steps?.draft?.thinking'), undefined);
      await page.focus(selector);
      await page.select(selector, 'true');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate('window.__ab.store.getState().session.memory.estimate?.steps?.draft?.thinking'), true);
      await page.select('.workflow-diagrams select', 'cloud');
      await page.select('.workflow-diagrams select', 'workflow');
      assert.equal(await page.$eval(selector, (el) => el.value), 'true');
    });
    await t.test('100 then 200 runs/month each mutate the persistent live region', async () => {
      await seed();
      await page.evaluate(`window.__ab.store.dispatch({type:'workflow/estimate',next:{runsPerMonth:100},now:10})`);
      await page.waitForFunction(`document.querySelector('.app > [role="status"]').textContent.includes('Cost estimate updated.')`);
      await page.evaluate(`(() => {
        window.announcementMutations = 0;
        new MutationObserver(() => window.announcementMutations++).observe(document.querySelector('.app > [role="status"]'),
          {childList:true,subtree:true,characterData:true});
        window.__ab.store.dispatch({type:'workflow/estimate',next:{runsPerMonth:200},now:11});
      })()`);
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      assert.ok(await page.evaluate('window.announcementMutations > 0'));
      assert.equal(await page.evaluate('window.__ab.store.getState().ui.live.seq'), 2);
    });
  } finally { await browser.close(); await server.close(); }
});
