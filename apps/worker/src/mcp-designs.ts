import { createMemory } from '../../../packages/core/src/prompt.ts';
import type { ServerEvent, SessionMemory, TurnMode } from '../../../packages/core/src/types.ts';
import type { PricingSession } from '../../../packages/core/src/solution-pricing.ts';
import { pricingDesignKey } from '../../../packages/core/src/solution-pricing.ts';
import { sha256Hex } from './crypto.ts';
import type { UserRow } from './db.ts';
import type { D1Database, Env, ExecutionContextLike } from './env.ts';
import { handlePricing } from './pricing.ts';
import { handleTurn } from './turn.ts';

interface Snapshot {
  title: string; mode: TurnMode; memory: SessionMemory; summary: string; pricing?: PricingSession;
}
interface Receipt {
  design_id: string; revision: number; status: 'working' | 'failed' | 'done'; snapshot: string | null;
  fingerprint: string; error: string | null; created_at: number;
}
export interface Inputs {
  ask: string; requestId: string; designId?: string; revision?: number; mode?: TurnMode; lang?: 'en' | 'ko' | 'zh';
}
type Tool = 'design_solution' | 'estimate_solution';
export class DesignError extends Error { }

/** Read access always includes the owner in the predicate, including for administrators. */
export async function latestDesign(db: D1Database, owner: string, id: string) {
  return db.prepare("SELECT * FROM mcp_revisions WHERE user_id=? AND design_id=? AND status='done' ORDER BY revision DESC LIMIT 1")
    .bind(owner, id).first<Receipt>();
}
export function openedDesign(row: Receipt) {
  const snapshot = JSON.parse(row.snapshot!) as Snapshot;
  return { ...snapshot, designId: row.design_id, revision: row.revision, updatedAt: row.created_at };
}
function answer(row: Receipt, origin: string) {
  if (row.status !== 'done') throw new DesignError(row.error ?? 'This request is still running. Retry with the same requestId.');
  const d = openedDesign(row);
  return {
    designId: d.designId, revision: d.revision, url: origin + '/?design=' + d.designId, title: d.title,
    summary: d.summary, mode: d.mode, architecture: d.memory.graph, workflow: d.memory.workflow,
    requirements: d.memory.requirements, assumptions: d.memory.assumptions, questions: d.memory.questions,
    estimate: d.pricing?.estimate, pricingReply: d.pricing?.messages.at(-1)?.text,
    estimateOutdated: d.pricing ? d.pricing.designKey !== pricingDesignKey(d.memory) : undefined
  };
}
export async function getDesign(env: Env, user: UserRow, id: string) {
  const row = await latestDesign(env.DB, user.id, id);
  if (!row) throw new DesignError('Design not found for this account.');
  return answer(row, env.ALLOWED_ORIGIN);
}

