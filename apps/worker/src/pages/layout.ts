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

export function shell(c: PageCtx, o: { title: string; bodyClass: string; body: string; previewRelease?: boolean }): string {
  const title = o.title;
  return `<!doctype html>
<html lang="${c.lang}"${c.chosen ? ' data-lang-chosen="1"' : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="same-origin">
<title>${e(title)} · ${e(t(c.lang, 'app.name'))}</title>
<link rel="icon" href="/brand/alibaba-cloud-logo-en.svg" type="image/svg+xml">
<script src="/_auth/theme.js"></script>
<link rel="stylesheet" href="/_auth/pages.css?v=changelog">
<script src="/_auth/pages.js?v=changelog" defer></script>
${o.previewRelease ? '<link rel="stylesheet" href="/updates/login-notice.css"><script defer src="/updates/login-notice.js"></script>' : ''}
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

// The theme icons, drawn as the app's UI icons are (16 px grid, 1.5 px strokes, square caps): Light, Dark, System.
const STROKE = 'fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter"';
export const ICON_SUN = `<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="2.75" ${STROKE}/><path d="M8 1.75V2.25M8 13.75V14.25M1.75 8H2.25M13.75 8H14.25M3.6 3.6L3.9 3.9M12.1 12.1L12.4 12.4M3.6 12.4L3.9 12.1M12.1 3.9L12.4 3.6" ${STROKE}/></svg>`;
export const ICON_MOON = `<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M13.25 9.6A5.5 5.5 0 1 1 6.4 2.75A4.25 4.25 0 0 0 13.25 9.6Z" ${STROKE}/></svg>`;
export const ICON_SYSTEM = `<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="2.75" width="12" height="8.5" ${STROKE}/><path d="M8 11.25V13.5M5 13.5H11" ${STROKE}/></svg>`;

/** Light, Dark or System as a segmented group of toggle buttons, kept in this browser under the key the app reads. It
 * renders inside a hidden section: the pages' script reveals and drives it, since without script there is nothing to
 * store the choice in (the page then follows the device through the stylesheet's media query). */
export function themeSwitch(c: PageCtx, labelledBy: string): string {
  const btn = (choice: 'light' | 'dark' | 'system', icon: string, key: StringKey): string =>
    `<button class="seg__btn" type="button" data-theme-choice="${choice}" aria-pressed="${choice === 'system'}">${icon}<span>${e(t(c.lang, key))}</span></button>`;
  return `<div class="seg seg--theme" role="group" aria-labelledby="${e(labelledBy)}">${btn('light', ICON_SUN, 'theme.light')}${btn('dark', ICON_MOON, 'theme.dark')}${btn('system', ICON_SYSTEM, 'theme.system')}</div>`;
}

export const ICON_CHECK = '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6.2l2.3 2.3 4.7-5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square"/></svg>';
export const ICON_CROSS = '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square"/></svg>';
export const ICON_ALERT = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M8 4.5v4.2M8 10.6v1" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
export const ICON_OK = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M5 8.2l2 2 4-4.4" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';

export function notice(kind: 'error' | 'ok' | 'info', text: string): string {
  const icon = kind === 'error' ? ICON_ALERT : kind === 'ok' ? ICON_OK : ICON_ALERT;
  return `<div class="notice notice--${kind}" role="${kind === 'error' ? 'alert' : 'status'}">${icon}<span>${e(text)}</span></div>`;
}
