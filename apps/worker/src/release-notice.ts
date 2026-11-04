import type { UserRow } from './db.ts';
import type { D1Database, Env } from './env.ts';
import { isSharedAccount } from './env.ts';
import { cookie, escapeHtml as e, html, json, parseCookies } from './http.ts';
import { isLang, LANGS, t, type Lang, type StringKey } from './pages/i18n.ts';
import { footer, shell, type PageCtx } from './pages/layout.ts';
import { appbar } from './pages/views.ts';
import { SESSION_COOKIE, SESSION_TTL_MS } from './session.ts';

// New entries go first. Older releases stay available at /changelog.
const releases = [{ id: '2026-11-pricing-mcp', date: '2026-11-04', title: 'release.entry', sections: pricingAndMcp }] as const;
const RELEASE = releases[0].id;
const FLAG = '__Host-ab_release';
const LANGUAGE_COOKIE = 'ab_release_lang';
const clearFlag = () => cookie(FLAG, '', { maxAge: 0 });
const marker = (user: UserRow) => RELEASE + '.' + user.id;

export async function loginNoticeCookie(db: D1Database, user: UserRow): Promise<string> {
  if (user.status !== 'approved') return clearFlag();
  const seen = await db.prepare('SELECT 1 FROM release_notices WHERE user_id=? AND release_id=?')
    .bind(user.id, RELEASE).first();
  return seen ? clearFlag() : cookie(FLAG, marker(user), { maxAge: SESSION_TTL_MS / 1000 });
}

/** Load the notice on the actual page the user signed in to, including a private design link.
 * The browser claims it once the tab is visible. Prefetches and redirects never consume it. */
export async function attachLoginNotice(req: Request, res: Response): Promise<Response> {
  if (req.method !== 'GET' || res.status !== 200 || !res.headers.get('Content-Type')?.startsWith('text/html')) return res;
  const cookies = parseCookies(req.headers.get('Cookie'));
  if (!cookies.has(SESSION_COOKIE)) return res;
  const url = new URL(req.url);
  const preview = (url.pathname === '/account' || url.pathname === '/') && url.searchParams.get('whats-new') === '1';
  if (!preview && !cookies.get(FLAG)?.startsWith(RELEASE + '.')) return res;
  const assets = `<link rel="stylesheet" href="/updates/login-notice.css"><script defer src="/updates/login-notice.js"${preview ? ' data-preview' : ''}></script>`;
  const body = (await res.text()).replace('</head>', assets + '</head>');
  const headers = new Headers(res.headers);
  headers.delete('Content-Length');
  headers.delete('Content-Encoding');
  headers.delete('ETag');
  headers.set('Cache-Control', 'no-store');
  return new Response(body, { status: res.status, headers });
}

export async function claimLoginNotice(request: Request, env: Env, user: UserRow, lang: Lang): Promise<Response> {
  const preview = new URL(request.url).searchParams.get('preview') === '1';
  const headers: Record<string, string> = { 'Cache-Control': 'no-store' };
  const eligibleLogin = parseCookies(request.headers.get('Cookie')).get(FLAG) === marker(user);
  if (eligibleLogin) {
    headers['Set-Cookie'] = clearFlag();
    const claim = await env.DB.prepare('INSERT INTO release_notices(user_id,release_id,shown_at) VALUES (?,?,?) ON CONFLICT DO NOTHING')
      .bind(user.id, RELEASE, Date.now()).run();
    if (!preview && claim.meta.changes !== 1) return new Response(null, { status: 204, headers });
  } else if (!preview) return new Response(null, { status: 204, headers });
  const personal = !isSharedAccount(env, user.email);
  const selected = updateLanguage(request, lang);
  const translations = Object.fromEntries(LANGS.map(l => [l, dialogContent(l, personal)]));
  return json(200, { lang: selected, content: translations[selected], translations, languageCookie: LANGUAGE_COOKIE }, headers);
}

