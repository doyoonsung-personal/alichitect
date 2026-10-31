// Response helpers, cookies and the security headers every response carries.

/**
 * Content Security Policy: this origin only, for everything (forms post only to this origin).
 * workerScript: the SPA's module workers (/assets/*.worker-*.js). The diagram router runs libavoid there, whose
 * Emscripten embind glue builds its invokers with new Function, so that script alone also gets 'unsafe-eval'. A
 * dedicated worker takes its policy from its own script's response, so the pages keep the strict policy.
 */
export function csp(https: boolean, workerScript = false): string {
  const d = [
    "default-src 'self'",
    // the diagram router runs libavoid (WebAssembly) in a module worker
    workerScript ? "script-src 'self' 'wasm-unsafe-eval' 'unsafe-eval'" : "script-src 'self' 'wasm-unsafe-eval'",
    "style-src 'self'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
  ];
  if (https) d.push('upgrade-insecure-requests');
  return d.join('; ');
}

/** Adds the security headers to a response (copying it when its headers are immutable). */
export function secure(res: Response, https: boolean, workerScript = false): Response {
  let out = res;
  try {
    out.headers.set('X-Content-Type-Options', 'nosniff');
  } catch {
    out = new Response(res.body, res);
  }
  const h = out.headers;
  h.set('X-Content-Type-Options', 'nosniff');
  h.set('Content-Security-Policy', csp(https, workerScript));
  h.set('X-Frame-Options', 'DENY');
  h.set('Referrer-Policy', 'same-origin');
  h.set('Cross-Origin-Opener-Policy', 'same-origin');
  h.set('Cross-Origin-Resource-Policy', 'same-origin');
  h.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  h.set('X-Robots-Tag', 'noindex, nofollow');
  if (https) h.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  return out;
}

export function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers } });
}

/** A 302 (or 303 after a form post) to a path on this origin. */
export function redirect(to: string, status: 302 | 303 = 302, headers: Array<[string, string]> = []): Response {
  const h = new Headers({ Location: to, 'Cache-Control': 'no-store' });
  for (const [k, v] of headers) h.append(k, v);
  return new Response(null, { status, headers: h });
}

export function html(status: number, body: string, headers: Array<[string, string]> = []): Response {
  const h = new Headers({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  for (const [k, v] of headers) h.append(k, v);
  return new Response(body, { status, headers: h });
}

/** Cookies from a Cookie header. The first occurrence of a name wins. */
export function parseCookies(header: string | null): Map<string, string> {
  const out = new Map<string, string>();
  if (!header) return out;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const name = part.slice(0, eq).trim();
    if (!name || out.has(name)) continue;
    out.set(name, part.slice(eq + 1).trim());
  }
  return out;
}

export interface CookieOptions {
  maxAge: number; // seconds; 0 deletes
  httpOnly?: boolean; // default true
  sameSite?: 'Lax' | 'Strict';
  secure?: boolean; // default true (localhost counts as a secure context in browsers)
}

/** A Set-Cookie value. Names starting with __Host- always get Secure and Path=/ and never a Domain. */
export function cookie(name: string, value: string, o: CookieOptions): string {
  const parts = [`${name}=${value}`, 'Path=/', `Max-Age=${Math.max(0, Math.floor(o.maxAge))}`];
  if (o.maxAge <= 0) parts.push('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
  if (o.httpOnly !== false) parts.push('HttpOnly');
  if (o.secure !== false || name.startsWith('__Host-')) parts.push('Secure');
  parts.push(`SameSite=${o.sameSite ?? 'Lax'}`);
  return parts.join('; ');
}

/** The sign-in pages themselves: never a place to return to after signing in. */
const NO_RETURN = new Set(['/login', '/signup', '/verify', '/verify/resend', '/forgot', '/reset', '/reset/resend']);

/** A path on this site to return to after sign-in, or '/' when the value is anything else (open-redirect guard). */
export function safeNext(v: string | null | undefined): string {
  if (!v || v.length > 1024) return '/';
  if (!v.startsWith('/') || v.startsWith('//') || v.startsWith('/\\') || /[\u0000-\u001f\\]/.test(v)) return '/';
  try {
    const u = new URL(v, 'https://x.invalid');
    if (u.origin !== 'https://x.invalid') return '/';
    if (u.pathname.startsWith('/auth/') || NO_RETURN.has(u.pathname)) return '/';
    const out = u.pathname + u.search;
    // dot-segments collapse in new URL(): /..//evil.com becomes //evil.com, a protocol-relative (off-site) URL
    if (out.startsWith('//')) return '/';
    return out;
  } catch {
    return '/';
  }
}

/** Reads a request body up to `limit` bytes. Returns null when it is larger. */
export async function readBodyLimited(request: Request, limit: number): Promise<Uint8Array | null> {
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > limit) return null;
  if (!request.body) return new Uint8Array(0);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.byteLength;
  }
  return out;
}

/**
 * A posted HTML form (application/x-www-form-urlencoded) up to `limit` bytes, or null when the body is larger. Any other
 * content type reads as an empty form.
 */
export async function readForm(request: Request, limit = 16 * 1024): Promise<URLSearchParams | null> {
  const raw = await readBodyLimited(request, limit);
  if (!raw) return null;
  if (!/^application\/x-www-form-urlencoded\b/i.test(request.headers.get('content-type') ?? '')) return new URLSearchParams();
  return new URLSearchParams(new TextDecoder().decode(raw));
}

export const escapeHtml = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
