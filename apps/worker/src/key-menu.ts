import type { Env } from './env.ts';
import type { UserRow } from './db.ts';
import { randomHex } from './crypto.ts';
import { escapeHtml as e, html, json, readForm, redirect } from './http.ts';
import { issueKey, listKeys, revokeKey, MAX_ACTIVE_KEYS, type KeyInfo } from './mcp-keys.ts';
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
  const keys = await listKeys(env.DB, user.id, now);
  const isActive = (k: KeyInfo) => k.revoked_at === null && k.expires_at > now;
  const active = keys.filter(isActive);
  const history = keys.filter(k => !isActive(k));
  const atCap = active.length >= MAX_ACTIVE_KEYS;
  const L = (k: StringKey, vars?: Record<string, string | number>) => e(t(page.lang, k, vars));
  const renderKey = (k: KeyInfo) => `<article class="section" aria-labelledby="key-${e(k.id)}">
    <h3 class="section__title" id="key-${e(k.id)}"><span class="mcp-config">${e(k.name)}</span></h3>
    <p class="person__email"><code>ali_mcp_${e(k.id)}_…</code></p>
    <dl class="facts">
      <div><dt>${L('mcp.scope')}</dt><dd>${L(k.scope === 'read' ? 'mcp.scopeRead' : 'mcp.scopeWrite')}</dd></div>
      <div><dt>${L('mcp.created')}</dt><dd>${time(page, k.created_at)}</dd></div>
      <div><dt>${L('mcp.expires')}</dt><dd>${time(page, k.expires_at)}</dd></div>
      <div><dt>${L('mcp.used')}</dt><dd>${time(page, k.last_used_at, t(page.lang, 'mcp.never'))}</dd></div>
    </dl>
    ${isActive(k) ? `<form method="post" action="${base}/revoke" data-confirm="${L('mcp.confirmRevoke')}"><input type="hidden" name="id" value="${e(k.id)}"><button class="btn btn--danger" type="submit">${L('mcp.revoke')}</button></form>` : `<p>${L(k.revoked_at !== null ? 'mcp.revoked' : 'mcp.expired')}${k.revoked_at !== null ? ` · ${time(page, k.revoked_at)}` : ''}</p>`}
  </article>`;
  const endpoint = new URL('/mcp', req.url).href;
  const bearer = 'Bearer <YOUR_API_KEY>';
  const servers = { alichitect: { type: 'http', url: endpoint, headers: { Authorization: bearer } } };
  return html(invalid ? 400 : 200, shell(page, {
    title: t(page.lang, 'mcp.keys'), bodyClass: 'page page--admin page--keys',
    body: `${appbar(page, user, 'mcp.keys')}<main class="account" id="main"><h1 class="title">${L('mcp.keys')}</h1>
    <p id="mcp-active-count" role="status"><strong>${L('mcp.activeCount', { count: active.length, max: MAX_ACTIVE_KEYS })}</strong></p>
    <p class="intro intro--left">${L('mcp.intro')}</p>
    ${secret ? `<section class="section" role="status"><p>${L('mcp.once')}</p><input id="mcp-secret" class="input" aria-label="${L('mcp.secret')}" readonly value="${e(secret)}"><button type="button" hidden data-copy-from="mcp-secret" data-copied="${L('mcp.copied')}" class="btn">${L('mcp.copy')}</button></section>` : ''}
    ${atCap ? `<p id="mcp-limit" role="${invalid ? 'alert' : 'status'}">${L('mcp.limit', { max: MAX_ACTIVE_KEYS })}${active.length > MAX_ACTIVE_KEYS ? ` ${L('mcp.overLimit', { max: MAX_ACTIVE_KEYS })}` : ''}</p>` : invalid ? `<p role="alert">${L('mcp.invalid')}</p>` : ''}
    <nav class="jump" aria-label="${L('mcp.keys')}"><a href="#mcp-active">${L('mcp.active')}</a><a href="#mcp-create">${L('mcp.create')}</a></nav>
    <section id="mcp-active" aria-labelledby="mcp-active-title"><h2 class="section__title" id="mcp-active-title">${L('mcp.active')}</h2>
    ${active.length ? active.map(renderKey).join('') : `<p class="empty">${L('mcp.none')}</p>`}</section>
    <details class="section" id="mcp-history"><summary>${L('mcp.history', { count: history.length })}</summary>
    <p class="muted">${L('mcp.historyHint')}</p>${history.map(renderKey).join('')}</details>
    <section class="section" id="mcp-create" aria-labelledby="mcp-create-title"><h2 class="section__title" id="mcp-create-title">${L('mcp.create')}</h2>
    <form class="form form--auth form--narrow" method="post" action="${base}"><input type="hidden" name="issuance" value="${randomHex(16)}">
    <label>${L('mcp.name')}<input required maxlength="60" name="name" placeholder="Qoder" class="input"></label>
    <label>${L('mcp.scope')}<select name="scope"><option value="write">${L('mcp.write')}</option><option value="read">${L('mcp.read')}</option></select></label>
    <label>${L('mcp.expires')}<select name="days">${[30, 90, 365].map(n => `<option value="${n}"${n === 90 ? ' selected' : ''}>${e(t(page.lang, 'mcp.days', { days: n }))}</option>`).join('')}</select></label>
    <button class="btn btn--primary" type="submit"${atCap ? ' disabled aria-describedby="mcp-limit"' : ''}>${L('mcp.create')}</button></form></section>
    <section class="section mcp-guide" aria-labelledby="mcp-setup"><h2 class="section__title" id="mcp-setup">${L('mcp.connect')}</h2>
    <ol>
      <li>${L('mcp.setupKey')}</li>
      <li>${L('mcp.setupServer')}<pre class="mcp-config"><code>${e(endpoint)}</code></pre></li>
      <li>${L('mcp.setupAuth')}<pre class="mcp-config"><code>Authorization: ${e(bearer)}</code></pre></li>
      <li>${L('mcp.setupVerify')}</li>
    </ol>
    <details><summary>Qoder · JSON</summary><pre class="mcp-config">${e(JSON.stringify({ mcpServers: servers }, null, 2))}</pre></details>
    <details><summary>VS Code · mcp.json</summary><pre class="mcp-config">${e(JSON.stringify({ servers }, null, 2))}</pre></details>
    <details><summary>${L('mcp.setupHelp')}</summary><p>${L('mcp.setupTrouble')}</p></details></section>
    <section class="section" aria-labelledby="mcp-workflow"><h2 class="section__title" id="mcp-workflow">${L('mcp.workflowTitle')}</h2>
    <p class="intro intro--left">${L('mcp.workflowIntro')}</p>
    <textarea id="mcp-prompt" class="textarea" rows="8" readonly aria-labelledby="mcp-workflow">${L('mcp.workflowPrompt')}</textarea>
    <button type="button" hidden data-copy-from="mcp-prompt" data-copied="${L('mcp.copied')}" class="btn btn--secondary">${L('mcp.copyPrompt')}</button></section>
    <section class="section" aria-labelledby="mcp-workshop"><h2 class="section__title" id="mcp-workshop">${L('mcp.workshopTitle')}</h2>
    <p class="intro intro--left">${L('mcp.workshopIntro')}</p>
    <textarea id="mcp-workshop-prompt" class="textarea" rows="6" readonly aria-labelledby="mcp-workshop">${L('mcp.workshopPrompt')}</textarea>
    <button type="button" hidden data-copy-from="mcp-workshop-prompt" data-copied="${L('mcp.copied')}" class="btn btn--secondary">${L('mcp.copyPrompt')}</button></section>
    </main>${footer(page)}`
  }));
}
