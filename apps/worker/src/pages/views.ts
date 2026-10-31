// The three server-rendered pages: /login, /pending and /admin. Plain HTML forms do every action (POST, same origin),
// so the pages work without their script; the script only adds confirmations, local times and the language sync.
import { escapeHtml as e } from '../http.ts';
import type { AdminUserView, AuditRow, UserRow } from '../db.ts';
import { NOTE_MAX } from '../db.ts';
import { t } from './i18n.ts';
import type { StringKey } from './i18n.ts';
import { ICON_CHECK, ICON_CROSS, avatar, footer, langSwitch, lockup, notice, shell, signOutForm, time } from './layout.ts';
import type { PageCtx } from './layout.ts';

export type LoginNotice = 'cancelled' | 'expired' | 'failed' | 'unverified' | 'account' | 'config' | 'signed-out' | null;

export function loginPage(c: PageCtx, o: { next: string; notice: LoginNotice }): string {
  const L = (k: StringKey, v?: Record<string, string | number>): string => e(t(c.lang, k, v));
  const msg = o.notice === 'signed-out' ? notice('info', t(c.lang, 'login.signedOut')) : o.notice ? notice('error', t(c.lang, `login.error.${o.notice}` as StringKey)) : '';
  const href = o.next && o.next !== '/' ? `/auth/google?next=${encodeURIComponent(o.next)}` : '/auth/google';
  const steps = (['login.step1', 'login.step2', 'login.step3'] as const).map((k, i) => `<li class="step"><span class="step__tag">${i + 1}</span><div class="step__body"><p class="step__line">${L(k)}</p></div></li>`).join('');
  return shell(c, {
    title: t(c.lang, 'login.title'),
    bodyClass: 'page page--centre',
    body: `<div class="util">${langSwitch(c)}</div>
<main class="centre" id="main">
  <h1>${lockup(c, 'landing')}</h1>
  <p class="lead">${L('app.lead')}</p>
  <section class="block" aria-label="${L('login.title')}">
    ${msg}
    <a class="btn btn--google" href="${e(href)}"><img src="/_auth/google-g.svg" alt="" width="20" height="20">${L('login.google')}</a>
    <h2 class="steps__title">${L('login.stepsTitle')}</h2>
    <ol class="steps">${steps}</ol>
  </section>
</main>
${footer(c)}`,
  });
}

export type PendingNotice = 'sent' | 'updated' | null;

export function pendingPage(c: PageCtx, o: { user: UserRow; notice: PendingNotice }): string {
  const L = (k: StringKey, v?: Record<string, string | number>): string => e(t(c.lang, k, v));
  const u = o.user;
  const requested = u.requested_at !== null;
  const decided = u.status === 'denied' || u.status === 'revoked';
  const msg = o.notice === 'sent' ? notice('ok', t(c.lang, 'pending.sent')) : o.notice === 'updated' ? notice('ok', t(c.lang, 'pending.updated')) : '';

  const who = `<div class="who">${avatar(u.picture, u.name, u.email)}<div><div class="person__name">${e(u.name || u.email)}</div><div class="person__email">${e(u.email)}</div></div></div>`;
  const step1 = `<li class="step step--done"><span class="step__tag">${ICON_CHECK}</span><div class="step__body"><p class="step__line">${L('pending.stepSignedIn')}</p>${who}</div></li>`;

  const form = `<form class="form" method="post" action="/pending">
      <label class="label" for="note">${L('pending.noteLabel')}</label>
      <textarea class="textarea" id="note" name="note" maxlength="${NOTE_MAX}" placeholder="${L('pending.notePlaceholder')}" data-counter="note-left">${e(u.note ?? '')}</textarea>
      <div class="form__row"><span class="hint" id="note-left" data-template="${L('pending.charsLeft')}" aria-live="polite">${L('pending.noteHint', { n: NOTE_MAX })}</span>
      <button class="btn ${requested ? 'btn--secondary' : 'btn--primary'}" type="submit">${L(requested ? 'pending.update' : 'pending.submit')}</button></div>
    </form>`;
  let step2: string;
  if (decided) {
    step2 = `<li class="step step--done"><span class="step__tag">${ICON_CHECK}</span><div class="step__body"><p class="step__line">${L('pending.title')}</p>${u.note ? `<p class="quote">${e(u.note)}</p>` : ''}</div></li>`;
  } else if (requested) {
    step2 = `<li class="step step--done"><span class="step__tag">${ICON_CHECK}</span><div class="step__body"><p class="step__line">${L('pending.title')}</p><p class="step__meta">${e(t(c.lang, 'pending.requestedOn', { date: '\u0000', email: u.email })).replace('\u0000', time(c, u.requested_at))}</p>${form}</div></li>`;
  } else {
    step2 = `<li class="step step--current"><span class="step__tag">2</span><div class="step__body"><p class="step__line"><strong>${L('pending.title')}</strong></p><p class="step__meta">${L('pending.intro')}</p>${form}</div></li>`;
  }

  let step3: string;
  if (u.status === 'denied') step3 = `<li class="step step--bad"><span class="step__tag">${ICON_CROSS}</span><div class="step__body"><p class="step__line">${L('pending.stepApproval')}</p><span class="tag tag--danger">${L('pending.statusDenied')}</span><p class="step__meta">${L('pending.deniedBody')}</p></div></li>`;
  else if (u.status === 'revoked') step3 = `<li class="step step--bad"><span class="step__tag">${ICON_CROSS}</span><div class="step__body"><p class="step__line">${L('pending.stepApproval')}</p><span class="tag tag--danger">${L('pending.statusRevoked')}</span><p class="step__meta">${L('pending.revokedBody')}</p></div></li>`;
  else if (requested) step3 = `<li class="step step--current"><span class="step__tag">3</span><div class="step__body"><p class="step__line"><strong>${L('pending.stepApproval')}</strong></p><span class="tag tag--warn">${L('pending.statusRequested')}</span></div></li>`;
  else step3 = `<li class="step step--waiting"><span class="step__tag">3</span><div class="step__body"><p class="step__line">${L('pending.stepApproval')}</p></div></li>`;

  return shell(c, {
    title: t(c.lang, 'pending.title'),
    bodyClass: 'page page--centre',
    body: `<div class="util">${langSwitch(c)}</div>
<main class="centre" id="main">
  ${lockup(c, 'landing')}
  <section class="block" aria-labelledby="pending-title">
    <h1 class="title" id="pending-title">${L('pending.title')}</h1>
    <div class="status">${msg}</div>
    <ol class="steps">${step1}${step2}${step3}</ol>
    <div class="actions">
      <a class="btn btn--secondary" href="/pending">${L('pending.checkAgain')}</a>
      ${signOutForm(c, 'pending.otherAccount')}
    </div>
  </section>
</main>
${footer(c)}`,
  });
}

