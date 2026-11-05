import type { Env, ExecutionContextLike } from './env.ts';
import { proposalDeadlineMs } from './env.ts';
import { userById, type UserRow } from './db.ts';
import type { ProposalEvent } from '../../../packages/core/src/types.ts';
import { handleProposal } from './proposal.ts';
import type { PdfDesign, PdfOptions } from './mcp-pdf-types.ts';
import { DesignError, latestDesign, openedDesign } from './mcp-designs.ts';
import { sha256Hex } from './crypto.ts';
import { escapeHtml, html, json } from './http.ts';

async function render(env: Env, design: PdfDesign, options: PdfOptions) {
  const { renderProposal } = await import('../build/pdf/renderer.js');
  return renderProposal(design, options, async path => {
    const response = await env.ASSETS.fetch(new Request(env.ALLOWED_ORIGIN + path));
    if (!response.ok) throw Error('PDF asset unavailable');
    return response;
  });
}

async function writeHandoff(env: Env, ctx: ExecutionContextLike, user: UserRow, design: PdfDesign, options: PdfOptions) {
  const request = new Request(env.ALLOWED_ORIGIN + '/api/proposal', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: design.designId, lang: options.lang, title: Array.from(options.title || design.title).slice(0, 160).join(''),
      customer: Array.from(options.customer || '').slice(0, 80).join(''), audience: options.audience ?? 'client', memory: design.memory, pricing: design.pricing,
      editorialNotes: options.draft ? Array.from(JSON.stringify(options.draft)).slice(0, 12000).join('') : undefined }) });
  const response = await handleProposal(request, env, ctx, user);
  for (const line of (await response.text()).trim().split('\n')) {
    const event = JSON.parse(line) as ProposalEvent;
    if (event.type === 'fatal') {
      if (event.code === 'user-busy') return null;
      throw new DesignError(event.message);
    }
    if (event.type === 'done') return { ...options, draft: event.draft };
  }
  throw new DesignError('The proposal writer did not finish. Retry this export.');
}

export async function exportPdf(env: Env, user: UserRow, designId: string, revision: number, options: PdfOptions, includeFile: boolean, retryFailed: boolean) {
  const owner = user.id;
  // Audience and writing version are part of the identity: an internal brief must never reuse a client PDF.
  options = { ...options, audience: options.audience ?? 'client' };
  const id = await sha256Hex(JSON.stringify(['audience-proposal-v3-readable', owner, designId, revision, options]));
  let row = await latestDesign(env.DB, owner, designId);
  if (!row) throw new DesignError('Design not found for this account.');
  if (row.revision !== revision) {
    // An existing export can finish and be collected even if the customer has since refined the design.
    row = await env.DB.prepare(`SELECT r.* FROM mcp_pdf_exports p JOIN mcp_revisions r
      ON r.user_id=p.user_id AND r.design_id=p.design_id AND r.revision=p.revision AND r.status='done'
      WHERE p.id=? AND p.user_id=?`).bind(id, owner).first<typeof row>();
    if (!row) throw new DesignError('The design revision changed. Use get_design before starting a new export.');
  }
  const design = openedDesign(row);
  const url = env.ALLOWED_ORIGIN + '/account/proposals/' + id + '.pdf';
  await env.DB.prepare(`INSERT INTO mcp_pdf_exports(id,user_id,design_id,revision,options,writing_since)
    VALUES (?,?,?,?,?,0) ON CONFLICT DO NOTHING`).bind(id, owner, designId, revision, JSON.stringify(options)).run();
  if (retryFailed) await env.DB.prepare(`UPDATE OR IGNORE mcp_pdf_exports SET writing_since=0,write_error=NULL
    WHERE id=? AND user_id=? AND write_error IS NOT NULL`).bind(id, owner).run();
  const job = await env.DB.prepare('SELECT options,writing_since,write_error FROM mcp_pdf_exports WHERE id=? AND user_id=?')
    .bind(id, owner).first<{ options: string; writing_since: number | null; write_error: string | null }>();
  if (!job) throw new DesignError('Another proposal is being prepared for this account. Retry after it finishes.');
  if (job.write_error) throw new DesignError(job.write_error + ' Set retryFailed=true to request a new writing pass.');
  if (job.writing_since !== null) {
    const pending = { designId, revision, audience: options.audience, url, status: 'preparing', retryAfterSeconds: 60 };
    return { content: [{ type: 'text' as const, text: JSON.stringify(pending) }], structuredContent: pending };
  }
  const { bytes, fileName } = await render(env, design, JSON.parse(job.options));
  const metadata = { designId, revision, audience: options.audience, url, status: 'ready', fileName, mimeType: 'application/pdf' };
  const text = { type: 'text' as const, text: JSON.stringify(metadata) };
  if (!includeFile) return { content: [text], structuredContent: metadata };
  // Encode in bounded chunks to avoid exceeding the JavaScript argument limit.
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return { content: [text, { type: 'resource' as const, resource: { uri: url, mimeType: 'application/pdf', blob: btoa(binary) } }], structuredContent: metadata };
}

