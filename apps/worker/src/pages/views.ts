// The server-rendered pages: sign-in (/login), sign-up (/signup), the email code (/verify), forgotten password
// (/forgot, /reset), the waiting page (/pending), account settings (/account) and the admin page (/admin). Plain HTML
// forms do every action (POST, same origin), so the pages work without their script; the script only adds the
// password show/hide button, confirmations, local times, the note counter, the language sync and the account page's
// theme choice (without script every page follows the device's light or dark setting).
import { escapeHtml as e } from '../http.ts';
import type { AdminAction, AdminUserView, AuditRow, Role, UserRow } from '../db.ts';
import { ADMIN_ACTIONS, NAME_MAX, NOTE_MAX, STALE_REQUEST_MS } from '../db.ts';
import { PASSWORD_MAX, PASSWORD_MIN } from '../password.ts';
import { t } from './i18n.ts';
import type { StringKey } from './i18n.ts';
import { ICON_CHECK, ICON_CROSS, avatar, footer, langSwitch, lockup, notice, shell, signOutForm, themeSwitch, time } from './layout.ts';
import type { PageCtx } from './layout.ts';

/** A message at the top of a page. */
export interface Note {
  kind: 'error' | 'ok' | 'info';
  key: StringKey;
  vars?: Record<string, string | number>;
}

const showNote = (c: PageCtx, n: Note | null | undefined): string => (n ? notice(n.kind, t(c.lang, n.key, n.vars)) : '');

/** A sentence with the address set in ink, so the person can check where the code went. */
const withEmail = (c: PageCtx, key: StringKey, email: string): string => e(t(c.lang, key, { email: '\u0000' })).replace('\u0000', `<strong>${e(email)}</strong>`);

interface FieldOpts {
  id: string;
  label: StringKey;
  type: 'email' | 'text' | 'password' | 'code';
  value?: string;
  autocomplete: string;
  error?: StringKey | null;
  errorVars?: Record<string, string | number>;
  hint?: string;
  /** Right-aligned beside the label (the "Forgot your password?" link). */
  aside?: string;
  autofocus?: boolean;
  maxlength?: number;
}

function field(c: PageCtx, o: FieldOpts): string {
  const L = (k: StringKey, v?: Record<string, string | number>): string => e(t(c.lang, k, v));
  const desc = [o.error ? `${o.id}-err` : '', o.hint ? `${o.id}-hint` : ''].filter(Boolean).join(' ');
  const common = `id="${o.id}" name="${o.id}" autocomplete="${o.autocomplete}"${desc ? ` aria-describedby="${desc}"` : ''}${o.error ? ' aria-invalid="true"' : ''}${o.autofocus ? ' autofocus' : ''} required`;
  let input: string;
  if (o.type === 'code') {
    input = `<input class="input input--code" ${common} type="text" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" spellcheck="false">`;
  } else if (o.type === 'password') {
    input = `<div class="pw"><input class="input" ${common} type="password" minlength="${PASSWORD_MIN}" maxlength="${PASSWORD_MAX}" spellcheck="false"><button class="pw__toggle" type="button" data-pw-toggle="${o.id}" data-show="${L('password.show')}" data-hide="${L('password.hide')}" aria-controls="${o.id}" aria-pressed="false" hidden>${L('password.show')}</button></div>`;
  } else {
    input = `<input class="input" ${common} type="${o.type}"${o.maxlength ? ` maxlength="${o.maxlength}"` : ''}${o.type === 'email' ? ' spellcheck="false" autocapitalize="off"' : ''} value="${e(o.value ?? '')}">`;
  }
  const head = o.aside ? `<div class="field__head"><label class="label" for="${o.id}">${L(o.label)}</label>${o.aside}</div>` : `<label class="label" for="${o.id}">${L(o.label)}</label>`;
  return `<div class="field">${head}${input}${o.hint ? `<p class="hint" id="${o.id}-hint">${e(o.hint)}</p>` : ''}${o.error ? `<p class="field__error" id="${o.id}-err">${L(o.error, o.errorVars)}</p>` : ''}</div>`;
}

const pwVars = { n: PASSWORD_MIN } as const;
const pwErrVars = (k: StringKey | null | undefined): Record<string, number> => (k === 'password.error.long' ? { n: PASSWORD_MAX } : { n: PASSWORD_MIN });

