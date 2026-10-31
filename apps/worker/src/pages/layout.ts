// Shared HTML for the server-rendered pages: the document shell, the lockup, the language switch and small parts.
// Every dynamic value goes through escapeHtml.
import { escapeHtml as e } from '../http.ts';
import { LANGS, LANG_NAMES, t } from './i18n.ts';
import type { Lang, StringKey } from './i18n.ts';

/** The catalog date shown in the footer (packages/core/catalog version). */
export interface PageCtx {
  lang: Lang;
  /** The user chose the language (cookie or ?lang=), so the script mirrors it into the SPA's storage. */
  chosen: boolean;
  /** Path and query of this page, for the language links. */
  here: string;
  catalogVersion: string;
}

const LOGO: Record<Lang, { file: string; w: number }> = {
  en: { file: '/brand/alibaba-cloud-logo-en.svg', w: 237 },
  ko: { file: '/brand/alibaba-cloud-logo-en.svg', w: 237 },
  zh: { file: '/brand/alibaba-cloud-logo-zh.svg', w: 135 },
};

export function shell(c: PageCtx, o: { title: string; bodyClass: string; body: string }): string {
  const title = o.title;
  return `<!doctype html>
<html lang="${c.lang}"${c.chosen ? ' data-lang-chosen="1"' : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="same-origin">
<title>${e(title)} · ${e(t(c.lang, 'app.name'))}</title>
<link rel="icon" href="/brand/alibaba-cloud-logo-en.svg" type="image/svg+xml">
<link rel="stylesheet" href="/_auth/pages.css">
<script src="/_auth/pages.js" defer></script>
</head>
<body class="${e(o.bodyClass)}">
${o.body}
</body>
</html>`;
}

export function lockup(c: PageCtx, size: 'landing' | 'header', o: { href?: string; tag?: 'h1' | 'div' } = {}): string {
  const logo = LOGO[c.lang];
  const h = size === 'landing' ? 32 : 18;
  const inner = `<img class="lockup__logo" src="${logo.file}" alt="Alibaba Cloud" width="${Math.round((logo.w * h) / 32)}" height="${h}"><span class="lockup__rule" aria-hidden="true"></span><span class="lockup__name">${e(t(c.lang, 'app.name'))}</span>${size === 'landing' ? '<span class="cursor" aria-hidden="true"></span>' : ''}`;
  if (o.href) return `<a class="lockup lockup--${size}" href="${e(o.href)}">${inner}</a>`;
  const tag = o.tag ?? 'div';
  return `<${tag} class="lockup lockup--${size}">${inner}</${tag}>`;
}

/** EN | 한국어 | 中文 as links that set the language (the server stores the choice in a cookie). */
export function langSwitch(c: PageCtx): string {
  const links = LANGS.map((l) => {
    const u = new URL(c.here, 'https://x.invalid');
    u.searchParams.set('lang', l);
    return `<a class="seg__btn" lang="${l}" href="${e(u.pathname + u.search)}"${l === c.lang ? ' aria-current="true"' : ''}>${e(LANG_NAMES[l])}</a>`;
  }).join('');
  return `<nav class="seg" aria-label="${e(t(c.lang, 'lang.label'))}">${links}</nav>`;
}

export function footer(c: PageCtx): string {
  return `<footer class="foot">${e(t(c.lang, 'app.footer', { date: c.catalogVersion }))}</footer>`;
}

export function signOutForm(c: PageCtx, label: StringKey = 'signOut', cls = 'btn btn--ghost'): string {
  return `<form class="inline" method="post" action="/auth/logout"><button class="${cls}" type="submit">${e(t(c.lang, label))}</button></form>`;
}

/** The account's initial in a square: the only avatar (accounts carry no picture). */
export function avatar(name: string, email: string): string {
  const letter = [...(name || email).trim()][0]?.toUpperCase() ?? '?';
  return `<span class="avatar avatar--blank" aria-hidden="true">${e(letter)}</span>`;
}

export function time(c: PageCtx, ms: number | null, fallback = ''): string {
  if (!ms) return e(fallback);
  return `<time datetime="${new Date(ms).toISOString()}">${e(formatUtc(c.lang, ms))}</time>`;
}

const fmts = new Map<Lang, Intl.DateTimeFormat>();
function formatUtc(lang: Lang, ms: number): string {
  let f = fmts.get(lang);
  if (!f) {
    f = new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : lang === 'ko' ? 'ko-KR' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' });
    fmts.set(lang, f);
  }
  return `${f.format(new Date(ms))} UTC`;
}

export const ICON_CHECK = '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6.2l2.3 2.3 4.7-5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square"/></svg>';
export const ICON_CROSS = '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square"/></svg>';
export const ICON_ALERT = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M8 4.5v4.2M8 10.6v1" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
export const ICON_OK = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M5 8.2l2 2 4-4.4" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';

export function notice(kind: 'error' | 'ok' | 'info', text: string): string {
  const icon = kind === 'error' ? ICON_ALERT : kind === 'ok' ? ICON_OK : ICON_ALERT;
  return `<div class="notice notice--${kind}" role="${kind === 'error' ? 'alert' : 'status'}">${icon}<span>${e(text)}</span></div>`;
}
