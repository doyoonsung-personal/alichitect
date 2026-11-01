// Emails through Cloudflare Email Service (the send_email binding EMAIL, sender MAIL_FROM on alikorea-demo.com),
// mirroring the WonderClip platform's mail.js: "[Site] ..." subjects (a code mail carries its code in the subject), a
// title, short paragraphs, the code in large type, a muted "if you did not ask for this" line, an HTML body and a text
// body, in the recipient's language. The look follows this app: ink on white, the action blue for buttons, and orange
// only in the small brand bar (never as text: it fails contrast on white).
//
// MAIL_LOG=1 (local development only, see mailLogAllowed) logs the recipient and subject instead of sending; the
// subject carries the code, which is how local tests read it. A failure is logged and returned, never thrown: a mail
// must never break the request that caused it.
import type { Env } from './env.ts';
import { allowedOrigin, isSharedAccount, mailLogAllowed } from './env.ts';
import { escapeHtml } from './http.ts';
import { t } from './pages/i18n.ts';
import type { Lang } from './pages/i18n.ts';

type Block = { p: string; muted?: boolean } | { rows: Array<[string, string]> } | { button: string; href: string } | { code: string };

export const asLang = (v: string | null | undefined): Lang => (v === 'ko' || v === 'zh' ? v : 'en');

function page(env: Env, lang: Lang, title: string, blocks: Block[]): string {
  const body = blocks
    .map((b) => {
      if ('code' in b) return `<div style="margin:22px 0;font:700 32px/1 Consolas,'Courier New',monospace;letter-spacing:.3em;color:#181818">${escapeHtml(b.code)}</div>`;
      if ('button' in b) return `<div style="margin:24px 0"><a href="${escapeHtml(b.href)}" style="display:inline-block;background:#1354ee;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:10px 20px">${escapeHtml(b.button)}</a></div>`;
      if ('rows' in b) return `<table style="border-collapse:collapse;margin:16px 0;font-size:14px">${b.rows.map(([k, v]) => `<tr><td style="padding:4px 16px 4px 0;color:#636466;white-space:nowrap;vertical-align:top">${escapeHtml(k)}</td><td style="padding:4px 0;color:#181818;white-space:pre-wrap">${escapeHtml(v)}</td></tr>`).join('')}</table>`;
      return `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:${b.muted ? '#636466' : '#181818'}">${escapeHtml(b.p)}</p>`;
    })
    .join('');
  return `<!doctype html><html lang="${lang}"><body style="margin:0;background:#f4f5f7;font-family:'Helvetica Neue',Helvetica,Arial,'PingFang SC','Microsoft YaHei','Apple SD Gothic Neo','Malgun Gothic',sans-serif">
<div style="max-width:560px;margin:0 auto;padding:28px 16px"><div style="background:#ffffff;padding:28px;border:1px solid #dcddde">
<div style="width:24px;height:4px;background:#ff6a00"></div>
<h1 style="font-size:19px;margin:16px 0;color:#181818">${escapeHtml(title)}</h1>${body}
</div><p style="font-size:12px;color:#636466;text-align:center;margin:14px 0 0">${escapeHtml(env.SITE_NAME ?? 'Architecture Builder')} · ${escapeHtml(allowedOrigin(env) ?? '')}</p></div></body></html>`;
}

/** One line: line breaks and runs of spaces (U+2028 and U+2029 too) become single spaces. */
const oneLine = (v: string): string => v.replace(/[\s\u2028\u2029]+/g, ' ').trim();

/**
 * The plain-text body. A row's value is applicant-supplied text (name, note), so it is flattened to one line: a note
 * cannot start a line of its own that reads like part of the mail ("Approve now: https://...").
 */
const text = (title: string, blocks: Block[]): string =>
  [title, ...blocks.map((b) => ('code' in b ? b.code : 'button' in b ? `${b.button}: ${b.href}` : 'rows' in b ? b.rows.map(([k, v]) => `${k}: ${oneLine(v)}`).join('\n') : b.p))].join('\n\n') + '\n';

export interface MailResult {
  ok: boolean;
  logged?: boolean;
  error?: string;
}