/** The centred single-column page every sign-in step uses. */
function authShell(c: PageCtx, title: string, inner: string, o: { lead?: boolean } = {}): string {
  return shell(c, {
    title,
    bodyClass: 'page page--centre',
    body: `<div class="util">${langSwitch(c)}</div>
<main class="centre" id="main">
  ${o.lead ? `<h1>${lockup(c, 'landing')}</h1>\n  <p class="lead">${e(t(c.lang, 'app.lead'))}</p>` : lockup(c, 'landing', { href: '/login' })}
  <section class="block">
${inner}
  </section>
</main>
${footer(c)}`,
  });
}

/* ---------- sign-in ---------- */

export function loginPage(c: PageCtx, o: { next: string; email?: string; note?: Note | null; error?: boolean }): string {
  const L = (k: StringKey, v?: Record<string, string | number>): string => e(t(c.lang, k, v));
  const steps = (['login.step1', 'login.step2', 'login.step3'] as const).map((k, i) => `<li class="step"><span class="step__tag">${i + 1}</span><div class="step__body"><p class="step__line">${L(k)}</p></div></li>`).join('');
  const inner = `    <h2 class="visually-hidden">${L('login.title')}</h2>
    <div class="status">${showNote(c, o.note)}</div>
    <form class="form form--auth" method="post" action="/login">
      ${o.next && o.next !== '/' ? `<input type="hidden" name="next" value="${e(o.next)}">` : ''}
      ${field(c, { id: 'email', label: 'field.email', type: 'email', value: o.email, autocomplete: 'username', autofocus: !o.email })}
      ${field(c, { id: 'password', label: 'field.password', type: 'password', autocomplete: 'current-password', autofocus: !!o.email, aside: `<a class="link-sm" href="/forgot">${L('login.forgot')}</a>` })}
      <button class="btn btn--primary btn--block" type="submit">${L('login.submit')}</button>
    </form>
    <p class="alt">${L('login.noAccount')} <a href="/signup">${L('login.createAccount')}</a></p>
    <h2 class="steps__title">${L('login.stepsTitle')}</h2>
    <ol class="steps">${steps}</ol>`;
  return authShell(c, t(c.lang, 'login.title'), inner, { lead: true });
}

/* ---------- sign-up ---------- */

export interface SignupValues {
  name: string;
  email: string;
  note: string;
}
export interface SignupErrors {
  name?: StringKey;
  email?: StringKey;
  password?: StringKey;
}

export function signupPage(c: PageCtx, o: { values?: SignupValues; errors?: SignupErrors; note?: Note | null }): string {
  const L = (k: StringKey, v?: Record<string, string | number>): string => e(t(c.lang, k, v));
  const v = o.values ?? { name: '', email: '', note: '' };
  const er = o.errors ?? {};
  const inner = `    <h1 class="title">${L('signup.title')}</h1>
    <p class="intro">${L('signup.intro')}</p>
    <div class="status">${showNote(c, o.note)}</div>
    <form class="form form--auth" method="post" action="/signup">
      ${field(c, { id: 'name', label: 'field.name', type: 'text', value: v.name, autocomplete: 'name', error: er.name, maxlength: NAME_MAX, autofocus: !er.email && !er.password })}
      ${field(c, { id: 'email', label: 'field.email', type: 'email', value: v.email, autocomplete: 'email', error: er.email, autofocus: !!er.email })}
      ${field(c, { id: 'password', label: 'field.password', type: 'password', autocomplete: 'new-password', error: er.password, errorVars: pwErrVars(er.password), hint: t(c.lang, 'password.hint', pwVars), autofocus: !!er.password && !er.email })}
      <div class="field">
        <label class="label" for="note">${L('signup.noteLabel')}</label>
        <textarea class="textarea" id="note" name="note" maxlength="${NOTE_MAX}" placeholder="${L('signup.notePlaceholder')}" data-counter="note-left" aria-describedby="note-left">${e(v.note)}</textarea>
        <p class="hint" id="note-left" data-template="${L('pending.charsLeft')}" aria-live="polite">${L('signup.noteHint', { n: NOTE_MAX })}</p>
      </div>
      <button class="btn btn--primary btn--block" type="submit">${L('signup.submit')}</button>
    </form>
    <p class="alt">${L('signup.haveAccount')} <a href="/login">${L('signup.signIn')}</a></p>`;
  return authShell(c, t(c.lang, 'signup.title'), inner);
}