export interface AdminNotice {
  kind: 'ok' | 'error';
  key: StringKey;
  email: string;
}

export function adminPage(c: PageCtx, o: { me: UserRow; users: AdminUserView[]; audit: AuditRow[]; turnsPerDay: number; notice: AdminNotice | null }): string {
  const L = (k: StringKey, v?: Record<string, string | number>): string => e(t(c.lang, k, v));
  const me = o.me;
  const pending = o.users.filter((u) => u.status === 'pending');
  const approved = o.users.filter((u) => u.status === 'approved');
  const closed = o.users.filter((u) => u.status === 'denied' || u.status === 'revoked');
  const admins = approved.filter((u) => u.role === 'admin').length;

  const action = (u: UserRow, a: 'approve' | 'deny' | 'revoke' | 'promote' | 'demote', cls: string, confirmKey?: StringKey, disabled = false): string =>
    `<form class="inline" method="post" action="/admin/users/${e(u.id)}/${a}"${confirmKey ? ` data-confirm="${L(confirmKey, { email: u.email })}"` : ''}><button class="btn btn--sm ${cls}" type="submit"${disabled ? ` disabled title="${L('admin.lastAdminHint')}"` : ''}>${L(`admin.${a}` as StringKey)}</button></form>`;

  const person = (u: UserRow): string =>
    `<td class="person"><div class="who">${avatar(u.picture, u.name, u.email)}<div><div class="person__name">${e(u.name || u.email)}${u.id === me.id ? ` <span class="person__you">(${L('admin.you')})</span>` : ''}</div><div class="person__email">${e(u.email)}</div></div></div></td>`;
  const note = (u: UserRow): string => `<td class="note">${u.note ? e(u.note) : '<span class="muted">-</span>'}</td>`;

  const pendingRows = pending
    .map(
      (u) => `<tr>${person(u)}${note(u)}<td>${u.requested_at ? time(c, u.requested_at) : `<span class="tag tag--line">${L('admin.noRequest')}</span>`}</td>
<td class="acts">${action(u, 'approve', 'btn--primary')}${action(u, 'deny', 'btn--secondary', 'admin.confirmDeny')}</td></tr>`,
    )
    .join('');

  const approvedRows = approved
    .map((u) => {
      const isAdmin = u.role === 'admin';
      const lastAdmin = isAdmin && admins <= 1;
      const roleTag = isAdmin ? `<span class="tag tag--ink">${L('admin.roleAdmin')}</span>` : `<span class="tag tag--line">${L('admin.roleUser')}</span>`;
      const acts = [
        isAdmin ? action(u, 'demote', 'btn--secondary', 'admin.confirmDemote', lastAdmin) : action(u, 'promote', 'btn--secondary'),
        u.id === me.id ? '' : action(u, 'revoke', 'btn--danger', 'admin.confirmRevoke', lastAdmin),
      ].join('');
      const cost = u.cost_today > 0 ? `<div class="muted">${L('admin.costToday', { n: u.cost_today.toFixed(2) })}</div>` : '';
      return `<tr>${person(u)}<td>${roleTag}</td><td class="num">${u.turns_today}${isAdmin ? '' : ` / ${o.turnsPerDay}`}${cost}</td><td>${time(c, u.last_seen_at, t(c.lang, 'admin.never'))}</td><td>${time(c, u.decided_at)}</td><td class="acts">${acts}</td></tr>`;
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

  const auditRows = o.audit
    .map((a) => `<tr><td>${time(c, a.at)}</td><td>${e(a.who === 'system' ? '-' : a.who)}</td><td>${e(t(c.lang, `audit.${a.what}` as StringKey))}</td><td>${e(a.target ?? '')}</td></tr>`)
    .join('');

  const msg = o.notice ? notice(o.notice.kind, t(c.lang, o.notice.key, { email: o.notice.email })) : '';
  const count = (n: number, hot = false): string => `<span class="count${hot && n > 0 ? ' count--hot' : ''}">${n}</span>`;

  return shell(c, {
    title: t(c.lang, 'admin.title'),
    bodyClass: 'page page--admin',
    body: `<header class="appbar">
  ${lockup(c, 'header', { href: '/' })}
  <span class="appbar__section">${L('admin.label')}</span>
  <div class="appbar__right">
    ${langSwitch(c)}
    <a class="btn btn--ghost" href="/">${L('admin.openApp')}</a>
    <span class="appbar__me">${avatar(me.picture, me.name, me.email, 24)}<span>${e(me.email)}</span></span>
    ${signOutForm(c)}
  </div>
</header>
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
