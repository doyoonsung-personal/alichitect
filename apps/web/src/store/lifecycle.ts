// Lifecycle notes (spec 7.12): "Tongyi Lingma is now Qoder." The validator's warnings carry English messages and node
// ids; this turns the ones that matter to a reader into data the console words from strings.json. Pure.
import type { Catalog, Warning } from '@ali/core/types.ts';
import { normalizeKey } from '@ali/core/catalog.ts';
import { RENAMES } from '@ali/core/prompt.ts';
import type { LifecycleNote } from './types.ts';
import { nameOf } from './changes.ts';

/** Former names the prompt knows are real renames (not just alternate spellings). */
const RENAMED_FROM: ReadonlySet<string> = new Set(RENAMES.flatMap(([olds]) => olds.split(',').map((s) => normalizeKey(s.trim()))));

const quoted = (msg: string): string | null => /^'([^']+)'/.exec(msg)?.[1] ?? null;

function shortOf(catalog: Catalog, idOrName: string): string {
  const e = catalog.byId.get(idOrName);
  return e ? e.short : idOrName;
}

/**
 * The note for one warning, or null when it needs none (a spelling variant, a legacy product that stays, an
 * announced product). Names come from the catalog, never from the model's spelling, except the old name in a rename.
 */
export function lifecycleNote(w: Warning, catalog: Catalog): LifecycleNote | null {
  if (w.code === 'alias-resolved') {
    // "'Tongyi Lingma' resolved to 'qoder'"
    const m = /^'(.+)' resolved to '([^']+)'/.exec(w.msg);
    if (!m) return null;
    const [, old, id] = m;
    const e = catalog.byId.get(id);
    if (!e) return null;
    if (!RENAMED_FROM.has(normalizeKey(old))) return null;
    if (normalizeKey(old) === normalizeKey(e.short) || normalizeKey(old) === normalizeKey(e.name)) return null;
    return { key: `renamed:${normalizeKey(old)}`, kind: 'renamed', old, new: e.short };
  }
  if (w.code === 'retired-product') {
    // "'sls-classic' is retired: ... Using sls (Simple Log Service)." or "'x' is retired; using its successor 'sls'"
    const using = /Using ([a-z0-9-]+) \(/.exec(w.msg)?.[1] ?? /successor '([^']+)'/.exec(w.msg)?.[1];
    if (!using || !w.repaired) return null;
    const old = quoted(w.msg);
    if (!old) return null;
    return { key: `retired:${normalizeKey(old)}`, kind: 'retired', old: shortOf(catalog, old), new: shortOf(catalog, using) };
  }
  if (w.code === 'china-only' && w.severity !== 'info') {
    const id = quoted(w.msg);
    return id ? { key: `chinaOnly:${id}`, kind: 'chinaOnly', product: shortOf(catalog, id) } : null;
  }
  if (w.code === 'restricted' && w.severity !== 'info') {
    const id = quoted(w.msg);
    return id ? { key: `restricted:${id}`, kind: 'restricted', product: shortOf(catalog, id) } : null;
  }
  return null;
}

/** Adds a note unless the same one is already there (one line per product per revision). */
export function addLifecycle(notes: LifecycleNote[], note: LifecycleNote | null): LifecycleNote[] {
  if (!note || notes.some((n) => n.key === note.key)) return notes;
  return [...notes, note];
}

export { nameOf };
