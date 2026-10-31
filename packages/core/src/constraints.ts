// Pinned constraints as data: req ops that carry regions or avoid become Constraint records in chat memory, and every
// turn's diagram and say lines are checked against them. Error-level findings go to the follow-up repair turn, so the
// model fixes the diagram and corrects its narration. Browser-safe: no Node APIs.
import type { Catalog, CatalogEntry, Constraint, Graph, GraphGroup, Op, Warning } from './types.ts';
import { findRegionMentions, regionLabel } from './regions.ts';

type ReqOp = Extract<Op, { t: 'req' }>;

/** At most this many constraints are kept (the newest win), as for pinned requirement texts. */
export const MAX_CONSTRAINTS = 12;

const key = (s: string): string => s.normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '');
const uniq = (xs: readonly unknown[] | undefined): string[] => [...new Set((xs ?? []).filter((x): x is string => typeof x === 'string' && x.length > 0))];
const sameSet = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((x) => b.includes(x));

function toConstraint(x: Constraint | ReqOp): Constraint | null {
  const text = typeof x.text === 'string' ? x.text.trim() : '';
  const regions = uniq(x.regions);
  const avoid = uniq(x.avoid);
  if (!text || (!regions.length && !avoid.length)) return null;
  const c: Constraint = { text };
  if (regions.length) c.regions = regions;
  if (avoid.length) c.avoid = avoid;
  return c;
}

/**
 * Adds the machine-checkable form of new req ops (or constraints) to the pinned ones. A req without regions or avoid
 * adds nothing. One whose text matches a pinned constraint (ignoring case, spacing and punctuation) replaces it in
 * place, so a restated requirement can correct its lists; one with the same regions and avoid lists as a pinned
 * constraint is a duplicate and is skipped. Keeps the newest `max`. Never mutates its inputs.
 */
export function mergeConstraints(existing: readonly Constraint[], added: ReadonlyArray<Constraint | ReqOp>, max = MAX_CONSTRAINTS): Constraint[] {
  const out: Constraint[] = [];
  for (const c of existing) {
    const n = toConstraint(c);
    if (n) out.push(n);
  }
  for (const x of added) {
    const c = toConstraint(x);
    if (!c) continue;
    const i = out.findIndex((o) => key(o.text) === key(c.text));
    if (i >= 0) {
      out[i] = c;
      continue;
    }
    if (out.some((o) => sameSet(o.regions ?? [], c.regions ?? []) && sameSet(o.avoid ?? [], c.avoid ?? []))) continue;
    out.push(c);
  }
  return out.slice(-max);
}

/** Regions data and workloads may use: every pinned region list must hold, so the intersection; null when none is pinned. */
export function allowedRegions(constraints: readonly Constraint[] | undefined): string[] | null {
  let allowed: string[] | null = null;
  for (const c of constraints ?? []) {
    const rs = uniq(c.regions);
    if (!rs.length) continue;
    allowed = allowed === null ? rs : allowed.filter((r) => rs.includes(r));
  }
  return allowed;
}

/** Catalog ids the user ruled out, across every pinned constraint. */
export function avoidedProducts(constraints: readonly Constraint[] | undefined): Set<string> {
  const out = new Set<string>();
  for (const c of constraints ?? []) for (const a of uniq(c.avoid)) out.add(a);
  return out;
}

// ---------- say lines ----------

/** Words that move, store or keep a copy of data somewhere (English, Korean, Chinese). */
const DATA_WORDS =
  /\b(?:replicat\w*|replicas?|back(?:s|ed|ing)?[\s-]?up\w*|backups?|cop(?:y|ies|ied|ying)|disaster[\s-]recovery|fail(?:s|ed|ing)?[\s-]?over\w*|migrat\w*|sync(?:s|ed|ing)?|synchroni[sz]\w*|stor(?:e|es|ed|ing|age)|standby|mirror\w*|kept|keep(?:s|ing)?\s+(?:all\s+)?(?:\w+\s+){0,2}(?:data|records|backups))\b|\bDR\b|복제|백업|복사|재해\s?복구|장애\s?조치|페일오버|마이그레이션|이관|동기화|저장|보관|스탠바이|미러링|사본|复制|複製|备份|備份|拷贝|拷貝|容灾|容災|灾备|災備|灾难恢复|災難恢復|故障转移|故障轉移|迁移|遷移|同步|存储|存儲|存放|保存|副本|备用|備用/i;

