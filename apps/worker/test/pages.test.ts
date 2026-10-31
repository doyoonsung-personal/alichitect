// The server-rendered pages: three languages with the same keys and placeholders, the app's tokens copied in sync,
// user text escaped, and no inline script or style (the CSP allows neither).
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EN, KO, ZH } from '../src/pages/strings.ts';
import { langFromAcceptLanguage } from '../src/pages/i18n.ts';
import { TOKENS_CSS } from '../src/pages/tokens.ts';
import { SOURCE, render } from '../scripts/sync-tokens.ts';
import { PAGES_CSS } from '../src/pages/assets.ts';
import worker from '../src/index.ts';
import { ADMIN, makeCtx, makeEnv, req, signIn } from './helpers.ts';

const ph = (s: string): string => (s.match(/\{\w+\}/g) ?? []).sort().join(',');

describe('strings', () => {
  test('ko and zh have every English key, with the same placeholders, and nothing left in English by accident', () => {
    for (const [name, table] of [['ko', KO], ['zh', ZH]] as const) {
      assert.deepEqual(Object.keys(table).sort(), Object.keys(EN).sort(), name);
      for (const k of Object.keys(EN) as Array<keyof typeof EN>) {
        assert.equal(ph(table[k]), ph(EN[k]), `${name} ${k}`);
        if (/[a-z]{4,} [a-z]{4,} [a-z]{4,}/.test(EN[k]) && !k.startsWith('audit.seed')) assert.notEqual(table[k], EN[k], `${name} ${k} untranslated`);
      }
    }
  });

  test('Accept-Language picks en, ko or zh by weight', () => {
    assert.equal(langFromAcceptLanguage('ko-KR,ko;q=0.9,en-US;q=0.8'), 'ko');
    assert.equal(langFromAcceptLanguage('en-US,en;q=0.9,zh-CN;q=0.8'), 'en');
    assert.equal(langFromAcceptLanguage('fr-FR,zh-TW;q=0.5,ko;q=0.4'), 'zh');
    assert.equal(langFromAcceptLanguage('fr'), null);
    assert.equal(langFromAcceptLanguage(null), null);
  });
});

describe('design tokens', () => {
  test("the pages carry apps/web's tokens.css verbatim (run npm run sync:tokens after changing it)", () => {
    const css = readFileSync(SOURCE, 'utf8');
    assert.equal(`export const TOKENS_CSS = ${JSON.stringify(TOKENS_CSS)};`, render(css).split('\n')[1]);
    assert.ok(PAGES_CSS.startsWith(TOKENS_CSS));
    for (const v of ['--action: #1354ee', '--brand-orange: #ff6a00', '--ink: #181818', '--r-control: 0px']) assert.ok(PAGES_CSS.includes(v), v);
  });

  test('no gradients, glows or rounded controls slipped into the page CSS', () => {
    const own = PAGES_CSS.slice(TOKENS_CSS.length);
    assert.doesNotMatch(own, /gradient\(/);
    assert.doesNotMatch(own, /border-radius:(?!\s*var\()/);
  });
});

describe('rendered pages', () => {
  const call = async (env: ReturnType<typeof makeEnv>, r: Request): Promise<string> => {
    const ctx = makeCtx();
    const res = await worker.fetch(r, env, ctx);
    await ctx.flush();
    return res.text();
  };

  test('user text is escaped everywhere it appears', async () => {
    const env = makeEnv();
    const admin = await signIn(env, ADMIN);
    const evil = await signIn(env, 'evil@example.com', { name: '<img src=x onerror=alert(1)>' });
    await env.DB.prepare('UPDATE users SET note = ?, requested_at = ? WHERE id = ?').bind('</textarea><script>alert(2)</script>', Date.now(), evil.user.id).run();
    for (const html of [await call(env, req('/admin', { cookie: admin.cookie })), await call(env, req('/pending', { cookie: evil.cookie }))]) {
      assert.ok(!html.includes('<script>alert'), 'no live script');
      assert.ok(!html.includes('<img src=x'), 'no live tag');
      assert.ok(html.includes('&lt;/textarea&gt;&lt;script&gt;') || html.includes('&lt;img src=x'), 'shown as text');
    }
  });

  test('pages use only external script and style (CSP-compatible), the official logo and the lockup', async () => {
    const env = makeEnv();
    const admin = await signIn(env, ADMIN);
    const pending = await signIn(env, 'p@example.com');
    for (const html of [await call(env, req('/login')), await call(env, req('/pending', { cookie: pending.cookie })), await call(env, req('/admin', { cookie: admin.cookie }))]) {
      assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>/, 'no inline script');
      assert.doesNotMatch(html, /<style\b|\sstyle="/, 'no inline style');
      assert.doesNotMatch(html, /\son[a-z]+="/, 'no inline handlers');
      assert.match(html, /\/brand\/alibaba-cloud-logo-(en|zh)\.svg/);
      assert.match(html, /Architecture Builder/);
    }
  });

  test('the admin page lists requests first, with approve and decline', async () => {
    const env = makeEnv();
    const admin = await signIn(env, ADMIN);
    const p = await signIn(env, 'p@example.com', { requested: true });
    const html = await call(env, req('/admin', { cookie: admin.cookie }));
    assert.ok(html.indexOf('p@example.com') < html.indexOf('id="approved"'));
    assert.match(html, new RegExp(`action="/admin/users/${p.user.id}/approve"`));
    assert.match(html, new RegExp(`action="/admin/users/${p.user.id}/deny" data-confirm=`));
    assert.match(html, /disabled title="The last admin cannot be removed\."/, 'the only admin cannot be demoted');
  });
});
