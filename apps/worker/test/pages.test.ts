// The server-rendered pages: three languages with the same keys and placeholders, the app's tokens copied in sync,
// user text escaped, no inline script or style (the CSP allows neither), and forms that never echo a password.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EN, KO, ZH } from '../src/pages/strings.ts';
import { langFromAcceptLanguage } from '../src/pages/i18n.ts';
import { THEME_JS, TOKENS_CSS } from '../src/pages/tokens.ts';
import { SOURCE, THEME_SOURCE, render } from '../scripts/sync-tokens.ts';
import { PAGES_CSS, PAGES_JS, authAsset } from '../src/pages/assets.ts';
import worker from '../src/index.ts';
import { ADMIN, Browser, PASSWORD, makeCtx, makeEnv, req, signIn } from './helpers.ts';

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
  test("the pages carry apps/web's tokens.css and theme.js verbatim (run npm run sync:tokens after changing them)", () => {
    const generated = render(readFileSync(SOURCE, 'utf8'), readFileSync(THEME_SOURCE, 'utf8')).split('\n');
    assert.equal(`export const TOKENS_CSS = ${JSON.stringify(TOKENS_CSS)};`, generated[1]);
    assert.equal(`export const THEME_JS = ${JSON.stringify(THEME_JS)};`, generated[2]);
    assert.ok(PAGES_CSS.startsWith(TOKENS_CSS));
    for (const v of ['--action: #1354ee', '--brand-orange: #ff6a00', '--ink: #181818', '--r-control: 0px']) assert.ok(PAGES_CSS.includes(v), v);
  });

  test('both themes: the dark layer for a chosen Dark and for System on a dark device, and the controls on its roles', () => {
    assert.match(PAGES_CSS, /:root\[data-theme="dark"\] \{\s*color-scheme: dark;/);
    assert.match(PAGES_CSS, /@media \(prefers-color-scheme: dark\) \{\s*:root:not\(\[data-theme="light"\]\) \{\s*color-scheme: dark;/);
    const own = PAGES_CSS.slice(TOKENS_CSS.length);
    assert.match(own, /\.btn--primary \{[^}]*background: var\(--action-fill\)/);
    // a numeral or label on an ink, ok or danger square uses --on-ink, which turns dark when the square turns light
    assert.doesNotMatch(own, /background: var\(--(rev-tag|ok|danger)\);[^}]*color: var\(--on-action\)/);
  });

  test('the chosen segment and the current appbar link carry a 3:1 rule, not only the 1.1:1 soft fill', () => {
    const own = PAGES_CSS.slice(TOKENS_CSS.length);
    assert.match(own, /\.seg__btn\[aria-current="true"\], \.seg__btn\[aria-pressed="true"\] \{[^}]*box-shadow: inset 0 -2px 0 var\(--action\)/);
    assert.match(own, /\.appbar__me\[aria-current="page"\] \{[^}]*box-shadow: inset 0 -2px 0 var\(--action\)/);
  });

  test('theme.js is served from /_auth/ as a script, and the pages script drives the account page control', async () => {
    const res = authAsset('/_auth/theme.js');
    assert.ok(res);
    assert.match(res.headers.get('Content-Type') ?? '', /javascript/);
    assert.equal(await res.text(), THEME_JS);
    assert.match(THEME_JS, /localStorage\.getItem\('ab\.theme'\)/);
    assert.match(PAGES_JS, /const THEME_KEY = 'ab\.theme'/);
    assert.match(PAGES_JS, /data-theme-control/);
    assert.match(PAGES_JS, /prefers-reduced-motion: reduce/);
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

  /** Every page, as its visitor sees it. */
  async function everyPage(env: ReturnType<typeof makeEnv>): Promise<Record<string, string>> {
    const admin = await signIn(env, ADMIN);
    const pending = await signIn(env, 'p@example.com');
    const signer = new Browser(env);
    await signer.post('/signup', { name: 'N', email: 'n@example.com', password: PASSWORD });
    const resetter = new Browser(env, '198.51.100.9');
    await resetter.post('/forgot', { email: 'p@example.com' });
    return {
      login: await call(env, req('/login')),
      signup: await call(env, req('/signup')),
      verify: await signer.text('/verify'),
      forgot: await call(env, req('/forgot')),
      reset: await resetter.text('/reset'),
      pending: await call(env, req('/pending', { cookie: pending.cookie })),
      account: await call(env, req('/account', { cookie: admin.cookie })),
      admin: await call(env, req('/admin', { cookie: admin.cookie })),
    };
  }

  test('pages use only external script and style (CSP-compatible), the official logo and the lockup', async () => {
    const env = makeEnv();
    for (const [name, html] of Object.entries(await everyPage(env))) {
      assert.match(html, /<title>[^<]+ · Architecture Builder<\/title>/, name);
      assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>/, 'no inline script');
      assert.doesNotMatch(html, /<style\b|\sstyle="/, 'no inline style');
      assert.doesNotMatch(html, /\son[a-z]+="/, 'no inline handlers');
      assert.match(html, /\/brand\/alibaba-cloud-logo-(en|zh)\.svg/);
      assert.match(html, /Architecture Builder/);
    }
  });

  test('forms post to this origin only, and no password ever comes back in a page', async () => {
    const env = makeEnv();
    for (const [name, html] of Object.entries(await everyPage(env))) {
      for (const m of html.matchAll(/<form\b[^>]*action="([^"]*)"/g)) assert.match(m[1], /^\/[a-z]/, `${name}: ${m[1]}`);
      for (const m of html.matchAll(/<input\b[^>]*type="password"[^>]*>/g)) assert.doesNotMatch(m[0], /\svalue=/, `${name}: ${m[0]}`);
    }
    const b = new Browser(env, '198.51.100.20');
    const back = await (await b.post('/signup', { name: '', email: 'x@example.com', password: 'sekret-not-echoed' })).text();
    assert.doesNotMatch(back, /sekret-not-echoed/);
    const login = await (await b.post('/login', { email: 'x@example.com', password: 'sekret-not-echoed' })).text();
    assert.doesNotMatch(login, /sekret-not-echoed/);
  });

  test('every page applies the stored theme before its stylesheet, and the account page offers Light, Dark and System', async () => {
    const env = makeEnv();
    const p = await everyPage(env);
    for (const [name, html] of Object.entries(p)) {
      const head = html.slice(0, html.indexOf('</head>'));
      const js = head.indexOf('<script src="/_auth/theme.js"></script>');
      assert.ok(js > 0, `${name}: theme.js in <head>, blocking (no defer)`);
      assert.ok(js < head.indexOf('/_auth/pages.css'), `${name}: before the stylesheet`);
    }
    // the control sits in a section only the script reveals: without script the device decides
    assert.match(p.account, /<section class="section" aria-labelledby="h-theme" data-theme-control hidden>/);
    for (const c of ['light', 'dark', 'system']) assert.match(p.account, new RegExp(`<button class="seg__btn" type="button" data-theme-choice="${c}" aria-pressed="(true|false)">`));
    assert.match(p.account, /role="group" aria-labelledby="h-theme"/);
    assert.doesNotMatch(p.login, /data-theme-choice/);
  });

  test('the fields carry the autocomplete hints password managers and phones use', async () => {
    const env = makeEnv();
    const p = await everyPage(env);
    assert.match(p.login, /autocomplete="username"[^>]*type="email"/);
    assert.match(p.login, /autocomplete="current-password"/);
    assert.match(p.signup, /autocomplete="new-password"/);
    assert.match(p.verify, /autocomplete="one-time-code"[^>]*inputmode="numeric"/);
    assert.match(p.reset, /autocomplete="one-time-code"/);
    assert.match(p.reset, /autocomplete="new-password"/);
    assert.match(p.account, /autocomplete="current-password"/);
  });

  test('sign-in fields precede the recovery link in keyboard order', async () => {
    const page = await call(makeEnv(), req('/login'));
    assert.match(page, /name="email"[^>]*>[\s\S]*?name="password"[^>]*>[\s\S]*?href="\/forgot"[\s\S]*?type="submit"/);
  });

  test('every page reads in Korean and Chinese too', async () => {
    const env = makeEnv();
    for (const [lang, word] of [['ko', /로그인|계정|비밀번호|이메일/], ['zh', /登录|账号|密码|邮箱/]] as const) {
      for (const p of ['/login', '/signup', '/forgot']) {
        const html = await call(env, req(p, { headers: { Cookie: `ab_lang=${lang}` } }));
        assert.match(html, new RegExp(`<html lang="${lang}"`), p);
        assert.match(html, word, `${lang} ${p}`);
      }
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