async function send(env: Env, to: string, subject: string, title: string, lang: Lang, blocks: Block[]): Promise<MailResult> {
  // A shared demo account's address need not be a real inbox (and may belong to someone else): never mail it. The
  // answer is ok, so sign-up, reset and the rest behave the same from outside.
  if (isSharedAccount(env, to)) {
    console.log(JSON.stringify({ evt: 'mail-skipped', reason: 'shared account' }));
    return { ok: true };
  }
  if (mailLogAllowed(env)) {
    console.log(JSON.stringify({ evt: 'mail-logged', to, subject }));
    return { ok: true, logged: true };
  }
  if (!env.EMAIL || !env.MAIL_FROM) {
    console.warn(JSON.stringify({ evt: 'mail-skipped', reason: 'no EMAIL binding or MAIL_FROM' }));
    return { ok: false, error: 'not configured' };
  }
  try {
    await env.EMAIL.send({ from: { email: env.MAIL_FROM, name: env.SITE_NAME ?? 'Architecture Builder' }, to, subject, html: page(env, lang, title, blocks), text: text(title, blocks) });
    return { ok: true };
  } catch (e) {
    const err = e as { code?: string; name?: string };
    console.error(JSON.stringify({ evt: 'mail-failed', code: err?.code ?? err?.name ?? 'error' }));
    return { ok: false, error: err?.code ?? 'send failed' };
  }
}

const origin = (env: Env): string => allowedOrigin(env) ?? '';

/** The 6-digit code that confirms a sign-up's address. */
export function mailVerifyCode(env: Env, to: string, code: string, lang: Lang): Promise<MailResult> {
  return send(env, to, t(lang, 'mail.verify.subject', { code }), t(lang, 'mail.verify.title'), lang, [{ p: t(lang, 'mail.verify.body') }, { code }, { p: t(lang, 'mail.ignore'), muted: true }]);
}

/** The 6-digit code that lets the owner set a new password. */
export function mailResetCode(env: Env, to: string, code: string, lang: Lang): Promise<MailResult> {
  return send(env, to, t(lang, 'mail.reset.subject', { code }), t(lang, 'mail.reset.title'), lang, [{ p: t(lang, 'mail.reset.body') }, { code }, { p: t(lang, 'mail.ignore'), muted: true }]);
}

/**
 * Sent instead of a code when someone signs up with an address that already has an account. The page they see is the
 * same as for a new address, so the sign-up form never tells anyone which addresses have accounts; only the inbox's
 * owner learns it.
 */
export function mailAlreadyRegistered(env: Env, to: string, lang: Lang): Promise<MailResult> {
  return send(env, to, t(lang, 'mail.exists.subject'), t(lang, 'mail.exists.title'), lang, [
    { p: t(lang, 'mail.exists.body') },
    { button: t(lang, 'mail.exists.button'), href: `${origin(env)}/login` },
    { p: t(lang, 'mail.exists.forgot', { url: `${origin(env)}/forgot` }) },
    { p: t(lang, 'mail.exists.ignore'), muted: true },
  ]);
}

/** Tells the owner their password changed (reset by code, or changed while signed in). */
export function mailPasswordChanged(env: Env, to: string, lang: Lang): Promise<MailResult> {
  return send(env, to, t(lang, 'mail.changed.subject'), t(lang, 'mail.changed.title'), lang, [
    { p: t(lang, 'mail.changed.body') },
    { p: t(lang, 'mail.changed.notYou'), muted: true },
    { button: t(lang, 'mail.changed.button'), href: `${origin(env)}/forgot` },
  ]);
}

export interface MailUser {
  email: string;
  name: string;
  note: string | null;
  lang: string | null;
}

/** Tells each admin about a new access request (an address just confirmed), in the admin's language. */
export async function notifyAccessRequest(env: Env, user: MailUser, admins: Array<{ email: string; lang: string | null }>): Promise<MailResult[]> {
  return Promise.all(
    admins.map((a) => {
      const l = asLang(a.lang);
      const name = user.name || user.email;
      return send(env, a.email, t(l, 'mail.request.subject', { name, email: user.email }), t(l, 'mail.request.title'), l, [
        { p: t(l, 'mail.request.body') },
        { rows: [[t(l, 'mail.request.name'), name], [t(l, 'mail.request.email'), user.email], [t(l, 'mail.request.note'), user.note ? `“${user.note}”` : '-']] },
        { button: t(l, 'mail.request.button'), href: `${origin(env)}/admin` },
      ]);
    }),
  );
}

/** Tells a user their access was approved. */
export async function notifyApproved(env: Env, user: MailUser): Promise<MailResult> {
  const l = asLang(user.lang);
  return send(env, user.email, t(l, 'mail.approved.subject'), t(l, 'mail.approved.title'), l, [
    { p: t(l, 'mail.approved.body', { name: user.name || user.email }) },
    { button: t(l, 'mail.approved.button'), href: `${origin(env)}/login` },
  ]);
}