/** Cron owns the long model call even if the IDE has disconnected. Only the winner of the D1 claim spends a turn. */
export async function processPdfQueue(env: Env, ctx: ExecutionContextLike) {
  const now = Date.now();
  await env.DB.prepare(`UPDATE mcp_pdf_exports SET writing_since=NULL,write_error='The writing pass was interrupted.'
    WHERE writing_since>0 AND writing_since<?`).bind(now - proposalDeadlineMs(env) - 60_000).run();
  const jobs = await env.DB.prepare(`SELECT p.id,p.user_id,p.options,r.* FROM mcp_pdf_exports p JOIN mcp_revisions r
    ON r.user_id=p.user_id AND r.design_id=p.design_id AND r.revision=p.revision AND r.status='done'
    WHERE p.writing_since=0 ORDER BY p.rowid LIMIT 4`).all<NonNullable<Awaited<ReturnType<typeof latestDesign>>> & { id: string; user_id: string; options: string }>();
  await Promise.all(jobs.results.map(async job => {
    const lease = await env.DB.prepare('UPDATE mcp_pdf_exports SET writing_since=? WHERE id=? AND writing_since=0').bind(now, job.id).run();
    if (!lease.meta.changes) return;
    try {
      const user = await userById(env.DB, job.user_id);
      if (user?.status !== 'approved') throw new DesignError('Account access is no longer approved.');
      const options = await writeHandoff(env, ctx, user, openedDesign(job), JSON.parse(job.options));
      if (!options) {
        await env.DB.prepare('UPDATE mcp_pdf_exports SET writing_since=0 WHERE id=? AND writing_since=?').bind(job.id, now).run();
        return;
      }
      await env.DB.prepare('UPDATE mcp_pdf_exports SET options=?,writing_since=NULL WHERE id=? AND writing_since=?')
        .bind(JSON.stringify(options), job.id, now).run();
    } catch (error) {
      const message = error instanceof DesignError ? error.message : 'The proposal writer could not finish.';
      await env.DB.prepare('UPDATE mcp_pdf_exports SET writing_since=NULL,write_error=? WHERE id=? AND writing_since=?')
        .bind(message, job.id, now).run();
    }
  }));
}

export async function downloadPdf(env: Env, owner: string, id: string): Promise<Response> {
  // Later design edits must never silently replace the revision that was exported.
  const row = await env.DB.prepare(`SELECT r.*, p.options,p.writing_since,p.write_error FROM mcp_pdf_exports p JOIN mcp_revisions r
    ON r.user_id=p.user_id AND r.design_id=p.design_id AND r.revision=p.revision AND r.status='done'
    WHERE p.id=? AND p.user_id=?`).bind(id, owner).first<NonNullable<Awaited<ReturnType<typeof latestDesign>>> & { options: string; writing_since: number | null; write_error: string | null }>();
  if (!row) return json(404, { error: 'pdf-not-found' });
  const options = JSON.parse(row.options) as PdfOptions;
  if (row.writing_since !== null || row.write_error) {
    const status = {
      en: ['Preparing your proposal', 'This page checks automatically and downloads the PDF when it is ready.', 'The proposal could not be completed. Ask your agent to retry.'],
      ko: ['제안서를 작성하고 있습니다', '이 페이지에서 진행 상태를 확인하고 완성된 PDF를 자동으로 다운로드합니다.', '제안서를 완성하지 못했습니다. 에이전트에 다시 요청해 주세요.'],
      zh: ['正在撰写提案', '本页会自动检查进度，完成后下载 PDF。', '提案未能完成。请让智能体重试。'],
    }[options.lang];
    const title = row.write_error ? status[2] : status[0];
    return html(row.write_error ? 503 : 202, `<!doctype html><html lang="${options.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
      <title>${escapeHtml(title)}</title><link rel="stylesheet" href="/_auth/pages.css"></head>
      <body class="page page--centre"><main class="centre"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(row.write_error || status[1])}</p></main></body></html>`,
      row.write_error ? [] : [['Refresh','15'], ['Retry-After','15']]);
  }
  const { bytes, fileName } = await render(env, openedDesign(row), options);
  const encoded = encodeURIComponent(fileName).replace(/['()*]/g, c => '%' + c.charCodeAt(0).toString(16));
  return new Response(new Blob([bytes as BlobPart]), { headers: {
    'Content-Type': 'application/pdf', 'Content-Disposition': "attachment; filename=\"proposal.pdf\"; filename*=UTF-8''" + encoded,
    'Cache-Control': 'private, no-store',
  } });
}
