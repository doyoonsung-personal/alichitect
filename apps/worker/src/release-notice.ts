import type { UserRow } from './db.ts';
import type { D1Database, Env } from './env.ts';
import { isSharedAccount } from './env.ts';
import { cookie, escapeHtml as e, json, parseCookies } from './http.ts';
import { t, type Lang, type StringKey } from './pages/i18n.ts';
import { SESSION_COOKIE, SESSION_TTL_MS } from './session.ts';

const RELEASE = '2026-11-pricing-mcp';
const FLAG = '__Host-ab_release';
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
  const preview = url.pathname === '/account' && url.searchParams.get('whats-new') === '1';
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
  const L = (key: StringKey) => e(t(lang, key));
  const personal = !isSharedAccount(env, user.email);
  // Reserve the captured image size so opening the first example doesn't move the second control as it loads.
  const example = (feature: 'pricing' | 'keys', alt: StringKey) => {
    const width = feature === 'pricing' ? 610 : 890;
    const height = feature === 'pricing' ? { en: 395, ko: 423, zh: 394 }[lang] : { en: 371, ko: 401, zh: 374 }[lang];
    return `<details><summary>${L('release.example')}</summary>
      <img loading="lazy" width="${width}" height="${height}" src="/updates/${feature}-${lang}.webp" alt="${L(alt)}"></details>`;
  };
  // Only localized, escaped application copy and fixed same-origin links are inserted.
  const content = `<header><h2 id="ab-release-title">${L('release.title')}</h2>
    <form method="dialog"><button aria-label="${L('release.close')}">×</button></form></header>
    <section><h3>${L('release.pricing')}</h3><p>${L('release.pricingHow')}</p>${example('pricing','release.pricingAlt')}</section>
    <section><h3>${L('release.mcp')}</h3><p>${L(personal ? 'release.mcpHow' : 'release.shared')}</p>
    ${personal ? example('keys','release.keysAlt') : ''}</section>
    <footer>${personal ? `<a href="/account/keys">${L('release.openGuide')}</a>` : ''}
    <form method="dialog"><button autofocus class="ab-release-done">${L('release.done')}</button></form></footer>`;
  return json(200, { content }, headers);
}