/** Negation in the same clause: "not", "never", "instead of"; 않/없/대신/말고; 不/没/无/而非/避免. */
const NEGATION =
  /\b(?:not|never|no|none|nor|without|avoid\w*|instead\s+of|rather\s+than|cannot)\b|n['’]t\b|않|없|금지|대신|말고|불가|아니|(?:^|\s)안\s|不|没|沒|无|無|禁止|而非|避免|别|勿/i;

/** "Another region" without naming one: an error with a data word when exactly one region is allowed. */
const CROSS_REGION =
  /\b(?:cross[\s-]region|inter[\s-]region|multi[\s-]region|second region|another region|other region|standby region|DR region|secondary region)\b|교차\s?리전|리전\s?간|다른\s?리전|두 번째 리전|跨地域|跨区域|跨區域|异地|異地|另一个地域|另一個地域|第二地域/i;

const SENTENCE = /[.!?。！？;；\n]+/;
const CLAUSE = /[,，、:：]|\s(?:but|while|whereas|although|though|however|so)\s|\s[-–—]\s/i;

export interface SayFinding {
  severity: 'error' | 'warn';
  /** Region ids named in the clause that are outside the allowed regions. */
  regions: string[];
  /** The clause that names them. */
  clause: string;
  /** The data-moving word found in the clause, if any. */
  verb?: string;
  negated: boolean;
  /** The clause sends data to "another region" without naming it (checked only when exactly one region is allowed). */
  crossRegion?: boolean;
}

/**
 * Foreign-region mentions in one say line (or a why or edge label). A clause that names a region outside `allowed`
 * and holds a data-moving word (replicate, back up, copy, DR, failover, migrate, sync, store, standby, mirror, or the
 * Korean and Chinese equivalents) without a negation is an error; any other foreign mention is a warn. A country
 * counts as foreign only when none of its regions is allowed. When exactly one region is allowed, a clause that names no
 * region but sends data to another one ("cross-region replication", "a standby region") is an error too.
 */
export function sayRegionFindings(text: string, allowed: readonly string[]): SayFinding[] {
  if (typeof text !== 'string' || !text.trim()) return [];
  const ok = new Set(allowed);
  const out: SayFinding[] = [];
  for (const sentence of text.split(SENTENCE)) {
    for (const clause of sentence.split(CLAUSE)) {
      if (!clause || !clause.trim()) continue;
      const foreign: string[] = [];
      const named = findRegionMentions(clause);
      for (const m of named) {
        if (m.ids.some((id) => ok.has(id))) continue;
        for (const id of m.ids) if (!foreign.includes(id)) foreign.push(id);
      }
      const v = DATA_WORDS.exec(clause);
      const negated = NEGATION.test(clause);
      if (!foreign.length) {
        if (!named.length && allowed.length === 1 && v && !negated && CROSS_REGION.test(clause)) {
          out.push({ severity: 'error', regions: [], clause: clause.trim(), verb: v[0], negated, crossRegion: true });
        }
        continue;
      }
      const f: SayFinding = { severity: v && !negated ? 'error' : 'warn', regions: foreign, clause: clause.trim(), negated };
      if (v) f.verb = v[0];
      out.push(f);
    }
  }
  return out;
}

// ---------- the check ----------

function W(code: Warning['code'], ids: string[], msg: string, severity: Warning['severity']): Warning {
  return { code, ids: [...new Set(ids.filter((x) => typeof x === 'string' && x.length > 0))], msg, severity, repaired: false };
}

const has = (r: object, k: string): boolean => Object.prototype.hasOwnProperty.call(r, k);
const clip = (s: string, n = 90): string => (Array.from(s).length > n ? Array.from(s).slice(0, n - 1).join('') + '…' : s);

function chainHas(g: Graph, groupId: string | null, target: string): boolean {
  let cur = groupId;
  for (let i = 0; cur !== null && i < 32; i++) {
    if (cur === target) return true;
    const grp: GraphGroup | undefined = has(g.groups, cur) ? g.groups[cur] : undefined;
    cur = grp ? grp.parent : null;
  }
  return false;
}

function entryOf(catalog: Catalog, product: string): CatalogEntry | undefined {
  try {
    return catalog.byId.get(product) ?? catalog.resolve(product).entry;
  } catch {
    return undefined;
  }
}

/**
 * Checks a graph and the turn's say lines against pinned constraints. Region constraints (the intersection of every
 * pinned regions list): a region group whose label names only other regions, and the nodes in it, are an error; a
 * node whose label names another region is an error; a say line, why or edge label that pairs another region with a
 * data-moving word is an error, and any other mention of another region in a say line is a warn. Avoid constraints:
 * a node or rec whose product the user ruled out is an error. Nothing is changed; every warning has repaired: false.
 */
export function checkConstraints(graph: Graph, says: readonly string[], constraints: readonly Constraint[], catalog: Catalog): Warning[] {
  const out: Warning[] = [];
  const allowed = allowedRegions(constraints);
  const avoid = avoidedProducts(constraints);
  const nodes = Object.values(graph.nodes ?? {});
  if (allowed) {
    const pinned = constraints.filter((c) => c.regions && c.regions.length).map((c) => `"${c.text}"`).join(', ');
    const where = allowed.length ? allowed.map(regionLabel).join(', ') : 'no region (the pinned region lists do not overlap)';
    const rule = `the pinned regions are ${where} (${pinned})`;
    const ok = new Set(allowed);
    const foreignIn = (text: string): string[] => {
      const ids: string[] = [];
      for (const m of findRegionMentions(text)) if (!m.ids.some((id) => ok.has(id))) for (const id of m.ids) if (!ids.includes(id)) ids.push(id);
      return ids;
    };
    const flagged = new Set<string>();
    for (const grp of Object.values(graph.groups ?? {})) {
      if (grp.kind !== 'region') continue;
      const named = findRegionMentions(`${grp.label} ${grp.id}`);
      if (!named.length || named.some((m) => m.ids.some((id) => ok.has(id)))) continue;
      const inside = nodes.filter((n) => chainHas(graph, n.group, grp.id)).map((n) => n.id);
      for (const id of inside) flagged.add(id);
      const regions = [...new Set(named.flatMap((m) => m.ids))].map(regionLabel).join(', ');
      out.push(W('constraint-region', [grp.id, ...inside], `region group '${grp.id}' (${grp.label}) is in ${regions}${inside.length ? ` and holds ${inside.join(', ')}` : ''}; ${rule}`, 'error'));
    }
    for (const n of nodes) {
      if (flagged.has(n.id)) continue;
      const named = foreignIn(n.label);
      if (named.length) {
        out.push(W('constraint-region', [n.id], `'${n.id}' is labelled "${clip(n.label)}", which places it in ${named.map(regionLabel).join(', ')}; ${rule}`, 'error'));
        continue;
      }
      for (const f of sayRegionFindings(n.why ?? '', allowed)) {
        if (f.severity !== 'error') continue;
        out.push(W('constraint-region', [n.id], `the why of '${n.id}' says "${clip(f.clause)}" (${f.verb} to ${f.regions.map(regionLabel).join(', ')}); ${rule}`, 'error'));
      }
    }
    for (const e of Object.values(graph.edges ?? {})) {
      for (const f of sayRegionFindings(e.label ?? '', allowed)) {
        if (f.severity !== 'error') continue;
        out.push(W('constraint-region', [e.id], `edge '${e.id}' is labelled "${clip(e.label ?? '')}" (${f.verb} to ${f.regions.map(regionLabel).join(', ')}); ${rule}`, 'error'));
      }
    }
    for (const s of says) {
      for (const f of sayRegionFindings(s, allowed)) {
        const regions = f.regions.map(regionLabel).join(', ');
        const msg = f.crossRegion
          ? `a say line sends data to another region ("${f.verb}"): "${clip(f.clause)}"; ${rule}. Correct the narration and keep data in the pinned region`
          : f.severity === 'error'
            ? `a say line pairs ${regions} with "${f.verb}": "${clip(f.clause)}"; ${rule}. Correct the narration and keep data in the pinned regions`
            : `a say line names ${regions}: "${clip(f.clause)}"; ${rule}`;
        out.push(W('constraint-region', [], msg, f.severity));
      }
    }
  }
  if (avoid.size) {
    const texts = constraints.filter((c) => c.avoid && c.avoid.length).map((c) => `"${c.text}"`).join(', ');
    const ruled = (product: string): string | undefined => {
      if (avoid.has(product)) return product;
      const e = entryOf(catalog, product);
      return e && avoid.has(e.id) ? e.id : undefined;
    };
    for (const n of nodes) {
      const id = ruled(n.product);
      if (id) out.push(W('constraint-avoid', [n.id], `'${n.id}' uses ${id}, which the user ruled out (${texts}); replace or remove it`, 'error'));
    }
    for (const r of graph.recs ?? []) {
      const id = ruled(r.product);
      if (id) out.push(W('constraint-avoid', [r.product], `rec '${r.product}' is a product the user ruled out (${texts}); remove it`, 'error'));
    }
  }
  return out;
}

/** checkConstraints in the object form llm.ts RunTurnOptions.checkConstraints takes. */
export function constraintChecker(input: { graph: Graph; says: readonly string[]; constraints: readonly Constraint[]; catalog: Catalog }): Warning[] {
  return checkConstraints(input.graph, input.says, input.constraints, input.catalog);
}