/* ---------- the email code (sign-up) ---------- */

export function verifyPage(c: PageCtx, o: { email: string; note?: Note | null; codeError?: boolean }): string {
  const L = (k: StringKey, v?: Record<string, string | number>): string => e(t(c.lang, k, v));
  const inner = `    <h1 class="title">${L('verify.title')}</h1>
    <p class="intro">${withEmail(c, 'verify.sent', o.email)}</p>
    <div class="status">${showNote(c, o.note)}</div>
    <form class="form form--auth" method="post" action="/verify">
      ${field(c, { id: 'code', label: 'field.code', type: 'code', autocomplete: 'one-time-code', autofocus: true, error: o.codeError ? 'verify.error.code' : null })}
      <button class="btn btn--primary btn--block" type="submit">${L('verify.submit')}</button>
    </form>
    <p class="hint hint--block">${L('verify.spam')}</p>
    <div class="actions actions--tight">
      <form class="inline" method="post" action="/verify/resend"><button class="btn btn--secondary" type="submit">${L('verify.resend')}</button></form>
      <a class="btn btn--ghost" href="/signup">${L('verify.restart')}</a>
    </div>`;
  return authShell(c, t(c.lang, 'verify.title'), inner);
}

/* ---------- forgotten password ---------- */

export function forgotPage(c: PageCtx, o: { email?: string; emailError?: boolean; note?: Note | null }): string {
  const L = (k: StringKey, v?: Record<string, string | number>): string => e(t(c.lang, k, v));
  const inner = `    <h1 class="title">${L('forgot.title')}</h1>
    <p class="intro">${L('forgot.intro')}</p>
    <div class="status">${showNote(c, o.note)}</div>
    <form class="form form--auth" method="post" action="/forgot">
      ${field(c, { id: 'email', label: 'field.email', type: 'email', value: o.email, autocomplete: 'username', autofocus: true, error: o.emailError ? 'signup.error.email' : null })}
      <button class="btn btn--primary btn--block" type="submit">${L('forgot.submit')}</button>
    </form>
    <p class="alt"><a href="/login">${L('forgot.back')}</a></p>`;
  return authShell(c, t(c.lang, 'forgot.title'), inner);
}

export function resetPage(c: PageCtx, o: { email: string; note?: Note | null; codeError?: boolean; passwordError?: StringKey | null }): string {
  const L = (k: StringKey, v?: Record<string, string | number>): string => e(t(c.lang, k, v));
  const inner = `    <h1 class="title">${L('reset.title')}</h1>
    <p class="intro">${withEmail(c, 'reset.sent', o.email)}</p>
    <div class="status">${showNote(c, o.note)}</div>
    <form class="form form--auth" method="post" action="/reset">
      ${field(c, { id: 'code', label: 'field.code', type: 'code', autocomplete: 'one-time-code', autofocus: !o.passwordError, error: o.codeError ? 'verify.error.code' : null })}
      ${field(c, { id: 'password', label: 'field.newPassword', type: 'password', autocomplete: 'new-password', autofocus: !!o.passwordError, error: o.passwordError, errorVars: pwErrVars(o.passwordError), hint: t(c.lang, 'password.hint', pwVars) })}
      <p class="hint">${L('reset.note')}</p>
      <button class="btn btn--primary btn--block" type="submit">${L('reset.submit')}</button>
    </form>
    <p class="hint hint--block">${L('verify.spam')}</p>
    <div class="actions actions--tight">
      <form class="inline" method="post" action="/reset/resend"><button class="btn btn--secondary" type="submit">${L('verify.resend')}</button></form>
      <a class="btn btn--ghost" href="/forgot">${L('reset.other')}</a>
    </div>`;
  return authShell(c, t(c.lang, 'reset.title'), inner);
}

/* ---------- waiting for approval, declined, removed ---------- */

