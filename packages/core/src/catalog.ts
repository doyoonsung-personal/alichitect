// Product catalog: indexing, alias and lifecycle resolution, and compact prompt rows.
// Browser-safe (no Node APIs); catalog-node.ts loads the JSON files for Node scripts.
import type { Catalog, CatalogEntry, GroupKind, Lane, Lifecycle, Resolution, Scope, Warning } from './types.ts';

/** Shape of catalog/products.json and catalog/offerings.json. */
export interface CatalogFile {
  version: string;
  entries: CatalogEntry[];
}

/** Outside-in order used for prompt rows: request path first, then managed bands. */
export const SCOPE_ORDER: readonly Scope[] = ['external', 'global', 'edge', 'vpc', 'vpc-edge', 'region', 'account', 'saas'];

/** Lane order inside a scope (follows the Lane type and the left-to-right lane grid). */
export const LANE_ORDER: readonly Lane[] = [
  'clients', 'onprem', 'thirdparty', 'dns', 'edge', 'ingress', 'compute', 'middleware', 'cache', 'database', 'search', 'filestore',
  'boundary', 'storage', 'ai', 'analytics', 'integration', 'ops', 'security', 'network', 'governance', 'saas',
];

/** Column legend for promptRows(); the prompt builder can print it above the rows. */
export const PROMPT_ROW_FORMAT =
  'id | name | scope | lane | rank | purpose | pairs-with | [flags]. Empty fields are omitted: rank is a number, pairs-with is a comma list of ids, flags are in brackets.';

/** Statuses the model may pick without being redirected. */
const CURRENT: ReadonlySet<Lifecycle> = new Set<Lifecycle>(['ga', 'preview']);
const MAX_SUCCESSOR_HOPS = 5;

/** Lowercase, NFKC, and drop whitespace, punctuation and symbols: 'Log Service (SLS)' -> 'logservicesls'. CJK text is kept. */
export function normalizeKey(s: string): string {
  return s.normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '');
}

/** Rough prompt-size estimate used for budgeting: 4 characters per token (English). */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** True when resolve() returns the entry as is (current, or legacy with no successor to switch to). */
export function isRecommendable(e: CatalogEntry): boolean {
  return CURRENT.has(e.status) || (e.status === 'legacy' && !e.successor);
}

// ---------- placement: the one scope -> container table ----------

/** Where a group of one of these kinds sits in a node's ancestry ('vpc' covers zone and subnet, 'external' covers onprem). */
export type PlaceKind = 'vpc' | 'region' | 'edge' | 'external';

export interface Placement {
  /** The group kind the node is drawn in; null: at the root (global services; the account and saas bands). */
  container: 'external' | 'onprem' | 'edge' | 'region' | 'vpc' | null;
  /** Group kinds the repair moves it into, in order of preference; empty: the root. */
  targets: readonly GroupKind[];
  /** Severity of sitting inside a group of this kind; kinds that are not listed are allowed. */
  inside: Readonly<Partial<Record<PlaceKind, 'error' | 'warn'>>>;
  /** Severity of sitting outside its container while the graph has one; undefined when that is fine. */
  outside?: 'error' | 'warn';
  /** vpc-edge entries are drawn on the VPC boundary. */
  boundary: boolean;
  /** Root band for account (governance) and saas entries. */
  band: 'account' | 'saas' | null;
  /** Why it belongs there, for messages. */
  why: string;
}

