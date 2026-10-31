// Metadata-only turn log: one JSON line per request in apps/server/logs/turns.jsonl. Timings, models, tokens, cost and
// warning codes; never the key, never provider error messages, and never the ask or the reply unless LOG_CONTENT=1.
// Every line passes through the redactor. A logging failure never affects a turn.
import { createHash } from 'node:crypto';
import { appendFile, mkdir, rename, stat } from 'node:fs/promises';
import path from 'node:path';

export type Redactor = (s: string) => string;

/** The shortest start of a secret that is redacted on its own (an error message cut at a length limit keeps only a start). */
const PREFIX_MIN = 6;

/**
 * Replaces every occurrence of the secret (and of any other given secrets) with [redacted]. Short or empty secrets are
 * ignored. Also redacted: a start of a secret of at least six characters (the provider's error text is cut to 300
 * characters before it reaches the redactor, so a key echoed across the cut would otherwise leak its first characters),
 * and any "sk-" token of eight or more characters (a masked or different key in a provider error).
 */
export function makeRedactor(...secrets: Array<string | undefined>): Redactor {
  const list = secrets.filter((s): s is string => typeof s === 'string' && s.length >= 8);
  if (!list.length) return (s) => s;
  const MARK = '[redacted]';
  return (s) => {
    let out = s;
    for (const k of list) {
      if (out.includes(k)) out = out.split(k).join(MARK);
      const head = k.slice(0, PREFIX_MIN);
      for (let at = out.indexOf(head); at >= 0; at = out.indexOf(head, at + MARK.length)) {
        let n = PREFIX_MIN;
        while (n < k.length && out[at + n] === k[n]) n++;
        out = out.slice(0, at) + MARK + out.slice(at + n);
      }
    }
    return out.replace(/\bsk-[A-Za-z0-9_-]{8,}/g, MARK);
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

/** The log is moved to `<file>.1` (replacing the older copy) once it passes this size, so a local loop of bad requests cannot grow it without limit. */
export const MAX_LOG_BYTES = 5_000_000;

export function createTurnLog(file: string | null, redact: Redactor, maxBytes = MAX_LOG_BYTES): TurnLog {
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
      chain = chain
        .then(() => ready)
        .then(async () => {
          const size = await stat(file).then((x) => x.size, () => 0);
          if (size >= maxBytes) await rename(file, file + '.1');
          await appendFile(file, line, 'utf8');
        })
        .catch(() => undefined);
    },
    flush: () => chain,
  };
}