export function pendingPage(c: PageCtx, o: { user: UserRow; note?: Note | null }): string {
  const L = (k: StringKey, v?: Record<string, string | number>): string => e(t(c.lang, k, v));
  const u = o.user;
  const title: StringKey = u.status === 'denied' ? 'pending.titleDenied' : u.status === 'revoked' ? 'pending.titleRevoked' : 'pending.title';

  const who = `<div class="who">${avatar(u.name, u.email)}<div><div class="person__name">${e(u.name || u.email)}</div><div class="person__email">${e(u.email)}</div></div></div>`;
  const done = (k: StringKey, body = ''): string => `<li class="step step--done"><span class="step__tag">${ICON_CHECK}</span><div class="step__body"><p class="step__line">${L(k)}</p>${body}</div></li>`;
  const step1 = done('pending.stepAccount', who);

  const noteForm = `<form class="form" method="post" action="/pending">
      <label class="label" for="note">${L('pending.noteLabel')}</label>
      <textarea class="textarea" id="note" name="note" maxlength="${NOTE_MAX}" placeholder="${L('signup.notePlaceholder')}" data-counter="note-left">${e(u.note ?? '')}</textarea>
      <div class="form__row"><span class="hint" id="note-left" data-template="${L('pending.charsLeft')}" aria-live="polite">${L('pending.noteHint', { n: NOTE_MAX })}</span>
      <button class="btn btn--secondary" type="submit">${L('pending.update')}</button></div>
    </form>`;
  const requested = u.requested_at ?? u.created_at;
  const meta = `<p class="step__meta">${e(t(c.lang, 'pending.requestedOn', { date: '\u0000', email: u.email })).replace('\u0000', time(c, requested))}</p>`;
  const step2 = done('pending.stepEmail', u.status === 'pending' ? `${meta}${noteForm}` : u.note ? `<p class="quote">${e(u.note)}</p>` : '');

  let step3: string;
  if (u.status === 'denied') step3 = `<li class="step step--bad"><span class="step__tag">${ICON_CROSS}</span><div class="step__body"><p class="step__line">${L('pending.stepApproval')}</p><span class="tag tag--danger">${L('pending.statusDenied')}</span><p class="step__meta">${L('pending.deniedBody')}</p></div></li>`;
  else if (u.status === 'revoked') step3 = `<li class="step step--bad"><span class="step__tag">${ICON_CROSS}</span><div class="step__body"><p class="step__line">${L('pending.stepApproval')}</p><span class="tag tag--danger">${L('pending.statusRevoked')}</span><p class="step__meta">${L('pending.revokedBody')}</p></div></li>`;
  else step3 = `<li class="step step--current"><span class="step__tag">3</span><div class="step__body"><p class="step__line"><strong>${L('pending.stepApproval')}</strong></p><span class="tag tag--warn">${L('pending.statusRequested')}</span></div></li>`;

  return shell(c, {
    title: t(c.lang, title),
    bodyClass: 'page page--centre',
    body: `<div class="util">${langSwitch(c)}</div>
<main class="centre" id="main">
  ${lockup(c, 'landing')}
  <section class="block" aria-labelledby="pending-title">
    <h1 class="title" id="pending-title">${L(title)}</h1>
    <div class="status">${showNote(c, o.note)}</div>
    <ol class="steps">${step1}${step2}${step3}</ol>
    <div class="actions">
      <a class="btn btn--secondary" href="/pending">${L('pending.checkAgain')}</a>
      <a class="btn btn--ghost" href="/account">${L('pending.account')}</a>
      ${signOutForm(c)}
    </div>
  </section>
</main>
${footer(c)}`,
  });
}

/* ---------- the app's 48 px header, for /account and /admin ---------- */

export function appbar(c: PageCtx, me: UserRow, section: StringKey): string {
  const L = (k: StringKey): string => e(t(c.lang, k));
  const approved = me.status === 'approved';
  return `<header class="appbar">
  ${lockup(c, 'header', { href: approved ? '/' : '/pending' })}
  <span class="appbar__section">${L(section)}</span>
  <div class="appbar__right">
    ${langSwitch(c)}
    ${approved ? `<a class="btn btn--ghost" data-changelog-link href="/changelog"${section === 'release.changelog' ? ' aria-current="page"' : ''}>${L('release.changelog')}</a>` : ''}
    ${approved ? `<a class="btn btn--ghost" href="/">${L('admin.openApp')}</a>` : ''}
    ${me.role === 'admin' && approved && section !== 'admin.label' ? `<a class="btn btn--ghost" href="/admin">${L('admin.label')}</a>` : ''}
    <a class="appbar__me" href="/account"${section === 'account.title' ? ' aria-current="page"' : ''}>${avatar(me.name, me.email)}<span>${e(me.email)}</span></a>
    ${signOutForm(c)}
  </div>
</header>`;
}

