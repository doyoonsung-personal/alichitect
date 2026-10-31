// Incremental NDJSON line parser for streamed model content (op grammar v2).
// Chunk-agnostic: an object is emitted only when its line completes, so every split of the same text gives the
// same ops in the same order. Tolerates blank lines, code fences, prose around the JSON on the same line
// (brace extraction), several objects on one line, CRLF, a BOM, bracket-only lines from an array wrapper and
// pretty-printed objects that span lines. Browser-safe: no Node APIs.

export interface LineParserHandlers {
  /** One parsed JSON object. `line` is the source line, or the joined lines of a multi-line object. */
  onOp(raw: unknown, line: string): void;
  /** A non-empty line that yielded no parseable object, or held a malformed one. */
  onBad?(line: string): void;
}

export interface LineParser {
  /** Feed the next content delta; any string split is fine. */
  push(delta: string): void;
  /** Flush the last line (it may lack a trailing newline) and reset the parser. */
  end(): void;
  /** Decoded text of the say op on the line in progress, for live typing; null when that line is not a say. */
  partialSay(): string | null;
}

/** A multi-line object is abandoned (reported as bad) beyond these sizes. */
const MAX_CARRY_CHARS = 8000;
const MAX_CARRY_LINES = 40;

interface Scan {
  objs: unknown[];
  failed: boolean; // a balanced {...} candidate did not parse
  openStart: number; // index of an object still open at the end of the text, or -1
  depth: number; // brace depth at the end of the text
  inString: boolean; // the text ends inside a JSON string
}

function parseObject(s: string): unknown {
  try {
    const v: unknown = JSON.parse(s);
    return v !== null && typeof v === 'object' && !Array.isArray(v) ? v : undefined;
  } catch {
    return undefined;
  }
}

/** Finds top-level {...} spans, honouring JSON strings and escapes inside them, and parses each one. */
function scanObjects(text: string): Scan {
  const objs: unknown[] = [];
  let failed = false;
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (inString) {
      if (escaped) escaped = false;
      else if (c === 92) escaped = true; // backslash
      else if (c === 34) inString = false; // quote
      continue;
    }
    if (c === 123) {
      // {
      if (depth === 0) start = i;
      depth++;
    } else if (c === 125) {
      // }
      if (depth > 0) {
        depth--;
        if (depth === 0) {
          const v = parseObject(text.slice(start, i + 1));
          if (v === undefined) failed = true;
          else objs.push(v);
          start = -1;
        }
      }
    } else if (c === 34 && depth > 0) {
      inString = true; // quotes in prose outside an object are ignored
    }
  }
  return { objs, failed, openStart: depth > 0 ? start : -1, depth, inString };
}

const SKIP_LINE = /^[[\],\s]*$/; // blank, or only the brackets and commas of an array wrapper
const SAY_OPEN = /\{\s*"(?:t|type)"\s*:\s*"say"\s*,\s*"text"\s*:\s*"/g;
const ESCAPES: Record<string, string> = { '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t' };

/** Decodes a JSON string body from `from` up to its closing quote or the end of the text. Incomplete escapes are dropped. */
function decodePartialString(s: string, from: number): string {
  let out = '';
  for (let i = from; i < s.length; i++) {
    const c = s[i];
    if (c === '"') break;
    if (c !== '\\') {
      out += c;
      continue;
    }
    if (i + 1 >= s.length) break; // escape not complete yet
    const n = s[i + 1];
    if (n !== 'u') {
      out += ESCAPES[n] ?? n;
      i++;
      continue;
    }
    const hex = s.slice(i + 2, i + 6);
    if (!/^[0-9a-fA-F]{4}$/.test(hex)) break; // \uXXXX not complete (or malformed)
    const code = parseInt(hex, 16);
    if (code >= 0xd800 && code <= 0xdbff) {
      // high surrogate: emit only with its low half, so the partial text stays a prefix of the final text
      const low = s.slice(i + 6, i + 12);
      if (!/^\\u[dD][c-fC-F][0-9a-fA-F]{2}$/.test(low)) break;
      out += String.fromCharCode(code, parseInt(low.slice(2), 16));
      i += 11;
      continue;
    }
    out += String.fromCharCode(code);
    i += 5;
  }
  const last = out.charCodeAt(out.length - 1);
  return last >= 0xd800 && last <= 0xdbff ? out.slice(0, -1) : out; // a raw pair split across deltas
}

export function createLineParser(handlers: LineParserHandlers): LineParser {
  let buf = ''; // text after the last newline
  let carry: string | null = null; // an object that is still open across lines
  let carryLines = 0;
  let firstLine = true;

  const bad = (line: string): void => {
    if (handlers.onBad) handlers.onBad(line);
  };

  const emit = (s: Scan, line: string): void => {
    for (const o of s.objs) handlers.onOp(o, line);
    if (s.failed || s.objs.length === 0) bad(line);
  };

  // Gives up on an open multi-line object. If every string is closed, appending the missing braces is tried once.
  const flushCarry = (): void => {
    if (carry === null) return;
    const text = carry;
    carry = null;
    carryLines = 0;
    const s = scanObjects(text);
    if (!s.inString && s.depth > 0 && s.depth <= 3) {
      const fixed = scanObjects(text + '}'.repeat(s.depth));
      if (fixed.objs.length && !fixed.failed && fixed.openStart < 0) {
        emit(fixed, text);
        return;
      }
    }
    bad(text);
  };

  const handleLine = (rawLine: string): void => {
    let line = rawLine.charCodeAt(rawLine.length - 1) === 13 ? rawLine.slice(0, -1) : rawLine;
    if (firstLine) {
      firstLine = false;
      if (line.charCodeAt(0) === 0xfeff) line = line.slice(1);
    }
    const t = line.trim();
    if (carry !== null) {
      if (t.startsWith('{') || t.startsWith('```')) {
        flushCarry(); // a new object (or a fence) starts: the open one was truncated
      } else {
        carry += '\n' + line;
        carryLines++;
        const s = scanObjects(carry);
        if (s.openStart < 0) {
          const text = carry;
          carry = null;
          carryLines = 0;
          emit(s, text);
        } else if (carry.length > MAX_CARRY_CHARS || carryLines > MAX_CARRY_LINES) {
          flushCarry();
        }
        return;
      }
    }
    if (SKIP_LINE.test(t) || t.startsWith('```')) return;
    const s = scanObjects(t);
    if (s.openStart >= 0) {
      for (const o of s.objs) handlers.onOp(o, t);
      if (s.failed) bad(t);
      carry = t.slice(s.openStart);
      carryLines = 1;
      return;
    }
    emit(s, t);
  };

  return {
    push(delta: string): void {
      if (typeof delta !== 'string' || delta.length === 0) return;
      buf += delta;
      let start = 0;
      let i: number;
      while ((i = buf.indexOf('\n', start)) >= 0) {
        handleLine(buf.slice(start, i));
        start = i + 1;
      }
      if (start > 0) buf = buf.slice(start);
    },
    end(): void {
      if (buf.length) {
        const last = buf;
        buf = '';
        handleLine(last);
      }
      flushCarry();
      buf = '';
      carry = null;
      carryLines = 0;
      firstLine = true;
    },
    partialSay(): string | null {
      const text = carry !== null ? carry + '\n' + buf : buf;
      if (!text) return null;
      SAY_OPEN.lastIndex = 0;
      let m: RegExpExecArray | null;
      let at = -1;
      while ((m = SAY_OPEN.exec(text)) !== null) at = m.index + m[0].length;
      return at < 0 ? null : decodePartialString(text, at);
    },
  };
}
