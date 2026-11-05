import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMemory } from '../../../packages/core/src/prompt.ts';
import { sha256Hex } from '../src/crypto.ts';
import { exportPdf } from '../src/mcp-pdf.ts';
import { makeEnv, signIn } from './helpers.ts';

test('readable report version queues a new writer pass instead of reusing an old dense report', async () => {
  const env = makeEnv();
  const { user } = await signIn(env, 'readable-cache@example.org', { status: 'approved' });
  const designId = crypto.randomUUID();
  const options = { lang: 'en' as const, audience: 'client' as const };
  const oldId = await sha256Hex(JSON.stringify(['audience-proposal-v2', user.id, designId, 1, options]));
  await env.DB.prepare("INSERT INTO mcp_revisions(user_id,request_id,fingerprint,design_id,revision,status,snapshot,created_at) VALUES (?,?,?,?,1,'done',?,?)")
    .bind(user.id, 'cache-readability', '', designId,
      JSON.stringify({ title: 'Readable proposal', mode: 'cloud', memory: createMemory(), summary: '' }), Date.now()).run();
  await env.DB.prepare('INSERT INTO mcp_pdf_exports(id,user_id,design_id,revision,options,writing_since) VALUES (?,?,?,?,?,NULL)')
    .bind(oldId, user.id, designId, 1, JSON.stringify(options)).run();
  const result = await exportPdf(env, user, designId, 1, options, false, false);
  const value = result.structuredContent!;
  assert.equal(value.status, 'preparing');
  assert.ok(!String(value.url).includes(oldId));
  assert.equal((await env.DB.prepare('SELECT count(*) AS n FROM mcp_pdf_exports').first<{ n: number }>())!.n, 2);
  assert.equal((await env.DB.prepare('SELECT writing_since FROM mcp_pdf_exports WHERE id=?').bind(oldId).first<{ writing_since: number | null }>())!.writing_since, null,
    'the old download stays available');
});
