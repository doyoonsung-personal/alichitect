import type { Env } from './env.ts';
import type { UserRow } from './db.ts';
import { randomHex } from './crypto.ts';
import { escapeHtml as e, html, json, readForm, redirect } from './http.ts';
import { issueKey, listKeys, revokeKey } from './mcp-keys.ts';
import { t, type StringKey } from './pages/i18n.ts';
import { footer, shell, time, type PageCtx } from './pages/layout.ts';
import { appbar } from './pages/views.ts';

export async function keyMenu(req: Request, env: Env, user: UserRow, page: PageCtx): Promise<Response> {
  const path = new URL(req.url).pathname;
  const base = '/account/keys';
  let secret: string | null = null;
  let invalid = false;
  const now = Date.now();
  if (req.method === 'POST') {
    const form = await readForm(req);
    if (path === base + '/revoke') {
      await revokeKey(env.DB, user.id, form?.get('id') ?? '', now);
      return redirect(base, 303);
    }
    if (path !== base) return json(404, { error: 'not-found' });
    const scope = form?.get('scope');
    const issuance = form?.get('issuance') ?? '';
    if (scope === 'read' || scope === 'write') secret = await issueKey(env.DB, user.id, form?.get('name') ?? '', scope, Number(form?.get('days')), now, issuance);
    if (!secret && await env.DB.prepare('SELECT 1 FROM mcp_keys WHERE user_id=? AND issuance_id=?').bind(user.id, issuance).first()) {
      return redirect(base, 303);
    }
    invalid = !secret;
  } else if (req.method !== 'GET' || path !== base) return json(405, { error: 'method-not-allowed' });
  const keys = await listKeys(env.DB, user.id);
  const L = (k: StringKey) => e(t(page.lang, k));
  const endpoint = new URL('/mcp', req.url).href;
  const config = JSON.stringify({
    mcpServers: {
      alichitect: {
        type: 'http', url: endpoint,
        headers: { Authorization: 'Bearer <YOUR_API_KEY>' }
      }
    }
  }, null, 2);
  return html(invalid ? 400 : 200, shell(page, {
    title: t(page.lang, 'mcp.keys'), bodyClass: 'page page--admin',
    body: `${appbar(page, user, 'mcp.keys')}<main class="account" id="main"><h1 class="title">${L('mcp.keys')}</h1>
    <p class="intro intro--left">${L('mcp.intro')}</p>
    ${secret ? `<section class="section" role="status"><p>${L('mcp.once')}</p><input id="mcp-secret" class="input" aria-label="API key" readonly value="${e(secret)}"><button type="button" hidden data-copy-key data-copied="${L('mcp.copied')}" class="btn">${L('mcp.copy')}</button></section>` : ''}
    ${invalid ? `<p role="alert">${L('mcp.invalid')}</p>` : ''}
    <section class="section"><p>${L('mcp.connect')}</p><p><code>${e(endpoint)}</code></p><p><code>Authorization: Bearer &lt;YOUR_API_KEY&gt;</code></p>
    <details><summary>Qoder · JSON</summary><pre class="mcp-config">${e(config)}</pre></details></section>
    <form class="form form--auth form--narrow" method="post" action="${base}"><input type="hidden" name="issuance" value="${randomHex(16)}">
    <label>${L('mcp.name')}<input required maxlength="60" name="name" placeholder="Qoder" class="input"></label>
    <label>${L('mcp.scope')}<select name="scope"><option value="write">${L('mcp.write')}</option><option value="read">${L('mcp.read')}</option></select></label>
    <label>${L('mcp.expires')}<select name="days">${[30, 90, 365].map(n => `<option value="${n}"${n === 90 ? ' selected' : ''}>${e(t(page.lang, 'mcp.days', { days: n }))}</option>`).join('')}</select></label>
    <button class="btn btn--primary" type="submit">${L('mcp.create')}</button></form>
    ${keys.length ? keys.map(k => `<section class="section"><h2 class="section__title">${e(k.name)}</h2>
      <p><code>ali_mcp_${e(k.id)}_…</code> · ${L(k.scope === 'read' ? 'mcp.read' : 'mcp.write')}</p>
      <p>${L('mcp.expires')} · ${time(page, k.expires_at)}<br>${L('mcp.used')} · ${time(page, k.last_used_at, t(page.lang, 'mcp.never'))}</p>
      ${k.revoked_at ? L('mcp.revoked') : k.expires_at > now ? `<form method="post" action="${base}/revoke" data-confirm="${L('mcp.confirmRevoke')}"><input type="hidden" name="id" value="${e(k.id)}"><button class="btn" type="submit">${L('mcp.revoke')}</button></form>` : ''}
    </section>`).join('') : `<p>${L('mcp.none')}</p>`}
    </main>${footer(page)}`
  }));
}