const PLACEMENT: Readonly<Record<Scope, Placement>> = {
  external: { container: 'external', targets: ['external', 'onprem'], inside: { vpc: 'error', region: 'error', edge: 'error' }, outside: 'warn', boundary: false, band: null, why: 'it is outside the cloud' },
  global: { container: null, targets: ['edge'], inside: { vpc: 'error', region: 'error' }, boundary: false, band: null, why: 'it is global' },
  edge: { container: 'edge', targets: ['edge'], inside: { vpc: 'error', region: 'error', external: 'warn' }, outside: 'warn', boundary: false, band: null, why: 'it belongs to the edge network' },
  region: { container: 'region', targets: ['region'], inside: { vpc: 'error', edge: 'error', external: 'error' }, outside: 'warn', boundary: false, band: null, why: 'it is a regional managed service' },
  vpc: { container: 'vpc', targets: ['vpc'], inside: { edge: 'error', external: 'error' }, outside: 'error', boundary: false, band: null, why: 'it runs inside a VPC' },
  'vpc-edge': { container: 'vpc', targets: ['vpc'], inside: { edge: 'error', external: 'error' }, outside: 'error', boundary: true, band: null, why: 'it sits on the VPC boundary' },
  account: { container: null, targets: [], inside: { vpc: 'error', region: 'warn', edge: 'warn', external: 'warn' }, boundary: false, band: 'account', why: 'it is account-level governance' },
  saas: { container: null, targets: [], inside: { vpc: 'error', region: 'warn', edge: 'warn' }, boundary: false, band: 'saas', why: "it is used outside the customer's cloud" },
};

/**
 * The container an entry is drawn in, derived from its scope (prompt rule R4, the validator's containment repair and
 * the layout read this one table). On-premises entries (lane onprem) prefer an onprem group; a vpcAttachable regional
 * service may also sit inside a VPC.
 */
export function placementOf(e: Pick<CatalogEntry, 'scope' | 'lane' | 'vpcAttachable'>): Placement {
  const base = PLACEMENT[e.scope] ?? PLACEMENT.region;
  if (e.scope === 'external' && e.lane === 'onprem') return { ...base, container: 'onprem', targets: ['onprem', 'external'] };
  if (e.scope === 'region' && e.vpcAttachable) return { ...base, inside: { edge: 'error', external: 'error' } };
  return base;
}

// ---------- lifecycle and availability: the one checker ----------

/** The entry's own caveat (dates, successor hints) as a parenthetical, when it has one. */
function noteOf(e: CatalogEntry): string {
  const n = typeof e.note === 'string' ? e.note.replace(/\s+/g, ' ').trim() : '';
  if (!n) return '';
  const cps = Array.from(n);
  return ` (${cps.length > 160 ? cps.slice(0, 159).join('').trimEnd() + '…' : n})`;
}

export interface LifecycleCheck {
  /** retired-product: retired (error) or legacy / no-new-purchases (warn), for the entry as it is. */
  status?: Warning;
  /** china-only or restricted (warn), or announced (info). */
  availability?: Warning;
  /** The current entry to recommend instead: the successor, followed through further successors (at most 5 hops). */
  successor?: CatalogEntry;
}

/**
 * Lifecycle and availability findings for one entry, with empty ids (callers add theirs). The single source of these
 * warnings: catalog.resolve() uses it to switch to a successor, validate.resolveProduct() for each op's product, and
 * llm.ts for the products in a final graph.
 */
export function checkLifecycle(e: CatalogEntry, byId: ReadonlyMap<string, CatalogEntry>): LifecycleCheck {
  const out: LifecycleCheck = {};
  let cur = e;
  const seen = new Set<string>([e.id]);
  for (let hop = 0; hop < MAX_SUCCESSOR_HOPS; hop++) {
    if (CURRENT.has(cur.status) || !cur.successor) break;
    const next = byId.get(cur.successor);
    if (!next || seen.has(next.id)) break;
    seen.add(next.id);
    cur = next;
  }
  if (cur !== e) out.successor = cur;
  const succ = out.successor && out.successor.status !== 'retired' ? out.successor : undefined;
  if (e.status === 'retired') {
    out.status = warn('retired-product', succ ? `'${e.id}' is retired; prefer '${succ.id}'${noteOf(e)}` : `'${e.id}' is retired and has no current successor${noteOf(e)}`, 'error', false);
  } else if (e.status === 'legacy' || e.status === 'no-new-purchases') {
    const prefer = e.successor ? `; prefer '${e.successor}'` : e.alternatives && e.alternatives.length ? `; prefer ${e.alternatives.map((a) => `'${a}'`).join(' or ')}` : '';
    out.status = warn('retired-product', `'${e.id}' is ${e.status}${prefer}${noteOf(e)}`, 'warn', false);
  }
  if (e.availability === 'china-only') out.availability = warn('china-only', `'${e.id}' is sold only on the China site${noteOf(e)}`, 'warn', false);
  else if (e.availability === 'restricted') out.availability = warn('restricted', `'${e.id}' is restricted for new international accounts${noteOf(e)}`, 'warn', false);
  else if (e.availability === 'announced') out.availability = warn('restricted', `'${e.id}' is announced but not yet available${noteOf(e)}`, 'info', false);
  return out;
}