async function applyTurn(response: Response, snapshot: Snapshot): Promise<Snapshot> {
  // Drain through the optional post-commit summary; only a validated commit can become a saved design.
  const lines = (await response.text()).trim().split('\n');
  let result: Snapshot | undefined;
  for (const line of lines) {
    const event = JSON.parse(line) as ServerEvent;
    if (event.type === 'fatal') throw new DesignError(event.code + ': ' + event.message);
    if (event.type === 'commit') result = { ...snapshot, memory: event.memory, summary: event.changes || event.memory.turns.at(-1)?.text || snapshot.title };
    if (event.type === 'summary' && result) result.memory.summary = event.summary;
  }
  if (!result) throw new DesignError('No committed design was returned.');
  return result;
}
export async function changeDesign(tool: Tool, args: Inputs, env: Env, ctx: ExecutionContextLike, user: UserRow,
  runners = { turn: handleTurn, price: handlePricing }) {
  if (args.designId ? !args.revision : args.revision !== undefined || tool === 'estimate_solution') {
    throw new DesignError('Supply designId and its current revision together for an existing design.');
  }
  const fingerprint = await sha256Hex(JSON.stringify([tool, args.designId, args.revision, args.ask, args.mode, args.lang]));
  const now = Date.now();
  const db = env.DB;
  const receipt = () => db.prepare('SELECT * FROM mcp_revisions WHERE user_id=? AND request_id=?').bind(user.id, args.requestId).first<Receipt>();
  const replay = (row: Receipt) => {
    if (row.fingerprint !== fingerprint) throw new DesignError('requestId already used with different inputs.');
    return answer(row, env.ALLOWED_ORIGIN);
  };
  // A terminated isolate may leave a reservation; never repeat its possibly billable work with the same id.
  await db.prepare("UPDATE mcp_revisions SET status='failed', error='Request interrupted. Check the design before making a new request.' WHERE user_id=? AND status='working' AND created_at<?")
    .bind(user.id, now - 20 * 60000).run();
  const old = await receipt();
  if (old) return replay(old);
  const prior = args.designId ? await latestDesign(db, user.id, args.designId) : null;
  if (args.designId && (!prior || args.revision !== prior.revision)) throw new DesignError('Design not found or revision changed. Use get_design.');
  const designId = prior?.design_id ?? crypto.randomUUID();
  const revision = (prior?.revision ?? 0) + 1;
  const insert = await db.prepare(`INSERT INTO mcp_revisions(user_id,request_id,fingerprint,design_id,revision,status,created_at)
    VALUES (?,?,?,?,?,'working',?) ON CONFLICT DO NOTHING`).bind(user.id, args.requestId, fingerprint, designId, revision, now).run();
  if (insert.meta.changes !== 1) {
    const raced = await receipt();
    if (raced) return replay(raced);
    throw new DesignError('Another revision is in progress or already committed. Use get_design.');
  }
  try {
    let snapshot: Snapshot = prior ? JSON.parse(prior.snapshot!) : {
      memory: createMemory(), title: Array.from(args.ask).slice(0, 120).join(''),
      mode: args.mode ?? 'cloud', summary: ''
    };
    // The internal request has no user-supplied headers or credential. The normal handlers enforce admission,
    // account quota, concurrency, redaction and usage accounting for the already authenticated owner.
    const request = (path: string, body: object) => new Request(env.ALLOWED_ORIGIN + path,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (tool === 'design_solution') {
      snapshot.mode = args.mode ?? snapshot.mode;
      snapshot = await applyTurn(await runners.turn(request('/api/turn', {
        sessionId: designId, memory: snapshot.memory,
        ask: args.ask, mode: snapshot.mode
      }), env, ctx, user), snapshot);
    } else {
      const resp = await runners.price(request('/api/pricing', {
        sessionId: designId, memory: snapshot.memory, ask: args.ask,
        pricing: snapshot.pricing, lang: args.lang ?? (user.lang === 'ko' || user.lang === 'zh' ? user.lang : 'en')
      }), env, ctx, user);
      const result = await resp.json() as { pricing?: PricingSession; code?: string; message?: string };
      if (!resp.ok || !result.pricing) throw new DesignError((result.code ?? 'pricing-error') + ': ' + (result.message ?? 'Estimate unavailable.'));
      snapshot.pricing = result.pricing;
    }
    const updated = await db.prepare("UPDATE mcp_revisions SET status='done',snapshot=? WHERE user_id=? AND request_id=? AND status='working'")
      .bind(JSON.stringify(snapshot), user.id, args.requestId).run();
    if (updated.meta.changes !== 1) throw new DesignError('Request expired before the result could be saved.');
    return answer((await receipt())!, env.ALLOWED_ORIGIN);
  } catch (err) {
    const message = err instanceof DesignError ? err.message : 'Could not finish this request. Check the saved design before retrying.';
    await db.prepare("UPDATE mcp_revisions SET status='failed',error=? WHERE user_id=? AND request_id=? AND status='working'")
      .bind(message, user.id, args.requestId).run();
    throw new DesignError(message);
  }
}
