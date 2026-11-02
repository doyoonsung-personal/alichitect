// Saved sessions in localStorage under "ab.sessions.v1". Every read and write is wrapped, because storage can be
// missing (private window, blocked site data), full (quota), or hold something that is not ours (corruption, an older
// shape). The app works without it; a failed save is reported to the caller, never thrown.
import type { SessionMemory } from '@ali/core/types.ts';
import type { Revision, SessionRecord, SessionSummary } from './types.ts';

export const STORAGE_KEY = 'ab.sessions.v1';
/** Newest sessions kept. */
export const MAX_SESSIONS = 20;

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function validMemory(m: unknown): m is SessionMemory {
  if (!isObj(m) || !Array.isArray(m.turns) || !Array.isArray(m.requirements) || !Array.isArray(m.tombstones)) return false;
  const wf = m.workflow;
  if (wf !== undefined && (!isObj(wf) || !isObj(wf.nodes) || !isObj(wf.edges) || !isObj(wf.groups))) return false;
  if (m.workflowTombstones !== undefined && !Array.isArray(m.workflowTombstones)) return false;
  if (m.workflowSettings !== undefined && !isObj(m.workflowSettings)) return false;
  if (m.estimate !== undefined && !isObj(m.estimate)) return false;
  const g = m.graph;
  return isObj(g) && isObj(g.groups) && isObj(g.nodes) && isObj(g.edges) && Array.isArray(g.recs);
}

function validRevision(r: unknown): r is Revision {
  return isObj(r) && typeof r.n === 'number' && typeof r.ask === 'string' && typeof r.status === 'string' && Array.isArray(r.changes) && isObj(r.fix) && Array.isArray(r.cards);
}

/** A stored record, repaired to the current shape, or null when it cannot be used. */
export function reviveSession(v: unknown): SessionRecord | null {
  if (!isObj(v) || typeof v.id !== 'string' || !v.id || typeof v.title !== 'string') return null;
  if (!validMemory(v.memory) || !Array.isArray(v.revisions)) return null;
  // a revision that was streaming when the tab closed never finished: it is a failed one, with no changes
  const revisions: Revision[] = [];
  for (const r of v.revisions) {
    if (!validRevision(r)) return null;
    revisions.push(r.status === 'waiting' || r.status === 'streaming' ? { ...r, status: 'stopped', changes: [], statusLine: null } : r);
  }
  return {
    id: v.id,
    mode: v.mode === 'workflow' ? 'workflow' : 'cloud',
    ...(isObj(v.workflowProvenance) ? { workflowProvenance: v.workflowProvenance as SessionRecord['provenance'] } : {}),
    createdAt: typeof v.createdAt === 'number' ? v.createdAt : 0,
    updatedAt: typeof v.updatedAt === 'number' ? v.updatedAt : 0,
    title: v.title,
    memory: v.memory,
    revisions,
    reqPinnedIn: isObj(v.reqPinnedIn) ? (v.reqPinnedIn as Record<string, number>) : {},
    provenance: isObj(v.provenance) ? (v.provenance as SessionRecord['provenance']) : {},
    summarizedThrough: typeof v.summarizedThrough === 'number' ? v.summarizedThrough : 0,
    summarizing: false,
    replayOf: null,
  };
}

/** Parses the stored text; unusable records are dropped, the rest kept. Never throws. */
export function parseStored(text: string | null): SessionRecord[] {
  if (!text) return [];
  try {
    const v: unknown = JSON.parse(text);
    if (!isObj(v) || !Array.isArray(v.sessions)) return [];
    const out: SessionRecord[] = [];
    for (const s of v.sessions) {
      const r = reviveSession(s);
      if (r) out.push(r);
    }
    return out;
  } catch {
    return [];
  }
}

export function summaryOf(s: SessionRecord): SessionSummary {
  return { id: s.id, title: s.title, updatedAt: s.updatedAt, revisions: s.revisions.length };
}

function browserStorage(): KeyValueStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export interface SessionStore {
  list(): SessionSummary[];
  get(id: string): SessionRecord | null;
  /** Saves (or replaces) a session. Resolves false when nothing could be stored. Replay sessions are never saved. */
  save(s: SessionRecord): boolean;
  remove(id: string): void;
}

/**
 * The session list over a storage. On a quota error it drops the oldest sessions one at a time and retries, down to
 * the session being saved alone, so a full storage costs history, not the session you are in.
 */
export function createSessionStore(storage: KeyValueStorage | null = browserStorage()): SessionStore {
  const read = (): SessionRecord[] => {
    try {
      return parseStored(storage ? storage.getItem(STORAGE_KEY) : null);
    } catch {
      return [];
    }
  };
  const write = (sessions: SessionRecord[]): boolean => {
    if (!storage) return false;
    let list = sessions;
    for (;;) {
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, sessions: list }));
        return true;
      } catch {
        if (list.length <= 1) return false;
        list = list.slice(0, -1); // the list is newest first
      }
    }
  };
  return {
    list: () => read().map(summaryOf),
    get: (id) => read().find((s) => s.id === id) ?? null,
    save(s) {
      if (s.replayOf || !s.revisions.length) return false;
      const rest = read().filter((x) => x.id !== s.id);
      return write([s, ...rest].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_SESSIONS));
    },
    remove(id) {
      write(read().filter((x) => x.id !== id));
    },
  };
}
