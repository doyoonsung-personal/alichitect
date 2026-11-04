// The stylesheet and scripts of the server-rendered pages, served from the Worker at /_auth/*. They are
// files (not inline) so the Content Security Policy needs no 'unsafe-inline'. The CSS starts with the app's own design
// tokens (tokens.ts, copied from apps/web, light and dark) and uses the app's vocabulary: square controls in the action
// blue, ink on the sheet, hairline rules, and orange only in the logo and the Cursor. theme.js is the app's own pre-paint
// script (also copied), so these pages open in the theme the reader chose in the builder, or the device's.
import { THEME_JS, TOKENS_CSS } from './tokens.ts';

const PAGE_CSS = `
*, *::before, *::after { box-sizing: border-box; }
.mcp-config { white-space: pre-wrap; overflow-wrap: anywhere; }
.mcp-guide ol { padding-inline-start: 1.5em; list-style: decimal; }
.mcp-guide li, .mcp-guide details { margin-block: var(--s-3); }
.mcp-guide pre { margin-block: var(--s-2); }
.mcp-guide summary { cursor: pointer; }
.page--keys [data-copy-from][hidden] { display: none; }
html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
body {
  margin: 0; min-height: 100vh;
  background: var(--sheet); color: var(--ink);
  font-family: var(--font-ui); font-size: var(--t-14); line-height: var(--lh-14); font-weight: var(--w-regular);
  font-synthesis: none; text-rendering: optimizeLegibility; -webkit-font-smoothing: antialiased;
}
:root:lang(ko) body, :root:lang(zh) body { line-height: calc(1em * var(--lh-cjk)); }
:root:lang(ko) p, :root:lang(ko) li { word-break: keep-all; }
h1, h2, h3, p, ol, ul, figure { margin: 0; }
ol, ul { padding: 0; list-style: none; }
button, input, textarea, select { font: inherit; color: inherit; letter-spacing: inherit; }
button { cursor: pointer; background: none; border: 0; padding: 0; border-radius: var(--r-control); }
img, svg { display: block; }
textarea { resize: vertical; }
textarea::placeholder, input::placeholder { color: var(--ink-3); opacity: 1; }
.num, time { font-variant-numeric: var(--num); }
.visually-hidden { position: absolute !important; width: 1px; height: 1px; margin: -1px; padding: 0; border: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-thumb { background: var(--line-control); border: 2px solid transparent; background-clip: padding-box; }
::-webkit-scrollbar-track { background: transparent; }
button:focus-visible, a:focus-visible, textarea:focus-visible, input:focus-visible { outline: var(--focus-outline); outline-offset: var(--focus-offset); }

/* ---------- buttons (the app's vocabulary) ---------- */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: var(--s-3);
  min-height: 32px; padding: 0 var(--s-5);
  font-size: var(--t-14); line-height: var(--lh-14); font-weight: var(--w-medium);
  border: 1px solid transparent; border-radius: var(--r-control);
  white-space: nowrap; text-decoration: none; color: inherit;
  transition: background-color var(--d-hover) linear, border-color var(--d-hover) linear, color var(--d-hover) linear;
}
.btn--primary { min-height: 36px; background: var(--action-fill); color: var(--on-action); }
.btn--primary:hover:not(:disabled) { background: var(--action-fill-hover); }
.btn--primary:active:not(:disabled) { background: var(--action-fill-press); transform: translateY(1px); }
.btn--primary:disabled { background: var(--line-1); color: var(--ink-disabled); cursor: default; }
.btn--primary:focus-visible { outline: none; box-shadow: var(--focus-ring); }
.btn--secondary { background: var(--sheet); color: var(--ink); border-color: var(--line-control); }
.btn--secondary:hover:not(:disabled) { background: var(--surface-2); border-color: var(--ink); }
.btn--secondary:active:not(:disabled) { background: var(--action-soft-2); }
.btn--secondary:disabled { color: var(--ink-disabled); border-color: var(--line-1); cursor: default; }
.btn--danger { background: var(--sheet); color: var(--danger); border-color: var(--line-control); }
.btn--danger:hover:not(:disabled) { background: var(--danger-soft); border-color: var(--danger); }
.btn--danger:disabled { color: var(--ink-disabled); border-color: var(--line-1); cursor: default; }
.btn--ghost { color: var(--ink-2); padding: 0 var(--s-4); }
.btn--ghost:hover:not(:disabled) { background: var(--surface-2); color: var(--ink); }
.btn--ghost:active:not(:disabled) { background: var(--action-soft-2); }
.btn--sm { min-height: 28px; padding: 0 var(--s-4); font-size: var(--t-13); line-height: var(--lh-13); }
.btn--block { width: 100%; min-height: 44px; font-size: var(--t-16); line-height: var(--lh-16); }
.inline { display: inline; margin: 0; }

/* ---------- the Cursor: the bar from the centre of the Alibaba Cloud logo ---------- */
.cursor { display: inline-block; width: var(--cursor-w); height: var(--cursor-h); background: var(--cursor); margin-left: 0.12em; align-self: flex-end; margin-bottom: 0.28em; }

/* ---------- lockup ---------- */
.lockup { display: inline-flex; align-items: center; color: var(--ink); text-decoration: none; }
.lockup__rule { display: block; width: 1px; background: var(--line-1); flex: none; }
.lockup--landing { font-size: var(--t-24); }
.lockup--landing .lockup__logo { height: var(--logo-h-landing); width: auto; }
.lockup--landing .lockup__rule { height: 28px; margin: 0 20px; }
.lockup--landing .lockup__name { font-size: var(--t-24); line-height: var(--lh-24); font-weight: var(--w-medium); }
.lockup--header { font-size: var(--t-14); height: 32px; padding: 0 var(--s-2); }
.lockup--header .lockup__logo { height: var(--logo-h-header); width: auto; }
.lockup--header .lockup__rule { height: 16px; margin: 0 var(--s-4); }
.lockup--header .lockup__name { font-size: var(--t-14); line-height: var(--lh-14); font-weight: var(--w-medium); }

/* ---------- language switch (segmented, as on the landing) ---------- */
.seg { display: inline-flex; border: 1px solid var(--line-control); height: 32px; }
.seg__btn { display: inline-flex; align-items: center; gap: var(--s-3); padding: 0 var(--s-4); font-size: var(--t-13); line-height: var(--lh-13); color: var(--ink-2); text-decoration: none; transition: background-color var(--d-hover) linear; }
.seg__btn[aria-current="true"], .seg__btn[aria-pressed="true"] { color: var(--ink); background: var(--action-soft); box-shadow: inset 0 -2px 0 var(--action); } /* the soft fill alone is 1.1:1; the rule tells the chosen one apart */
.seg__btn[aria-pressed="true"] { font-weight: var(--w-medium); }
.seg__btn:not([aria-current="true"]):not([aria-pressed="true"]):hover { background: var(--surface-2); color: var(--ink); }
.seg__btn:focus-visible { outline-offset: -2px; }
.seg--theme { margin-top: var(--s-1); }
.seg__btn + .seg__btn { border-left: 1px solid var(--line-1); }

/* ---------- centred pages: sign-in, sign-up, codes, waiting for approval ---------- */
.util { position: fixed; top: var(--s-5); right: var(--s-5); display: flex; gap: var(--s-3); align-items: center; z-index: 2; }
.centre { width: min(560px, calc(100vw - 48px)); margin: 0 auto; padding: max(72px, calc((100vh - 680px) / 2)) 0 var(--s-10); display: flex; flex-direction: column; align-items: center; }
.centre--wide { width: min(760px, calc(100vw - 48px)); }
.lead { font-size: var(--t-18); line-height: var(--lh-18); color: var(--ink-2); text-align: center; max-width: 600px; margin-top: 20px; text-wrap: balance; }
.block { width: 100%; max-width: 440px; margin-top: var(--s-9); }
.block > .title { margin-bottom: var(--s-3); }
.block > .intro { margin-bottom: var(--s-6); }
.intro { font-size: var(--t-14); line-height: var(--lh-14); color: var(--ink-2); overflow-wrap: anywhere; text-wrap: pretty; }
.intro strong { color: var(--ink); font-weight: var(--w-medium); }
.intro--left { margin-bottom: var(--s-5); max-width: 60ch; }
.alt { margin-top: var(--s-6); font-size: var(--t-14); line-height: var(--lh-14); color: var(--ink-2); text-align: center; }
.alt a, .link-sm { color: var(--action); text-decoration: none; }
.alt a:hover, .link-sm:hover { text-decoration: underline; }
.link-sm { align-self: flex-end; font-size: var(--t-13); line-height: var(--lh-13); }
.hint--block { display: block; margin-top: var(--s-6); }
.page--centre { display: flex; flex-direction: column; }
.page--centre > main { flex: 1 0 auto; }
.foot { padding: var(--s-4) var(--s-5) var(--s-5); text-align: center; font-size: var(--t-12); line-height: var(--lh-12); color: var(--ink-3); }

.notice { display: flex; gap: var(--s-3); align-items: flex-start; padding: var(--s-4) var(--s-5); margin-bottom: var(--s-6); font-size: var(--t-14); line-height: var(--lh-14); border: 1px solid var(--line-1); background: var(--surface-2); color: var(--ink); }
.notice--error { background: var(--danger-soft); border-color: var(--danger-soft); color: var(--danger); }
.notice--ok { background: var(--ok-soft); border-color: var(--ok-soft); color: var(--ok); }
.notice svg { flex: none; margin-top: 2px; }

/* the ruled step list (the landing's ruled brief list, carrying the access steps) */
.steps__title { font-size: var(--t-13); line-height: var(--lh-13); font-weight: var(--w-medium); color: var(--ink-2); margin: var(--s-8) 0 var(--s-3); }
.steps { border-top: 1px solid var(--line-1); counter-reset: step; }
.step { display: grid; grid-template-columns: 24px 1fr; column-gap: var(--s-5); padding: var(--s-4) 0; border-bottom: 1px solid var(--line-1); align-items: start; }
.step__tag {
  width: 20px; height: 20px; margin-top: 0; display: inline-flex; align-items: center; justify-content: center;
  font-size: var(--t-12); line-height: 1; font-weight: var(--w-bold); font-variant-numeric: var(--num);
  border: 1px solid var(--rev-tag-old); color: var(--ink-2);
}
.step--done .step__tag { background: var(--ok); border-color: var(--ok); color: var(--on-ink); }
.step--current .step__tag { background: var(--rev-tag); border-color: var(--rev-tag); color: var(--on-ink); }
.step--bad .step__tag { background: var(--danger); border-color: var(--danger); color: var(--on-ink); }
.step__line { font-size: var(--t-14); line-height: 20px; color: var(--ink); }
.step__line strong { font-weight: var(--w-medium); }
.step__meta { margin-top: var(--s-2); font-size: var(--t-13); line-height: var(--lh-13); color: var(--ink-3); }
.step__body > * + * { margin-top: var(--s-3); }
.step--waiting .step__line { color: var(--ink-2); }

.who { display: flex; align-items: center; gap: var(--s-3); }
.avatar { width: 28px; height: 28px; border-radius: var(--r-card); flex: none; background: var(--record); object-fit: cover; }
.avatar--blank { display: inline-flex; align-items: center; justify-content: center; font-size: var(--t-12); font-weight: var(--w-medium); color: var(--ink-2); border: 1px solid var(--line-1); }

.form { display: flex; flex-direction: column; gap: var(--s-3); }
.form--auth { gap: var(--s-5); margin-top: var(--s-2); }
.form--narrow { max-width: 400px; }
.field { display: flex; flex-direction: column; gap: var(--s-3); }
.field__error { font-size: var(--t-13); line-height: var(--lh-13); color: var(--danger); }
.input[aria-invalid="true"], .textarea[aria-invalid="true"] { border-color: var(--danger); }
.input { min-height: 40px; }
.input--code { font-family: ui-monospace, Consolas, "Courier New", monospace; font-size: var(--t-24); line-height: var(--lh-24); letter-spacing: 0.3em; font-variant-numeric: var(--num); padding-left: var(--s-5); }
.pw { position: relative; }
.pw .input { padding-right: 72px; }
.pw__toggle { position: absolute; top: 4px; right: 4px; bottom: 4px; padding: 0 var(--s-4); font-size: var(--t-13); line-height: var(--lh-13); color: var(--ink-2); font-weight: var(--w-medium); }
.pw__toggle:hover { background: var(--surface-2); color: var(--ink); }
.pw__toggle[hidden] { display: none; }
.label { font-size: var(--t-13); line-height: var(--lh-13); font-weight: var(--w-medium); color: var(--ink-2); }
.input, .textarea {
  width: 100%; padding: var(--s-3) var(--s-4);
  font-size: var(--t-14); line-height: var(--lh-14); color: var(--ink);
  background: var(--sheet); border: 1px solid var(--line-control); border-radius: var(--r-control);
  transition: border-color var(--d-hover) linear, box-shadow var(--d-hover) linear;
}
.textarea { min-height: 88px; }
.input:focus-visible, .textarea:focus-visible { outline: none; border-color: var(--action); box-shadow: inset 0 0 0 1px var(--action); }
.form__row { display: flex; align-items: center; justify-content: space-between; gap: var(--s-4); }
.hint { font-size: var(--t-12); line-height: var(--lh-12); color: var(--ink-3); }
.check { display: flex; gap: var(--s-3); align-items: center; font-size: var(--t-13); }
.quote { padding-left: var(--s-4); border-left: 1px solid var(--line-2); color: var(--ink-2); font-size: var(--t-13); line-height: var(--lh-13); white-space: pre-wrap; overflow-wrap: anywhere; }
.actions { display: flex; flex-wrap: wrap; gap: var(--s-3); align-items: center; margin-top: var(--s-7); }
.actions--tight { margin-top: var(--s-4); }

.tag { display: inline-flex; align-items: center; height: 20px; padding: 0 var(--s-3); font-size: var(--t-12); line-height: var(--lh-12); font-weight: var(--w-medium); white-space: nowrap; }
.tag--warn { background: var(--warn-soft); color: var(--warn); }
.tag--ok { background: var(--ok-soft); color: var(--ok); }
.tag--danger { background: var(--danger-soft); color: var(--danger); }
.tag--ink { background: var(--rev-tag); color: var(--on-ink); }
.tag--line { border: 1px solid var(--line-control); color: var(--ink-2); } /* the border is the chip's shape: 3:1 */

/* ---------- the admin page: the app's 48 px header and ruled tables ---------- */
.appbar { position: sticky; top: 0; z-index: 3; height: var(--header-h); display: flex; align-items: center; gap: var(--s-4); padding: 0 var(--s-5); background: var(--sheet); border-bottom: 1px solid var(--line-1); }
.appbar__section { font-size: var(--t-14); line-height: var(--lh-14); color: var(--ink-2); padding-left: var(--s-4); border-left: 1px solid var(--line-1); }
.appbar__right { margin-left: auto; display: flex; align-items: center; gap: var(--s-3); }
.appbar__me { display: flex; align-items: center; gap: var(--s-3); height: 32px; font-size: var(--t-13); color: var(--ink-2); padding: 0 var(--s-3); text-decoration: none; }
.appbar__me:hover { background: var(--surface-2); color: var(--ink); }
.appbar__me[aria-current="page"] { color: var(--ink); background: var(--action-soft); box-shadow: inset 0 -2px 0 var(--action); }
.appbar__me .avatar { width: 24px; height: 24px; }
.admin { max-width: 1280px; margin: 0 auto; padding: var(--s-8) var(--s-7) var(--s-11); }
.admin__head { display: flex; align-items: baseline; justify-content: space-between; gap: var(--s-5); flex-wrap: wrap; }
.title { font-size: var(--t-24); line-height: var(--lh-24); font-weight: var(--w-medium); color: var(--ink); }
.jump { display: flex; gap: var(--s-1); margin: var(--s-6) 0 0; border-bottom: 1px solid var(--line-1); }
.jump a { display: inline-flex; align-items: center; gap: var(--s-3); height: 40px; padding: 0 var(--s-4); color: var(--ink-2); text-decoration: none; font-weight: var(--w-medium); border-bottom: 2px solid transparent; margin-bottom: -1px; }
.jump a:hover { color: var(--ink); background: var(--surface-2); }
.jump a.is-urgent { color: var(--ink); border-bottom-color: var(--ink); }
.count { display: inline-flex; min-width: 20px; height: 20px; padding: 0 var(--s-2); align-items: center; justify-content: center; font-size: var(--t-12); line-height: 1; font-weight: var(--w-bold); font-variant-numeric: var(--num); border: 1px solid var(--line-control); color: var(--ink-2); }
.count--hot { background: var(--rev-tag); border-color: var(--rev-tag); color: var(--on-ink); }
.section { margin-top: var(--s-9); scroll-margin-top: calc(var(--header-h) + var(--s-5)); }
.section__title { display: flex; align-items: center; gap: var(--s-3); font-size: var(--t-16); line-height: var(--lh-16); font-weight: var(--w-medium); margin-bottom: var(--s-4); }
.table-wrap { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: var(--t-13); line-height: var(--lh-13); }
.table th { text-align: left; font-weight: var(--w-medium); font-size: var(--t-12); line-height: var(--lh-12); color: var(--ink-3); padding: var(--s-3) var(--s-4) var(--s-3) 0; border-bottom: 1px solid var(--line-2); white-space: nowrap; }
.table td { padding: var(--s-4) var(--s-4) var(--s-4) 0; border-bottom: 1px solid var(--line-1); vertical-align: top; color: var(--ink-2); }
.table tr:hover td { background: var(--surface-2); }
.table td.person { min-width: 240px; }
.table td.note { max-width: 42ch; white-space: pre-wrap; overflow-wrap: anywhere; }
.table td.num, .table th.num { text-align: right; }
.table td.acts { white-space: nowrap; text-align: right; padding-right: 0; }
.table td.acts form + form { margin-left: var(--s-3); }
.person__name { color: var(--ink); font-size: var(--t-14); line-height: var(--lh-14); font-weight: var(--w-medium); }
.person__email { color: var(--ink-3); font-size: var(--t-12); line-height: var(--lh-12); overflow-wrap: anywhere; }
.person__you { color: var(--ink-3); font-weight: var(--w-regular); }
.muted { color: var(--ink-3); }
.empty { padding: var(--s-6) 0; color: var(--ink-3); border-top: 1px solid var(--line-1); border-bottom: 1px solid var(--line-1); }
.status { margin-top: var(--s-6); }
.status:empty { display: none; }
.block > .status { margin-top: var(--s-5); margin-bottom: var(--s-5); }
.block > .status .notice { margin-bottom: 0; }

/* ---------- account settings ---------- */
.account { max-width: 760px; margin: 0 auto; padding: var(--s-8) var(--s-7) var(--s-11); }
.account .section { margin-top: var(--s-8); padding-top: var(--s-6); border-top: 1px solid var(--line-1); }
.release-entry time { font-size: var(--t-13); color: var(--ink-2); }
.release-entry h2 { margin: var(--s-2) 0 var(--s-5); }
.release-entry section { margin-block: var(--s-5); }
.release-entry section p, .release-entry details { margin-top: var(--s-2); }
.release-entry summary { cursor: pointer; color: var(--action); }
.release-entry img { width: 100%; max-width: 36rem; height: auto; margin-top: var(--s-2); }
.account > .status .notice { margin-bottom: 0; }
.facts { margin: 0; display: grid; grid-template-columns: max-content 1fr; column-gap: var(--s-8); row-gap: var(--s-4); }
.facts > div { display: contents; }
.facts dt { font-size: var(--t-13); line-height: 20px; color: var(--ink-3); }
.facts dd { margin: 0; font-size: var(--t-14); line-height: 20px; color: var(--ink); overflow-wrap: anywhere; }

@media (max-width: 720px) {
  .lockup--landing .lockup__logo { height: 24px; }
  .lockup--landing .lockup__name { font-size: var(--t-18); }
  .lockup--landing .lockup__rule { margin: 0 12px; height: 22px; }
  .appbar__section, .appbar__me span { display: none; }
  .appbar { height: auto; min-height: var(--header-h); flex-wrap: wrap; padding-block: var(--s-2); }
  .appbar__right { flex-wrap: wrap; }
  .admin, .account { padding: var(--s-6) var(--s-5) var(--s-10); }
  .facts { grid-template-columns: 1fr; row-gap: var(--s-1); }
  .facts dd { margin-bottom: var(--s-3); }
}
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition: none !important; } }

/* ---------- the theme switch: the page cross-fades once and nothing else moves (as in the app's base.css) ---------- */
:root[data-theme-switching] *, :root[data-theme-switching] *::before, :root[data-theme-switching] *::after { transition: none !important; }
::view-transition-group(root), ::view-transition-old(root), ::view-transition-new(root) { animation-duration: var(--d-fade); animation-timing-function: linear; }
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*) { animation: none !important; }
}
`;

