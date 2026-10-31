// Server configuration from the environment. The model key is read separately in main.ts and never stored here, so
// a config object can be logged or returned from /api/health without leaking it.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_BASE_URL, DEFAULT_MODEL, FALLBACK_MODEL } from '../../../packages/core/src/llm.ts';

export const SERVER_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export interface ServerConfig {
  /** Always a loopback address: the server is for the person running it and their own browser. */
  host: '127.0.0.1';
  port: number;
  /** Exact Origin values allowed to call the API (scheme://host:port, lowercase). A request without Origin is a local non-browser client and is allowed. */
  allowedOrigins: string[];
  /** Host header values accepted (defeats DNS rebinding): 127.0.0.1, localhost and [::1] with the server port. */
  allowedHosts: string[];
  maxBodyBytes: number;
  /** Turns running at once across all sessions. */
  maxInFlight: number;
  /** Hard stop for one request, main turn, follow-up and summary included. */
  turnDeadlineMs: number;
  model: string;
  fallbackModel: string | null;
  baseUrl: string;
  /** Metadata-only turn log (JSON lines); null disables it. */
  logFile: string | null;
  /** LOG_CONTENT=1 also logs the ask and the say lines. Off by default. */
  logContent: boolean;
}

export const DEFAULT_ORIGINS = ['http://localhost:5174', 'http://127.0.0.1:5174'];

export function hostsFor(port: number): string[] {
  return [`127.0.0.1:${port}`, `localhost:${port}`, `[::1]:${port}`];
}

function int(v: string | undefined, name: string, def: number, min: number, max: number): number {
  if (v === undefined || v === '') return def;
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw new Error(`${name} must be an integer from ${min} to ${max}`);
  return n;
}

/** Parses ALLOWED_ORIGINS: comma-separated origins; each must be a bare http(s) origin. */
export function parseOrigins(v: string | undefined): string[] {
  if (v === undefined || !v.trim()) return [...DEFAULT_ORIGINS];
  const out: string[] = [];
  for (const raw of v.split(',')) {
    const s = raw.trim();
    if (!s) continue;
    let u: URL;
    try {
      u = new URL(s);
    } catch {
      throw new Error(`ALLOWED_ORIGINS: '${s}' is not a URL`);
    }
    if ((u.protocol !== 'http:' && u.protocol !== 'https:') || u.origin.toLowerCase() !== s.toLowerCase().replace(/\/$/, '')) throw new Error(`ALLOWED_ORIGINS: '${s}' must be a bare http(s) origin such as http://localhost:5174`);
    out.push(u.origin.toLowerCase());
  }
  return out;
}

export function configFromEnv(env: Record<string, string | undefined>): ServerConfig {
  const port = int(env.PORT, 'PORT', 8787, 1, 65535);
  // QWEN_BASE_URL, as in tools/qwen/ask.ts. DASHSCOPE_BASE_URL is deliberately not read: on this machine it holds a
  // workspace endpoint root for another tool, which is not the OpenAI-compatible path.
  const baseUrl = env.QWEN_BASE_URL?.trim() || DEFAULT_BASE_URL;
  if (!/^https:\/\//.test(baseUrl)) throw new Error('QWEN_BASE_URL must be an https URL');
  const fallback = env.QWEN_FALLBACK_MODEL;
  return {
    host: '127.0.0.1',
    port,
    allowedOrigins: parseOrigins(env.ALLOWED_ORIGINS),
    allowedHosts: hostsFor(port),
    maxBodyBytes: 512 * 1024,
    maxInFlight: int(env.MAX_IN_FLIGHT, 'MAX_IN_FLIGHT', 4, 1, 64),
    turnDeadlineMs: int(env.TURN_DEADLINE_MS, 'TURN_DEADLINE_MS', 240_000, 10_000, 900_000),
    model: env.QWEN_MODEL?.trim() || DEFAULT_MODEL,
    fallbackModel: fallback === undefined ? FALLBACK_MODEL : fallback.trim() === '' || fallback.trim() === 'none' ? null : fallback.trim(),
    baseUrl,
    logFile: env.TURN_LOG === '0' ? null : env.TURN_LOG?.trim() || path.join(SERVER_DIR, 'logs', 'turns.jsonl'),
    logContent: env.LOG_CONTENT === '1',
  };
}
