// What travels on POST /api/turn: every llm.ts TurnEvent with its phase, plus the server's own events.
import type { ServerEvent, Warning } from '@ali/core/types.ts';
import type { TurnEvent } from '@ali/core/llm.ts';

export type Phase = 'main' | 'repair';
export type WireEvent = (TurnEvent & { phase: Phase }) | ServerEvent;
export type WireType = WireEvent['type'];
export type StatusCode = Extract<ServerEvent, { type: 'status' }>['code'];

const TYPES: ReadonlySet<string> = new Set(['say', 'op', 'warn', 'usage', 'done', 'error', 'status', 'commit', 'summary', 'fatal']);
const PHASED: ReadonlySet<string> = new Set(['say', 'op', 'warn', 'usage', 'done', 'error']);

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Parses one NDJSON line into a WireEvent. Returns null for a line that is not JSON or has no known `type`, so a
 * future server event never breaks the stream. Fields are not deeply validated: the server already validated them.
 * A turn event without a phase is a main-phase event.
 */
export function parseWireEvent(line: string): WireEvent | null {
  let v: unknown;
  try {
    v = JSON.parse(line);
  } catch {
    return null;
  }
  if (!isObj(v) || typeof v.type !== 'string' || !TYPES.has(v.type)) return null;
  if (v.type === 'op' && !isObj(v.op)) return null;
  if (v.type === 'say' && typeof v.text !== 'string') return null;
  if (v.type === 'commit' && !isObj(v.memory)) return null;
  if (v.type === 'fatal' && typeof v.code !== 'string') return null;
  if (PHASED.has(v.type) && v.phase !== 'repair') v.phase = 'main';
  return v as unknown as WireEvent;
}

/** The shape of GET /api/health (apps/server/src/server.ts). */
export interface Health {
  ok: boolean;
  model: string;
  fallbackModel?: string | null;
  endpoint: string;
  catalog: { version: string; entries: number };
  keyConfigured: boolean;
  inFlight: number;
  maxInFlight: number;
  limits: { askChars: number; turns: number; nodes: number; requirements: number; bodyBytes: number };
  uptimeS: number;
}

export function isHealth(v: unknown): v is Health {
  if (!isObj(v) || v.ok !== true) return false;
  const c = v.catalog;
  const l = v.limits;
  return isObj(c) && typeof c.version === 'string' && isObj(l) && typeof l.askChars === 'number' && typeof v.keyConfigured === 'boolean';
}

/** Warnings that tell the user a product was renamed, retired or not sold internationally. */
export const LIFECYCLE_CODES: ReadonlySet<Warning['code']> = new Set<Warning['code']>(['alias-resolved', 'retired-product', 'china-only', 'restricted']);
export const CONSTRAINT_CODES: ReadonlySet<Warning['code']> = new Set<Warning['code']>(['constraint-region', 'constraint-avoid']);
