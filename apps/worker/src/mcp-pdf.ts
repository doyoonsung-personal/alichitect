import type { Env } from './env.ts';
import type { PdfDesign, PdfOptions } from './mcp-pdf-types.ts';
import { DesignError, latestDesign, openedDesign } from './mcp-designs.ts';
import { sha256Hex } from './crypto.ts';
import { json } from './http.ts';

async function render(env: Env, design: PdfDesign, options: PdfOptions) {
  const { renderProposal } = await import('../build/pdf/renderer.js');
  return renderProposal(design, options, async path => {
    const response = await env.ASSETS.fetch(new Request(env.ALLOWED_ORIGIN + path));
    if (!response.ok) throw Error('PDF asset unavailable');
    return response;
  });
}

export async function exportPdf(env: Env, owner: string, designId: string, revision: number, options: PdfOptions, includeFile: boolean) {
  const row = await latestDesign(env.DB, owner, designId);
  if (!row) throw new DesignError('Design not found for this account.');
  if (row.revision !== revision) throw new DesignError('The design revision changed. Use get_design before exporting.');
  const { bytes, fileName } = await render(env, openedDesign(row), options);
  const settings = JSON.stringify(options);
  const id = await sha256Hex(JSON.stringify([owner, designId, revision, settings]));
  await env.DB.prepare('INSERT INTO mcp_pdf_exports(id,user_id,design_id,revision,options) VALUES (?,?,?,?,?) ON CONFLICT(id) DO NOTHING')
    .bind(id, owner, designId, revision, settings).run();
  const url = env.ALLOWED_ORIGIN + '/account/proposals/' + id + '.pdf';
  const metadata = { designId, revision, url, fileName, mimeType: 'application/pdf' };
  const text = { type: 'text' as const, text: JSON.stringify(metadata) };
  if (!includeFile) return { content: [text], structuredContent: metadata };
  // Encode in bounded chunks to avoid exceeding the JavaScript argument limit.
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return { content: [text, { type: 'resource' as const, resource: { uri: url, mimeType: 'application/pdf', blob: btoa(binary) } }], structuredContent: metadata };
}

export async function downloadPdf(env: Env, owner: string, id: string): Promise<Response> {
  // Later design edits must never silently replace the revision that was exported.
  const row = await env.DB.prepare(`SELECT r.*, p.options FROM mcp_pdf_exports p JOIN mcp_revisions r
    ON r.user_id=p.user_id AND r.design_id=p.design_id AND r.revision=p.revision AND r.status='done'
    WHERE p.id=? AND p.user_id=?`).bind(id, owner).first<NonNullable<Awaited<ReturnType<typeof latestDesign>>> & { options: string }>();
  if (!row) return json(404, { error: 'pdf-not-found' });
  const { bytes, fileName } = await render(env, openedDesign(row), JSON.parse(row.options) as PdfOptions);
  const encoded = encodeURIComponent(fileName).replace(/['()*]/g, c => '%' + c.charCodeAt(0).toString(16));
  return new Response(new Blob([bytes as BlobPart]), { headers: {
    'Content-Type': 'application/pdf', 'Content-Disposition': "attachment; filename=\"proposal.pdf\"; filename*=UTF-8''" + encoded,
    'Cache-Control': 'private, no-store',
  } });
}