/* ---------- account settings ---------- */

const roleKeys = { user: 'admin.roleUser', verified: 'admin.roleVerified', admin: 'admin.roleAdmin' } as const;
function roleTag(c: PageCtx, role: Role): string {
  return `<span class="tag ${role === 'admin' ? 'tag--ink' : 'tag--line'}">${e(t(c.lang, roleKeys[role]))}</span>`;
}

export function accountPage(c: PageCtx, o: { me: UserRow; note?: Note | null; passwordError?: StringKey | null; currentError?: boolean; shared?: boolean }): string {
  const L = (k: StringKey, v?: Record<string, string | number>): string => e(t(c.lang, k, v));
  const me = o.me;
  const statusTag =
    me.status === 'approved'
      ? `<span class="tag tag--ok">${L('account.statusApproved')}</span>`
      : me.status === 'pending'
        ? `<span class="tag tag--warn">${L('pending.statusRequested')}</span>`
        : `<span class="tag tag--danger">${L(me.status === 'denied' ? 'pending.statusDenied' : 'pending.statusRevoked')}</span>`;
  return shell(c, {
    title: t(c.lang, 'account.title'),
    bodyClass: 'page page--admin',
    body: `${appbar(c, me, 'account.title')}
<main class="account" id="main">
  <h1 class="title">${L('account.title')}</h1>
  <div class="status">${showNote(c, o.note)}</div>
  <section class="section" aria-labelledby="h-profile">
    <h2 class="section__title" id="h-profile">${L('account.profile')}</h2>
    <dl class="facts">
      <div><dt>${L('field.name')}</dt><dd>${e(me.name || '-')}</dd></div>
      <div><dt>${L('field.email')}</dt><dd>${e(me.email)}</dd></div>
      <div><dt>${L('account.status')}</dt><dd>${statusTag}</dd></div>
      <div><dt>${L('account.role')}</dt><dd>${roleTag(c, me.role)}</dd></div>
      <div><dt>${L('account.since')}</dt><dd>${time(c, me.created_at)}</dd></div>
    </dl>
  </section>
  ${me.status === 'approved' && !o.shared ? `<p><a href="/account/keys">${L('mcp.keys')}</a></p>` : ''}
  ${me.status === 'approved' ? `<p><a href="/account?whats-new=1">${L('release.preview')}</a></p>` : ''}
  <section class="section" aria-labelledby="h-theme" data-theme-control hidden>
    <h2 class="section__title" id="h-theme">${L('theme.title')}</h2>
    <p class="intro intro--left">${L('theme.intro')}</p>
    ${themeSwitch(c, 'h-theme')}
  </section>
  <section class="section" aria-labelledby="h-password">
    <h2 class="section__title" id="h-password">${L('account.passwordTitle')}</h2>
    ${o.shared ? `<p class="intro intro--left">${L('account.sharedPassword')}</p>` : `<p class="intro intro--left">${L('account.passwordIntro')}</p>
    <form class="form form--auth form--narrow" method="post" action="/account/password">
      <input type="text" name="username" value="${e(me.email)}" autocomplete="username" hidden>
      ${field(c, { id: 'current', label: 'field.currentPassword', type: 'password', autocomplete: 'current-password', error: o.currentError ? 'account.error.current' : null })}
      ${field(c, { id: 'password', label: 'field.newPassword', type: 'password', autocomplete: 'new-password', error: o.passwordError, errorVars: pwErrVars(o.passwordError), hint: t(c.lang, 'password.hint', pwVars) })}
      <div><button class="btn btn--primary" type="submit">${L('account.passwordSubmit')}</button></div>
    </form>`}
  </section>
  <section class="section" aria-labelledby="h-signout">
    <h2 class="section__title" id="h-signout">${L('signOut')}</h2>
    <p class="intro intro--left">${L('account.signOutIntro')}</p>
    ${signOutForm(c, 'signOut', 'btn btn--secondary')}
  </section>
</main>`,
  });
}

