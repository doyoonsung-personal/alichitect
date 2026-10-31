// alichitect Worker: one Worker for https://architect.alikorea-demo.com. With run_worker_first, every request comes
// here before the static assets, and this file decides who may see what:
//
//   public          GET /login, /auth/google, /auth/callback, POST /auth/logout, GET /api/health, /robots.txt,
//                   /_auth/* (the sign-in pages' CSS, script and Google mark), the two Alibaba Cloud logo files
//   signed in       GET and POST /pending (request access with a note, see the status, sign out)
//   approved        the SPA (apps/web/dist), POST /api/turn, GET /api/me
//   admin           /admin, POST /admin/users/:id/:action, /admin/api/*
//
// Pages answer 302 (to /login or /pending); the API answers 401 or 403 JSON (POST /api/turn's body is a fatal
// ServerEvent, so the SPA shows it). GET /api/health is public but anonymous callers only learn { ok: true }. State-changing requests must come from this origin (Origin check; Sec-Fetch-Site
// when sent) and the session cookie is SameSite=Lax. Every response carries the security headers (http.ts secure).
import type { Env, ExecutionContextLike } from './env.ts';
import { allowedOrigin, sessionSecret, turnsPerDay } from './env.ts';
import { cookie, html, json, redirect, safeNext, secure } from './http.ts';
import { finishSignIn, providerFor, signOut, startSignIn } from './auth.ts';
import type { LoginError } from './auth.ts';
import { FAKE_PREFIX, fakeGoogleAllowed, handleFakeGoogle } from './fake-google.ts';
import { currentUser } from './session.ts';
import type { Signed } from './session.ts';
import * as db from './db.ts';
import { FLASH_COOKIE, adminApi, adminFormAction, adminNotice, submitAccessRequest } from './admin.ts';
import { handleTurn, health, reject, sharedTurnState, workerFatalMessage } from './turn.ts';
import { authAsset } from './pages/assets.ts';
import { LANG_COOKIE, isLang, langOfRequest } from './pages/i18n.ts';
import { adminPage, loginPage, pendingPage } from './pages/views.ts';
import type { LoginNotice, PendingNotice } from './pages/views.ts';
import type { PageCtx } from './pages/layout.ts';

const PUBLIC_ASSETS = new Set(['/brand/alibaba-cloud-logo-en.svg', '/brand/alibaba-cloud-logo-zh.svg']);
const LANG_PAGES = new Set(['/login', '/pending', '/admin']);
const LOGIN_ERRORS: ReadonlySet<string> = new Set<LoginError>(['cancelled', 'expired', 'failed', 'unverified', 'account', 'config']);
const STATIC_RE = /\.(?:js|mjs|css|wasm|woff2?|ttf|otf|svg|png|jpe?g|gif|webp|ico|map|txt|json)$/i;
const LAST_SEEN_EVERY_MS = 5 * 60_000;
/** The SPA's module workers (Vite names them name.worker-hash.js): see csp() in http.ts. */
const WORKER_SCRIPT_RE = /^\/assets\/[\w.-]+\.worker-[\w-]+\.js$/;

const isApi = (p: string): boolean => p.startsWith('/api/') || p.startsWith('/admin/api/');
const isGet = (m: string): boolean => m === 'GET' || m === 'HEAD';
/** Static files of the SPA: may use the 15 s session cache. Pages, the API and the admin area never do. */
const isStatic = (p: string, m: string): boolean => isGet(m) && !isApi(p) && !p.startsWith('/admin') && (p.startsWith('/assets/') || STATIC_RE.test(p));

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContextLike): Promise<Response> {
    const url = new URL(request.url);
    let res: Response;
    try {
      res = await route(request, env, ctx, url);
    } catch (e) {
      console.error(JSON.stringify({ evt: 'unhandled', path: url.pathname.slice(0, 100), error: (e as Error)?.name ?? 'error' }));
      res = isApi(url.pathname) ? json(500, { type: 'fatal', code: 'internal', message: 'Something went wrong on the server. Please try again.', retryable: true }) : html(500, '<!doctype html><title>Error</title><p>Something went wrong. Please try again.</p>');
    }
    return secure(res, url.protocol === 'https:', WORKER_SCRIPT_RE.test(url.pathname) && res.status === 200);
  },
};

/** The page context: language (and whether it was chosen), the current path, the catalog date for the footer. */
function pageCtx(request: Request, url: URL): PageCtx {
  const { lang, chosen } = langOfRequest(request, url);
  return { lang, chosen: !!chosen, here: url.pathname + url.search, catalogVersion: sharedTurnState().catalog.version };
}