/** The warning for a reference that was switched from `from` to its successor `to` (repaired: the successor is used). */
export function successorWarning(from: CatalogEntry, to: CatalogEntry, label = `'${from.id}'`): Warning {
  const why = from.note ? `: ${from.note.replace(/\.?\s*$/, '.')}` : '.';
  return warn('retired-product', `${label} is ${from.status}${why} Using ${to.id} (${to.name}).`, 'warn', true);
}

// ---------- lookup index ----------

/** Lookup tiers: 1 normalized id, 2 explicit names (name, short, aliases), 3 derived (name without a trailing parenthetical). */
type Tier = 1 | 2 | 3;
interface Hit {
  entry: CatalogEntry;
  tier: Tier;
}

function keysOf(e: CatalogEntry): Array<[string, Tier]> {
  const out: Array<[string, Tier]> = [[normalizeKey(e.id), 1]];
  for (const s of [e.name, e.short, ...(e.aliases ?? [])]) if (typeof s === 'string') out.push([normalizeKey(s), 2]);
  const bare = e.name.replace(/\s*\([^()]*\)\s*$/, '');
  if (bare && bare !== e.name) out.push([normalizeKey(bare), 3]);
  return out.filter(([k]) => k.length > 0);
}

function buildIndex(entries: readonly CatalogEntry[]): { index: Map<string, Hit>; conflicts: string[] } {
  const index = new Map<string, Hit>();
  const conflicts: string[] = [];
  for (const entry of entries) {
    for (const [key, tier] of keysOf(entry)) {
      const prev = index.get(key);
      if (!prev || tier < prev.tier) index.set(key, { entry, tier });
      else if (prev.tier === tier && prev.entry !== entry) conflicts.push(`'${key}' (tier ${tier}) names both ${prev.entry.id} and ${entry.id}`);
    }
  }
  return { index, conflicts };
}

/** Lookup keys that two entries claim at the same tier (the first entry wins at runtime). The catalog tests require none. */
export function catalogKeyConflicts(entries: readonly CatalogEntry[]): string[] {
  return buildIndex(entries).conflicts;
}

// ---------- catalog ----------

function warn(code: Warning['code'], msg: string, severity: Warning['severity'], repaired: boolean): Warning {
  // ids stay empty: resolve() has no graph context, so callers add the node or op ids they are validating.
  return { code, ids: [], msg, severity, repaired };
}

function entriesOf(x: CatalogFile | readonly CatalogEntry[]): readonly CatalogEntry[] {
  return Array.isArray(x) ? (x as readonly CatalogEntry[]) : (x as CatalogFile).entries;
}

function versionOf(x: CatalogFile | readonly CatalogEntry[]): string {
  return Array.isArray(x) ? '' : (x as CatalogFile).version ?? '';
}

function rank(e: CatalogEntry): number {
  return typeof e.pathRank === 'number' ? e.pathRank : 999;
}

