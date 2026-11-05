import { createMemory } from '../../../packages/core/src/prompt.ts';
import { compactSessionTitle, needsSessionTitle, SESSION_TITLE_VERSION } from '../../../packages/core/src/session-title.ts';
import type { ServerEvent, SessionMemory, TurnMode } from '../../../packages/core/src/types.ts';
import type { PricingSession } from '../../../packages/core/src/solution-pricing.ts';
import { pricingDesignKey } from '../../../packages/core/src/solution-pricing.ts';
import { langOf } from '../../server/src/messages.ts';
import { sha256Hex } from './crypto.ts';
import type { UserRow } from './db.ts';
import type { D1Database, Env, ExecutionContextLike } from './env.ts';
import { handlePricing } from './pricing.ts';
import { handleTurn } from './turn.ts';
import { cachedSessionTitle } from './session-title.ts';

interface Snapshot {
  title: string; titleVersion?: number; mode: TurnMode; memory: SessionMemory; summary: string; pricing?: PricingSession;
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
/** Upgrade a legacy MCP snapshot on first read, retaining its revision, history and original activity time. */
export async function refreshDesignTitle(env: Env, owner: string, row: Receipt) {
  const snapshot = JSON.parse(row.snapshot!) as Snapshot;
  const brief = snapshot.memory.turns.find(turn => turn.role === 'user')?.text || '';
  if (!needsSessionTitle(snapshot.title, brief, snapshot.titleVersion)) return row;
  try {
    const title = await cachedSessionTitle(env, owner, Array.from(brief).slice(0, 6000).join(''));
    const next = JSON.stringify({ ...snapshot, ...title });
    const changed = await env.DB.prepare(`UPDATE mcp_revisions SET snapshot=?
      WHERE user_id=? AND design_id=? AND revision=? AND snapshot=?`).bind(next, owner, row.design_id, row.revision, row.snapshot).run();
    return changed.meta.changes === 1 ? { ...row, snapshot: next } : row;
  } catch { return row; } // Optional naming must never make an existing design unreadable.
}
export function openedDesign(row: Receipt) {
  const snapshot = JSON.parse(row.snapshot!) as Snapshot;
  // Older snapshots stored the graph diff as their summary even when the model narrated the design.
  const last = snapshot.memory.turns.at(-1);
  const summary = (last?.role === 'assistant' && last.text.trim()) || snapshot.summary;
  return { ...snapshot, summary, designId: row.design_id, revision: row.revision, updatedAt: row.created_at };
}

/** Most clients choose a mode from the tool schema. Preserve the cloud default for ambiguous new briefs. */
function initialMode(brief: string): TurnMode {
  if (/\b(?:cloud architecture|network topology|infrastructure diagram)\b|클라우드\s*(?:아키텍처|구성도)|네트워크\s*구성도|云架构|网络拓扑/i.test(brief)) return 'cloud';
  if (/\bworkflows?\b|워크플로|工作流/i.test(brief)) return 'workflow';
  const approval = /\bapprov(?:al|e|ed)\b|승인|审批|批准/i.test(brief);
  const businessStep = /\b(?:triage|classif\w*|tickets?|inventory|procurement|purchas\w*)\b|분류|티켓|재고|구매|分类|工单|库存|采购/i.test(brief);
  return approval && businessStep ? 'workflow' : 'cloud';
}

function pricingLanguage(ask: string, snapshot: Snapshot, user: UserRow) {
  const current = langOf(ask);
  if (current !== 'en') return current;
  // Keep a number-only answer in the language of the question that prompted it.
  const previous = snapshot.pricing?.messages.at(-1)?.text || snapshot.memory.turns.at(-1)?.text || snapshot.title;
  if (!/\p{L}/u.test(ask)) return langOf(previous);
  if (user.lang === 'ko' || user.lang === 'zh' || user.lang === 'en') return user.lang;
  return langOf(previous);
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
  return answer(await refreshDesignTitle(env, user.id, row), env.ALLOWED_ORIGIN);
}

async function applyTurn(response: Response, snapshot: Snapshot): Promise<Snapshot> {
  // Drain through the optional post-commit summary; only a validated commit can become a saved design.
  const lines = (await response.text()).trim().split('\n');
  let result: Snapshot | undefined;
  let designSummary = '';
  for (const line of lines) {
    const event = JSON.parse(line) as ServerEvent | { type: 'done'; summary: string; phase: string };
    if (event.type === 'fatal') throw new DesignError(event.code + ': ' + event.message);
    if (event.type === 'done' && event.phase === 'main' && event.summary?.trim()) designSummary = event.summary.trim();
    if (event.type === 'commit') result = { ...snapshot, memory: event.memory,
      ...(event.title ? { title: compactSessionTitle(event.title), titleVersion: SESSION_TITLE_VERSION } : {}), summary: designSummary || event.changes || snapshot.title };
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
      memory: createMemory(), title: compactSessionTitle(args.ask),
      mode: args.mode ?? initialMode(args.ask), summary: ''
    };
    // The internal request has no user-supplied headers or credential. The normal handlers enforce admission,
    // account quota, concurrency, redaction and usage accounting for the already authenticated owner.
    const request = (path: string, body: object) => new Request(env.ALLOWED_ORIGIN + path,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (tool === 'design_solution') {
      snapshot.mode = args.mode ?? snapshot.mode;
      snapshot = await applyTurn(await runners.turn(request('/api/turn', {
        sessionId: designId, memory: snapshot.memory,
        ask: args.ask, mode: snapshot.mode, ...(!prior ? { generateTitle: true } : {})
      }), env, ctx, user), snapshot);
    } else {
      const resp = await runners.price(request('/api/pricing', {
        sessionId: designId, memory: snapshot.memory, ask: args.ask,
        pricing: snapshot.pricing, lang: args.lang ?? pricingLanguage(args.ask, snapshot, user)
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