function updateLanguage(request: Request, fallback: Lang): Lang {
  const params = new URL(request.url).searchParams;
  const explicit = params.get('lang');
  const saved = parseCookies(request.headers.get('Cookie')).get(LANGUAGE_COOKIE);
  const pageLang = params.get('fallbackLang');
  return [explicit, saved, pageLang].find(isLang) ?? fallback;
}

function pricingAndMcp(lang: Lang, personal: boolean): string {
  const L = (key: StringKey) => e(t(lang, key));
  // Reserve the captured image size so opening the first example doesn't move the second control as it loads.
  const example = (feature: 'pricing' | 'keys', alt: StringKey) => {
    const width = feature === 'pricing' ? 610 : 890;
    const height = feature === 'pricing' ? { en: 395, ko: 423, zh: 394 }[lang] : { en: 371, ko: 401, zh: 374 }[lang];
    return `<details><summary>${L('release.example')}</summary>
      <img loading="lazy" width="${width}" height="${height}" src="/updates/${feature}-${lang}.webp" alt="${L(alt)}"></details>`;
  };
  // Only localized, escaped application copy and fixed same-origin links are inserted.
  return `<section><h3>${L('release.pricing')}</h3><p>${L('release.pricingHow')}</p>${example('pricing','release.pricingAlt')}</section>
    <section><h3>${L('release.mcp')}</h3><p>${L(personal ? 'release.mcpHow' : 'release.shared')}</p>
    ${personal ? example('keys','release.keysAlt') : ''}</section>`;
}

function dialogContent(lang: Lang, personal: boolean): string {
  const L = (key: StringKey) => e(t(lang, key));
  const names = { en: 'English', ko: '한국어', zh: '中文' };
  return `<header><h2 id="ab-release-title">${L('release.title')}</h2>
    <button type="button" data-minimize aria-label="${L('release.minimize')}" title="${L('release.minimize')}">−</button></header>
    <div class="ab-release-language" role="group" aria-label="${L('release.language')}">
    ${LANGS.map(l => `<button type="button" lang="${l}" data-language="${l}" aria-pressed="${l === lang}">${names[l]}</button>`).join('')}</div>
    ${releases[0].sections(lang, personal)}
    <footer>${personal ? `<a href="/account/keys">${L('release.openGuide')}</a>` : ''}
    <button type="button" autofocus data-minimize class="ab-release-done">${L('release.minimize')}</button></footer>`;
}

export function changelogPage(request: Request, env: Env, user: UserRow, page: PageCtx): Response {
  const lang = updateLanguage(request, page.lang);
  const ctx = { ...page, lang };
  const title = t(lang, 'release.changelog');
  const personal = !isSharedAccount(env, user.email);
  const dates = new Intl.DateTimeFormat(lang, { dateStyle: 'long', timeZone: 'UTC' });
  const entries = releases.map(r => `<article class="section release-entry" id="${e(r.id)}">
    <time datetime="${r.date}">${e(dates.format(new Date(r.date)))}</time>
    <h2>${e(t(lang, r.title))}</h2>${r.sections(lang, personal)}</article>`).join('');
  const headers: Array<[string, string]> = [];
  if (isLang(new URL(request.url).searchParams.get('lang'))) {
    headers.push(['Set-Cookie', cookie(LANGUAGE_COOKIE, lang, { maxAge: 365 * 86400, httpOnly: false })]);
  }
  return html(200, shell(ctx, { title, bodyClass: 'page page--changelog', body: `${appbar(ctx, user, 'release.changelog')}
    <main class="account" id="main"><h1 class="title">${e(title)}</h1>
    <p><a href="/?whats-new=1">${e(t(lang, 'release.preview'))}</a></p>${entries}
    ${personal ? `<p><a href="/account/keys">${e(t(lang, 'release.openGuide'))}</a></p>` : ''}</main>${footer(ctx)}` }), headers);
}
