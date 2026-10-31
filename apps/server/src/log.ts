// Metadata-only turn log: one JSON line per request in apps/server/logs/turns.jsonl. Timings, models, tokens, cost and
// warning codes; never the key, never provider error messages, and never the ask or the reply unless LOG_CONTENT=1.
// Every line passes through the redactor. A logging failure never affects a turn.
import { createHash } from 'node:crypto';
import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

export type Redactor = (s: string) => string;

/** Replaces every occurrence of the secret (and of any other given secrets) with [redacted]. Short or empty secrets are ignored. */
export function makeRedactor(...secrets: Array<string | undefined>): Redactor {
  const list = secrets.filter((s): s is string => typeof s === 'string' && s.length >= 8);
  if (!list.length) return (s) => s;
  return (s) => {
    let out = s;
    for (const k of list) if (out.includes(k)) out = out.split(k).join('[redacted]');
    return out;
  };
}

/** Short, stable, non-reversible session tag for correlating log lines. */
export function sessionTag(sessionId: string): string {
  return createHash('sha256').update(sessionId).digest('hex').slice(0, 12);
}

export interface TurnLog {
  write(entry: Record<string, unknown>): void;
  /** Resolves when every line written so far is on disk (tests and shutdown). */
  flush(): Promise<void>;
}

export function createTurnLog(file: string | null, redact: Redactor): TurnLog {
  let chain: Promise<void> = Promise.resolve();
  let dirReady: Promise<unknown> | null = null;
  return {
    write(entry) {
      if (!file) return;
      let line: string;
      try {
        line = redact(JSON.stringify(entry)) + '\n';
      } catch {
        return;
      }
      dirReady ??= mkdir(path.dirname(file), { recursive: true }).catch(() => undefined);
      const ready = dirReady;
      chain = chain.then(() => ready).then(() => appendFile(file, line, 'utf8')).catch(() => undefined);
    },
    flush: () => chain,
  };
}