function sameOriginWrite(request: Request, origin: string): boolean {
  const o = request.headers.get('Origin');
  if (!o || o.toLowerCase() !== origin) return false;
  const site = request.headers.get('Sec-Fetch-Site');
  return site === null || site === 'same-origin';
}

/** 401 for the API (a fatal event for /api/turn), else a 302 to /login that returns here afterwards. */
function needSignIn(request: Request, url: URL): Response {
  if (url.pathname === '/api/turn') return reject(401, 'signed-out', workerFatalMessage('signed-out', langOfRequest(request, url).lang));
  if (isApi(url.pathname) || !isGet(request.method)) return json(401, { error: 'signed-out', message: 'Sign in first', login: '/login' });
  const next = safeNext(url.pathname + url.search);
  return redirect(next === '/' ? '/login' : `/login?next=${encodeURIComponent(next)}`);
}

async function route(request: Request, env: Env, ctx: ExecutionContextLike, url: URL): Promise<Response> {
  const origin = allowedOrigin(env);
  const path = url.pathname;
  const method = request.method.toUpperCase();
  if (!origin) return html(500, '<!doctype html><title>Not configured</title><p>ALLOWED_ORIGIN is not set.</p>');

  // one origin only: anything else is sent to the canonical address (pages) or refused
  if (url.origin.toLowerCase() !== origin) {
    if (isGet(method) && !isApi(path)) return redirect(`${origin}${path}${url.search}`);
    return json(421, { error: 'wrong-origin', message: `use ${origin}` });
  }
  if (!isGet(method) && !sameOriginWrite(request, origin)) return json(403, { error: 'cross-site', message: 'Cross-site request refused' });

  // ---------- public ----------
  if (path === '/api/health') {
    if (!isGet(method)) return json(405, { error: 'method-not-allowed' }, { Allow: 'GET' });
    // Anyone may ask whether the Worker is up; the model, upstream host, limits and key state are for approved users
    // (the SPA reads them after sign-in).
    const s = sessionSecret(env) ? await currentUser(request, env, { fresh: true }) : null;
    return s && s.user.status === 'approved' ? health(env) : json(200, { ok: true });
  }
  if (path.startsWith('/_auth/') || path === '/robots.txt') return (isGet(method) && authAsset(path)) || json(404, { error: 'not-found' });
  if (PUBLIC_ASSETS.has(path)) return isGet(method) ? env.ASSETS.fetch(request) : json(405, { error: 'method-not-allowed' });
  if (path === '/favicon.ico') return new Response(null, { status: 404 });
  if (path.startsWith(`${FAKE_PREFIX}/`)) return fakeGoogleAllowed(env, url) && isGet(method) ? handleFakeGoogle(env, url) : json(404, { error: 'not-found' });
  if (path.startsWith('/auth/')) {
    if (!sessionSecret(env)) return redirect('/login?error=config');
    if (path === '/auth/google' && isGet(method)) return startSignIn(env, url, providerFor(env, url));
    if (path === '/auth/callback' && isGet(method)) return finishSignIn(request, env, url, providerFor(env, url), ctx);
    if (path === '/auth/logout' && method === 'POST') return signOut(request, env);
    return json(405, { error: 'method-not-allowed' });
  }

  // ?lang= on one of the server-rendered pages: remember the choice in a cookie and come back without it. Only these
  // exact paths, so the redirect can never point anywhere else (a path such as //evil.example would be off-site).
  const langParam = url.searchParams.get('lang');
  if (isGet(method) && LANG_PAGES.has(path) && isLang(langParam)) {
    const clean = new URL(url);
    clean.searchParams.delete('lang');
    return redirect(clean.pathname + clean.search, 302, [['Set-Cookie', cookie(LANG_COOKIE, langParam, { maxAge: 365 * 86400, httpOnly: true, secure: url.protocol === 'https:' })]]);
  }

  if (path === '/login') {
    if (!isGet(method)) return json(405, { error: 'method-not-allowed' });
    const s = sessionSecret(env) ? await currentUser(request, env, { fresh: true }) : null;
    const next = safeNext(url.searchParams.get('next'));
    if (s) return redirect(s.user.status === 'approved' ? next : '/pending');
    const err = url.searchParams.get('error');
    const n: LoginNotice = err && LOGIN_ERRORS.has(err) ? (err as LoginNotice) : url.searchParams.get('signed_out') ? 'signed-out' : !sessionSecret(env) ? 'config' : null;
    return html(200, loginPage(pageCtx(request, url), { next, notice: n }));
  }

  // ---------- signed in ----------
  const signed: Signed | null = sessionSecret(env) ? await currentUser(request, env, { fresh: !isStatic(path, method) }) : null;
  if (!signed) return needSignIn(request, url);
  const me = signed.user;
  const now = Date.now();
  if (!me.last_seen_at || now - me.last_seen_at > LAST_SEEN_EVERY_MS) ctx.waitUntil(db.touchLastSeen(env.DB, me.id, now).catch(() => undefined));

  if (path === '/pending') {
    if (me.status === 'approved') return redirect('/');
    if (method === 'POST') return submitAccessRequest(request, env, ctx, me);
    if (!isGet(method)) return json(405, { error: 'method-not-allowed' });
    const n = url.searchParams.get('n');
    return html(200, pendingPage(pageCtx(request, url), { user: me, notice: n === 'sent' || n === 'updated' ? (n as PendingNotice) : null }));
  }

  if (me.status !== 'approved') {
    if (path === '/api/turn') return reject(403, 'not-approved', workerFatalMessage('not-approved', langOfRequest(request, url).lang));
    if (isApi(path) || !isGet(method)) return json(403, { error: 'not-approved', status: me.status, message: 'This account is not approved', pending: '/pending' });
    return redirect('/pending');
  }

  // ---------- approved ----------
  if (path === '/api/me') {
    if (!isGet(method)) return json(405, { error: 'method-not-allowed' }, { Allow: 'GET' });
    const isAdmin = me.role === 'admin';
    return json(200, {
      email: me.email,
      name: me.name,
      picture: me.picture,
      role: me.role,
      status: me.status,
      turnsToday: await db.turnsToday(env.DB, me.id, now),
      turnsPerDay: isAdmin ? null : turnsPerDay(env),
      links: { admin: isAdmin ? '/admin' : null, signOut: '/auth/logout' },
    });
  }
  if (path === '/api/turn') return method === 'POST' ? handleTurn(request, env, ctx, me) : reject(405, 'method-not-allowed', 'use POST', { Allow: 'POST' });
  if (path.startsWith('/api/')) return json(404, { error: 'not-found', message: 'no such route' });

  // ---------- admin ----------
  if (path === '/admin' || path === '/admin/' || path.startsWith('/admin/')) {
    if (me.role !== 'admin') return path.startsWith('/admin/api/') || !isGet(method) ? json(403, { error: 'admins-only', message: 'Admins only' }) : redirect('/');
    if (path.startsWith('/admin/api/')) return adminApi(request, env, ctx, me, path, now);
    const m = /^\/admin\/users\/([A-Za-z0-9_-]{1,64})\/([a-z]{1,16})$/.exec(path);
    if (m && method === 'POST') return adminFormAction(env, ctx, me, m[1], m[2], now);
    if ((path === '/admin' || path === '/admin/') && isGet(method)) {
      const c = pageCtx(request, url);
      const [users, audit, flash] = await Promise.all([db.listUsers(env.DB, now), db.recentAudit(env.DB, 30), adminNotice(env, request, now)]);
      // the notice is shown once: its cookie is cleared with this page
      const clear: Array<[string, string]> = flash.present ? [['Set-Cookie', cookie(FLASH_COOKIE, '', { maxAge: 0 })]] : [];
      return html(200, adminPage(c, { me, users, audit, turnsPerDay: turnsPerDay(env), notice: flash.notice }), clear);
    }
    return json(404, { error: 'not-found' });
  }

  // ---------- the SPA ----------
  if (!isGet(method)) return json(405, { error: 'method-not-allowed' });
  return spaAsset(request, env, path);
}

async function spaAsset(request: Request, env: Env, path: string): Promise<Response> {
  const res = await env.ASSETS.fetch(request);
  if (res.status === 404) return html(404, notFoundPage());
  const out = new Response(res.body, res);
  if (path.startsWith('/assets/')) out.headers.set('Cache-Control', 'private, max-age=31536000, immutable');
  else out.headers.set('Cache-Control', 'private, no-cache');
  return out;
}

const notFoundPage = (): string =>
  '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Not found</title><link rel="stylesheet" href="/_auth/pages.css"></head><body class="page page--centre"><main class="centre"><h1 class="title">Not found</h1><p class="lead"><a href="/">Architecture Builder</a></p></main></body></html>';