/* ---------- admin ---------- */

export interface AdminNotice {
  kind: 'ok' | 'error';
  key: StringKey;
  email: string;
  /** The number in the message (the bulk decline). */
  n?: number;
}

export function adminPage(c: PageCtx, o: { me: UserRow; users: AdminUserView[]; audit: AuditRow[]; turnsPerDay: number; notice: AdminNotice | null }): string {
  const L = (k: StringKey, v?: Record<string, string | number>): string => e(t(c.lang, k, v));
  const me = o.me;
  const pending = o.users.filter((u) => u.status === 'pending');
  const approved = o.users.filter((u) => u.status === 'approved');
  const closed = o.users.filter((u) => u.status === 'denied' || u.status === 'revoked');
  const admins = approved.filter((u) => u.role === 'admin').length;

  const action = (u: UserRow, a: AdminAction, cls: string, confirmKey?: StringKey, disabled = false): string =>
    `<form class="inline" method="post" action="/admin/users/${e(u.id)}/${a}"${confirmKey ? ` data-confirm="${L(confirmKey, { email: u.email })}"` : ''}><button class="btn btn--sm ${cls}" type="submit"${disabled ? ` disabled title="${L('admin.lastAdminHint')}"` : ''}>${L(`admin.${a}` as StringKey)}</button></form>`;

  const person = (u: UserRow): string =>
    `<td class="person"><div class="who">${avatar(u.name, u.email)}<div><div class="person__name">${e(u.name || u.email)}${u.id === me.id ? ` <span class="person__you">(${L('admin.you')})</span>` : ''}</div><div class="person__email">${e(u.email)}</div></div></div></td>`;
  const note = (u: UserRow): string => `<td class="note">${u.note ? e(u.note) : '<span class="muted">-</span>'}</td>`;

  // open sign-up lets anyone with a mailbox leave a request: one button clears the ones nobody has answered for a week
  const staleCutoff = Date.now() - STALE_REQUEST_MS;
  const stale = pending.filter((u) => (u.requested_at ?? u.created_at) < staleCutoff).length;
  const purge = stale > 0 ? `<form class="inline" method="post" action="/admin/pending/deny-old" data-confirm="${L('admin.confirmPurge', { n: stale })}"><button class="btn btn--sm btn--secondary" type="submit">${L('admin.purge', { n: stale })}</button></form>` : '';

  const pendingRows = pending
    .map((u) => `<tr>${person(u)}${note(u)}<td>${time(c, u.requested_at ?? u.created_at)}</td>
<td class="acts">${action(u, 'approve', 'btn--primary')}${action(u, 'deny', 'btn--secondary', 'admin.confirmDeny')}</td></tr>`)
    .join('');

  const approvedRows = approved
    .map((u) => {
      const isAdmin = u.role === 'admin';
      const lastAdmin = isAdmin && admins <= 1;
      const acts = [
        isAdmin ? '' : action(u, u.role === 'verified' ? 'unverify' : 'verify', 'btn--secondary'),
        isAdmin ? action(u, 'demote', 'btn--secondary', 'admin.confirmDemote', lastAdmin) : action(u, 'promote', 'btn--secondary'),
        u.id === me.id ? '' : action(u, 'revoke', 'btn--danger', 'admin.confirmRevoke', lastAdmin),
      ].join('');
      const cost = u.cost_today > 0 ? `<div class="muted">${L('admin.costToday', { n: u.cost_today.toFixed(2) })}</div>` : '';
      return `<tr>${person(u)}<td>${roleTag(c, u.role)}</td><td class="num">${u.turns_today}${u.role === 'user' ? ` / ${o.turnsPerDay}` : ''}${cost}</td><td>${time(c, u.last_seen_at, t(c.lang, 'admin.never'))}</td><td>${time(c, u.decided_at)}</td><td class="acts">${acts}</td></tr>`;
    })
    .join('');

  const closedRows = closed
    .map(
      (u) =>
        `<tr>${person(u)}${note(u)}<td><span class="tag tag--danger">${L(u.status === 'denied' ? 'admin.statusDenied' : 'admin.statusRevoked')}</span></td><td>${time(c, u.decided_at)}${u.decided_by ? `<div class="muted">${e(u.decided_by)}</div>` : ''}</td><td class="acts">${action(u, 'approve', 'btn--secondary')}</td></tr>`,
    )
    .join('');

  const table = (head: string, rows: string, empty: StringKey): string =>
    rows ? `<div class="table-wrap"><table class="table"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>` : `<p class="empty">${L(empty)}</p>`;
  const th = (k: StringKey, cls = ''): string => `<th scope="col"${cls ? ` class="${cls}"` : ''}>${L(k)}</th>`;
  const thActs = `<th scope="col" class="num"><span class="visually-hidden">${L('admin.colActions')}</span></th>`;

  const auditLabel = (what: string): string => {
    const k = `audit.${what}`;
    return Object.hasOwn(AUDIT_KEYS, k) ? t(c.lang, k as StringKey) : what;
  };
  const auditRows = o.audit.map((a) => `<tr><td>${time(c, a.at)}</td><td>${e(a.who === 'system' ? '-' : a.who)}</td><td>${e(auditLabel(a.what))}</td><td>${e(a.target ?? '')}</td></tr>`).join('');

  const msg = o.notice ? notice(o.notice.kind, t(c.lang, o.notice.key, { email: o.notice.email, n: o.notice.n ?? 0 })) : '';
  const count = (n: number, hot = false): string => `<span class="count${hot && n > 0 ? ' count--hot' : ''}">${n}</span>`;

  return shell(c, {
    title: t(c.lang, 'admin.title'),
    bodyClass: 'page page--admin',
    body: `${appbar(c, me, 'admin.label')}
<main class="admin" id="main">
  <div class="admin__head"><h1 class="title">${L('admin.title')}</h1><p class="hint">${L('admin.quota', { n: o.turnsPerDay })}</p></div>
  <div class="status">${msg}</div>
  <nav class="jump" aria-label="${L('admin.title')}">
    <a href="#requests"${pending.length ? ' class="is-urgent"' : ''}>${L('admin.requests')} ${count(pending.length, true)}</a>
    <a href="#approved">${L('admin.approved')} ${count(approved.length)}</a>
    <a href="#closed">${L('admin.closed')} ${count(closed.length)}</a>
    <a href="#activity">${L('admin.activity')}</a>
  </nav>
  <section class="section" id="requests" aria-labelledby="h-requests">
    <h2 class="section__title" id="h-requests">${L('admin.requests')} ${count(pending.length, true)}</h2>
    ${purge}
    ${table(th('admin.colPerson') + th('admin.colNote') + th('admin.colRequested') + thActs, pendingRows, 'admin.emptyRequests')}
  </section>
  <section class="section" id="approved" aria-labelledby="h-approved">
    <h2 class="section__title" id="h-approved">${L('admin.approved')} ${count(approved.length)}</h2>
    ${table(th('admin.colPerson') + th('admin.colRole') + th('admin.colToday', 'num') + th('admin.colLastSeen') + th('admin.colDecided') + thActs, approvedRows, 'admin.emptyApproved')}
  </section>
  <section class="section" id="closed" aria-labelledby="h-closed">
    <h2 class="section__title" id="h-closed">${L('admin.closed')} ${count(closed.length)}</h2>
    ${table(th('admin.colPerson') + th('admin.colNote') + th('admin.colStatus') + th('admin.colDecided') + thActs, closedRows, 'admin.emptyClosed')}
  </section>
  <section class="section" id="activity" aria-labelledby="h-activity">
    <h2 class="section__title" id="h-activity">${L('admin.activity')}</h2>
    ${table(th('admin.colWhen') + th('admin.colWho') + th('admin.colWhat') + th('admin.colAccount'), auditRows, 'admin.activityEmpty')}
  </section>
</main>`,
  });
}

/** The audit actions that have a label (an unknown one shows as written). */
const AUDIT_KEYS: Record<string, true> = Object.fromEntries(
  ['sign-up', 'seed-admin', 'password-reset', 'password-change', ...ADMIN_ACTIONS, 'bulk-deny'].map((w) => [`audit.${w}`, true]),
);