export const PAGES_CSS = `${TOKENS_CSS}\n${PAGE_CSS}`;

export const PAGES_JS = `// The pages' script (theme.js only puts the stored theme on <html> before the first paint): the language choice
// shared with the app, confirmations for admin actions, local times, the note counter, the password show/hide buttons
// and the account page's theme choice.
(() => {
  const root = document.documentElement;
  const KEY = 'ab.lang';
  try {
    const stored = localStorage.getItem(KEY);
    const syncLanguage = !document.body.classList.contains('page--changelog');
    if (syncLanguage && root.dataset.langChosen === '1') localStorage.setItem(KEY, root.lang);
    else if (syncLanguage && (stored === 'en' || stored === 'ko' || stored === 'zh') && stored !== root.lang) {
      const u = new URL(location.href);
      u.searchParams.set('lang', stored);
      location.replace(u.toString());
      return;
    }
  } catch { /* storage unavailable: the browser language stands */ }
  for (const copy of document.querySelectorAll('[data-copy-from]')) {
    const field = document.getElementById(copy.dataset.copyFrom);
    if (!field) continue;
    copy.hidden = false;
    copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(field.value); copy.textContent = copy.dataset.copied; }
      catch { field.select(); }
    });
    if (field.id === 'mcp-secret') {
      window.addEventListener('pagehide', () => { field.removeAttribute('value'); field.value = ''; copy.hidden = true; });
    }
  }
  document.addEventListener('submit', (e) => {
    const f = e.target;
    if (!(f instanceof HTMLFormElement)) return;
    const msg = f.dataset.confirm;
    if (msg && !window.confirm(msg)) { e.preventDefault(); return; }
    const b = f.querySelector('button');
    if (b) setTimeout(() => { b.disabled = true; }, 0);
  });
  let fmt = null;
  try { fmt = new Intl.DateTimeFormat(root.lang, { dateStyle: 'medium', timeStyle: 'short' }); } catch { fmt = null; }
  if (fmt) for (const el of document.querySelectorAll('time[datetime]')) {
    const d = new Date(el.getAttribute('datetime'));
    if (!Number.isNaN(d.getTime())) { el.title = el.textContent; el.textContent = fmt.format(d); }
  }
  for (const b of document.querySelectorAll('button[data-pw-toggle]')) {
    const input = document.getElementById(b.dataset.pwToggle);
    if (!(input instanceof HTMLInputElement)) continue;
    b.hidden = false;
    b.addEventListener('click', () => {
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      b.textContent = show ? b.dataset.hide : b.dataset.show;
      b.setAttribute('aria-pressed', String(show));
      input.focus();
    });
  }
  // hide shown passwords again on submit, so a page restored from the back-forward cache never shows one
  document.addEventListener('submit', () => {
    for (const b of document.querySelectorAll('button[data-pw-toggle]')) {
      const input = document.getElementById(b.dataset.pwToggle);
      if (input instanceof HTMLInputElement) input.type = 'password';
    }
  }, true);
  for (const ta of document.querySelectorAll('textarea[data-counter]')) {
    const out = document.getElementById(ta.dataset.counter);
    if (!out) continue;
    const tpl = out.dataset.template || '{n}';
    const max = Number(ta.getAttribute('maxlength')) || 0;
    const show = () => { out.textContent = tpl.replace('{n}', String(max - [...ta.value].length)); };
    ta.addEventListener('input', show);
  }
  // Light, Dark or System, under the key the app reads; nothing stored is System. The switch cross-fades the page once,
  // or simply changes under reduced motion; a change made in another tab (the builder) is followed at once.
  const THEME_KEY = 'ab.theme';
  const readTheme = () => {
    try {
      const v = localStorage.getItem(THEME_KEY);
      return v === 'light' || v === 'dark' ? v : 'system';
    } catch { return 'system'; }
  };
  const applyTheme = (choice, animate) => {
    const attr = choice === 'system' ? null : choice;
    if (root.getAttribute('data-theme') === attr) return;
    const set = () => { if (attr) root.setAttribute('data-theme', attr); else root.removeAttribute('data-theme'); };
    const done = () => root.removeAttribute('data-theme-switching');
    root.setAttribute('data-theme-switching', '');
    const still = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (animate && !still && typeof document.startViewTransition === 'function') {
      document.startViewTransition(set).finished.then(done, done);
      return;
    }
    set();
    requestAnimationFrame(() => requestAnimationFrame(done));
  };
  const themeButtons = [...document.querySelectorAll('button[data-theme-choice]')];
  const showTheme = () => {
    const c = readTheme();
    for (const b of themeButtons) b.setAttribute('aria-pressed', String(b.dataset.themeChoice === c));
  };
  for (const b of themeButtons) {
    b.addEventListener('click', () => {
      const c = b.dataset.themeChoice === 'light' || b.dataset.themeChoice === 'dark' ? b.dataset.themeChoice : 'system';
      try {
        if (c === 'system') localStorage.removeItem(THEME_KEY);
        else localStorage.setItem(THEME_KEY, c);
      } catch { /* the choice holds for this page */ }
      applyTheme(c, true);
      showTheme();
    });
  }
  for (const g of document.querySelectorAll('[data-theme-control]')) g.hidden = false;
  showTheme();
  window.addEventListener('storage', (ev) => {
    if (ev.key !== THEME_KEY && ev.key !== null) return;
    applyTheme(readTheme(), false);
    showTheme();
  });
})();
`;

const ROBOTS = 'User-agent: *\nDisallow: /\n';

/** The public files at /_auth/* and /robots.txt, or null. */
export function authAsset(path: string): Response | null {
  const cache = 'public, max-age=300';
  if (path === '/_auth/pages.css') return new Response(PAGES_CSS, { headers: { 'Content-Type': 'text/css; charset=utf-8', 'Cache-Control': cache } });
  if (path === '/_auth/pages.js') return new Response(PAGES_JS, { headers: { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': cache } });
  if (path === '/_auth/theme.js') return new Response(THEME_JS, { headers: { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': cache } });
  if (path === '/robots.txt') return new Response(ROBOTS, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } });
  return null;
}