function promptRow(e: CatalogEntry): string {
  const cols: string[] = [e.id, e.name, e.scope, e.lane];
  if (typeof e.pathRank === 'number') cols.push(String(e.pathRank));
  cols.push(e.purpose);
  if (e.pairsWith && e.pairsWith.length) cols.push(e.pairsWith.join(','));
  const flags: string[] = [];
  if (e.attach) flags.push(`${e.attach.as} on ${e.attach.hosts.join(',')}`);
  if (e.status === 'legacy') flags.push(e.alternatives && e.alternatives.length ? `legacy, prefer ${e.alternatives.join(',')}` : 'legacy');
  if (e.status === 'preview') flags.push('preview');
  if (e.availability !== 'intl') flags.push(e.availability);
  if (flags.length) cols.push(`[${flags.join('; ')}]`);
  return cols.map((c) => c.replace(/\s*[|\n]\s*/g, ' ')).join(' | ');
}

/**
 * Builds the catalog from the two files (one id namespace; duplicate ids throw).
 *
 * resolve(q): exact id (also case-insensitive with '_' or spaces read as '-'), then a case-insensitive name, short label or
 * alias with spacing and punctuation ignored. A match that is legacy, no-new-purchases or retired and has a successor is
 * replaced by its successor (followed transitively) with a 'retired-product' warning (via 'successor'); an alias match
 * otherwise carries an 'alias-resolved' info warning. Entries without a successor resolve as they are, without a
 * lifecycle warning, and availability (china-only, restricted) is not reported here: the validator checks entry.status
 * and entry.availability. Unknown references return no entry and an 'unknown-product' warning. Warning ids are empty.
 */
export function createCatalog(products: CatalogFile | readonly CatalogEntry[], offerings: CatalogFile | readonly CatalogEntry[]): Catalog {
  const entries: CatalogEntry[] = [...entriesOf(products), ...entriesOf(offerings)];
  const byId = new Map<string, CatalogEntry>();
  for (const e of entries) {
    if (!e || typeof e.id !== 'string' || !e.id) throw new Error('catalog entry without an id');
    if (byId.has(e.id)) throw new Error(`duplicate catalog id '${e.id}'`);
    byId.set(e.id, e);
  }
  const { index } = buildIndex(entries);
  const version = [versionOf(products), versionOf(offerings)].sort().pop() || '';

  function resolve(idOrName: string): Resolution {
    const raw = typeof idOrName === 'string' ? idOrName.trim() : '';
    if (!raw) return { warning: warn('unknown-product', 'empty product reference', 'error', false) };
    let entry = byId.get(raw) ?? byId.get(raw.toLowerCase().replace(/[\s_]+/g, '-'));
    let via: 'id' | 'alias' = 'id';
    if (!entry) {
      const hit = index.get(normalizeKey(raw));
      if (!hit) return { warning: warn('unknown-product', `'${raw}' is not in the catalog`, 'error', false) };
      entry = hit.entry;
      via = 'alias';
    }
    const matched = entry;
    const label = via === 'alias' ? `'${raw}' (${matched.id})` : `'${matched.id}'`;
    if (!CURRENT.has(matched.status) && matched.successor) {
      const next = checkLifecycle(matched, byId).successor;
      if (next) return { entry: next, via: 'successor', warning: successorWarning(matched, next, label) };
    }
    if (via === 'alias') {
      return { entry: matched, via, warning: warn('alias-resolved', `${label} resolved to ${matched.name}`, 'info', true) };
    }
    return { entry: matched, via: 'id' };
  }

  function promptRows(): string {
    const scopeIx = (s: Scope): number => (SCOPE_ORDER.indexOf(s) + 1 || 99);
    const laneIx = (l: Lane): number => (LANE_ORDER.indexOf(l) + 1 || 99);
    return entries
      .filter(isRecommendable)
      .sort((a, b) => scopeIx(a.scope) - scopeIx(b.scope) || laneIx(a.lane) - laneIx(b.lane) || rank(a) - rank(b) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
      .map(promptRow)
      .join('\n');
  }

  return { version, entries, byId, resolve, promptRows };
}
