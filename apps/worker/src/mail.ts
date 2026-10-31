// Notification emails through Cloudflare Email Service (the send_email binding EMAIL, sender MAIL_FROM on
// alikorea-demo.com), mirroring the WonderClip platform's mail.js: an HTML body and a text body, in the recipient's
// language. MAIL_LOG=1 (local only) logs the recipient and subject instead of sending. A failure is logged and
// returned, never thrown: a notification must never block the request that caused it.
import type { Env } from './env.ts';
import { allowedOrigin } from './env.ts';
import { escapeHtml } from './http.ts';
import { t } from './pages/i18n.ts';
import type { Lang } from './pages/i18n.ts';

type Block = { p: string; muted?: boolean } | { rows: Array<[string, string]> } | { button: string; href: string };

const asLang = (v: string | null | undefined): Lang => (v === 'ko' || v === 'zh' ? v : 'en');

function page(env: Env, lang: Lang, title: string, blocks: Block[]): string {
  const body = blocks
    .map((b) => {
      if ('button' in b) return `<div style="margin:24px 0"><a href="${escapeHtml(b.href)}" style="display:inline-block;background:#1354ee;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:10px 20px">${escapeHtml(b.button)}</a></div>`;
      if ('rows' in b) return `<table style="border-collapse:collapse;margin:16px 0;font-size:14px">${b.rows.map(([k, v]) => `<tr><td style="padding:4px 16px 4px 0;color:#636466;white-space:nowrap;vertical-align:top">${escapeHtml(k)}</td><td style="padding:4px 0;color:#181818">${escapeHtml(v)}</td></tr>`).join('')}</table>`;
      return `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:${b.muted ? '#636466' : '#181818'}">${escapeHtml(b.p)}</p>`;
    })
    .join('');
  return `<!doctype html><html lang="${lang}"><body style="margin:0;background:#f4f5f7;font-family:'Helvetica Neue',Helvetica,Arial,'PingFang SC','Microsoft YaHei','Apple SD Gothic Neo','Malgun Gothic',sans-serif">
<div style="max-width:560px;margin:0 auto;padding:28px 16px"><div style="background:#ffffff;padding:28px;border:1px solid #dcddde">
<div style="width:24px;height:4px;background:#ff6a00"></div>
<h1 style="font-size:19px;margin:16px 0;color:#181818">${escapeHtml(title)}</h1>${body}
</div><p style="font-size:12px;color:#636466;text-align:center;margin:14px 0 0">${escapeHtml(env.SITE_NAME ?? 'Architecture Builder')} · ${escapeHtml(allowedOrigin(env) ?? '')}</p></div></body></html>`;
}

const text = (title: string, blocks: Block[]): string =>
  [title, ...blocks.map((b) => ('button' in b ? `${b.button}: ${b.href}` : 'rows' in b ? b.rows.map(([k, v]) => `${k}: ${v}`).join('\n') : b.p))].join('\n\n') + '\n';

export interface MailResult {
  ok: boolean;
  logged?: boolean;
  error?: string;
}

async function send(env: Env, to: string, subject: string, title: string, lang: Lang, blocks: Block[]): Promise<MailResult> {
  if (env.MAIL_LOG === '1') {
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

export interface MailUser {
  email: string;
  name: string;
  note: string | null;
  lang: string | null;
}

/** Tells each admin about a new access request, in the admin's language. */
export async function notifyAccessRequest(env: Env, user: MailUser, admins: Array<{ email: string; lang: string | null }>): Promise<MailResult[]> {
  const origin = allowedOrigin(env) ?? '';
  return Promise.all(
    admins.map((a) => {
      const l = asLang(a.lang);
      const name = user.name || user.email;
      return send(env, a.email, t(l, 'mail.request.subject', { name, email: user.email }), t(l, 'mail.request.title'), l, [
        { p: t(l, 'mail.request.body') },
        { rows: [[t(l, 'mail.request.name'), name], [t(l, 'mail.request.email'), user.email], [t(l, 'mail.request.note'), user.note || '-']] },
        { button: t(l, 'mail.request.button'), href: `${origin}/admin` },
      ]);
    }),
  );
}

/** Tells a user their access was approved. */
export async function notifyApproved(env: Env, user: MailUser): Promise<MailResult> {
  const l = asLang(user.lang);
  return send(env, user.email, t(l, 'mail.approved.subject'), t(l, 'mail.approved.title'), l, [
    { p: t(l, 'mail.approved.body') },
    { button: t(l, 'mail.approved.button'), href: `${allowedOrigin(env) ?? ''}/` },
  ]);
}
