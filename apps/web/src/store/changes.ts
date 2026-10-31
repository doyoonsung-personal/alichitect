// Change lines: the op events of a revision turned into the record's change list (spec 7.10). Pure. Names come from
// the catalog (short names), never from the model's spelling; the line holds data, and the console words it.
import type { ApplyResult, Catalog, CatalogEntry, Graph, GraphNode, Op } from '@ali/core/types.ts';
import { normalizeKey } from '@ali/core/catalog.ts';
import type { ChangeLine } from './types.ts';
import type { Phase } from '../stream/events.ts';

const has = (r: object, k: string): boolean => Object.prototype.hasOwnProperty.call(r, k);

export function entryOf(catalog: Catalog, product: string): CatalogEntry | undefined {
  return catalog.byId.get(product);
}

/** Catalog short name, or the id when the product is unknown. */
export function nameOf(catalog: Catalog, product: string): string {
  return entryOf(catalog, product)?.short ?? product;
}

/** The card label, only when it says something the short name does not. */
export function labelIfDiffers(label: string | undefined, name: string): string | undefined {
  const l = (label ?? '').trim();
  if (!l) return undefined;
  return normalizeKey(l) === normalizeKey(name) ? undefined : l;
}

function zonesOf(n: GraphNode | undefined): string[] | undefined {
  return n && n.zones && n.zones.length ? [...n.zones].map((z) => z.toUpperCase()) : undefined;
}

function frameOf(g: Graph, n: GraphNode | undefined): string | undefined {
  if (!n || !n.group || !has(g.groups, n.group)) return undefined;
  const grp = g.groups[n.group];
  // the region and VPC names say where; a zone is already shown as zone chips
  return grp.kind === 'zone' ? undefined : grp.label || undefined;
}

const sameList = (a: readonly string[] | undefined, b: readonly string[] | undefined): boolean => (a ?? []).join(',') === (b ?? []).join(',');

function endLabel(g: Graph, catalog: Catalog, id: string): string {
  const n = has(g.nodes, id) ? g.nodes[id] : undefined;
  if (n) return n.label?.trim() || nameOf(catalog, n.product);
  if (id.startsWith('rec:')) return nameOf(catalog, id.slice(4));
  return id;
}

function upsert(lines: ChangeLine[], line: ChangeLine): ChangeLine[] {
  const i = lines.findIndex((l) => l.key === line.key);
  if (i < 0) return [...lines, line];
  const out = lines.slice();
  out[i] = line;
  return out;
}

const lineOf = (partial: Omit<ChangeLine, 'cards' | 'ghosts'> & { cards?: string[]; ghosts?: string[] }): ChangeLine => ({ cards: [], ghosts: [], ...partial });

/** A removed line and an added line of the same lane, different products, in one revision are one replacement. */
function laneOf(catalog: Catalog, product: string | undefined): string | undefined {
  return product ? entryOf(catalog, product)?.lane : undefined;
}

function pairReplacement(lines: ChangeLine[], fresh: ChangeLine, catalog: Catalog): ChangeLine[] {
  // fresh is an 'added' line (look for an unpaired removed) or a 'removed' line (look for an unpaired added)
  const lane = laneOf(catalog, fresh.product);
  if (!lane) return upsert(lines, fresh);
  const want = fresh.kind === 'added' ? 'removed' : 'added';
  const i = lines.findIndex((l) => l.kind === want && l.product !== fresh.product && laneOf(catalog, l.product) === lane);
  if (i < 0) return upsert(lines, fresh);
  const added = fresh.kind === 'added' ? fresh : lines[i];
  const removed = fresh.kind === 'removed' ? fresh : lines[i];
  const merged: ChangeLine = lineOf({
    key: `replaced:${removed.ghosts[0] ?? removed.key}>${added.cards[0] ?? added.key}`,
    kind: 'replaced',
    phase: added.phase,
    product: added.product,
    name: added.name,
    label: added.label,
    fromName: removed.name,
    fromLabel: removed.label,
    frame: added.frame,
    zones: added.zones,
    cards: added.cards,
    ghosts: removed.ghosts,
  });
  const out = lines.slice();
  out[i] = merged; // keep the earlier line's position
  return out;
}

/**
 * Folds one op into the change list. `before` is the working graph before the op, `res` the reducer's result (its
 * `graph` is the graph after). Returns the same array when the op changes nothing visible.
 */
export function applyChange(lines: ChangeLine[], op: Op, before: Graph, res: ApplyResult, catalog: Catalog, phase: Phase): ChangeLine[] {
  const after = res.graph;
  let out = lines;

  if (op.t === 'plan') {
    const seen = new Set(out.map((l) => l.product).filter((p): p is string => !!p));
    for (const p of before.nodes ? Object.values(before.nodes).map((n) => n.product) : []) seen.add(p);
    for (const p of op.products) {
      if (typeof p !== 'string' || seen.has(p)) continue;
      seen.add(p);
      out = [...out, lineOf({ key: `planned:${p}`, kind: 'planned', phase, product: p, name: nameOf(catalog, p) })];
    }
    return out;
  }

  if (op.t === 'gap') return upsert(out, lineOf({ key: `gap:${out.length}`, kind: 'gap', phase, name: '', need: op.need, note: op.note }));

  if (op.t === 'rec') {
    const id = 'rec:' + op.product;
    const isNew = res.added.includes(id);
    const isUpd = res.updated.includes(id);
    if (!isNew && !isUpd) return out;
    const line = lineOf({ key: `rec:${op.product}`, kind: 'recommended', phase, product: op.product, name: nameOf(catalog, op.product), fit: op.fit, cards: [id] });
    const planned = out.findIndex((l) => l.kind === 'planned' && l.product === op.product);
    if (planned >= 0) {
      const o = out.slice();
      o[planned] = line;
      return o;
    }
    return upsert(out, line);
  }

  // node-level changes
  const removedNodes = res.removed.filter((id) => has(before.nodes, id));
  for (const id of removedNodes) {
    const n = before.nodes[id];
    // a card the model drew and then removed in the same revision leaves no trace
    const drawnHere = out.findIndex((l) => (l.kind === 'added' || l.kind === 'attached' || l.kind === 'replaced') && l.cards.includes(id));
    if (drawnHere >= 0) {
      const l = out[drawnHere];
      if (l.kind === 'replaced') {
        // the replaced-in card was itself removed: what is left is the original removal
        const gone = lineOf({ key: `removed:${l.ghosts[0]}`, kind: 'removed', phase: l.phase, product: undefined, name: l.fromName ?? '', label: l.fromLabel, cards: [], ghosts: l.ghosts });
        out = [...out.slice(0, drawnHere), gone, ...out.slice(drawnHere + 1)];
      } else out = out.filter((_, i) => i !== drawnHere);
      continue;
    }
    const name = nameOf(catalog, n.product);
    const line = lineOf({ key: `removed:${id}`, kind: 'removed', phase, product: n.product, name, label: labelIfDiffers(n.label, name), frame: frameOf(before, n), zones: zonesOf(n), ghosts: [id] });
    out = pairReplacement(out, line, catalog);
  }

  const addedNodes = res.added.filter((id) => has(after.nodes, id) && !has(before.nodes, id));
  for (const id of addedNodes) {
    const n = after.nodes[id];
    const name = nameOf(catalog, n.product);
    const host = n.attachTo && has(after.nodes, n.attachTo) ? after.nodes[n.attachTo] : undefined;
    const line = lineOf({
      key: `${host ? 'attached' : 'added'}:${id}`,
      kind: host ? 'attached' : 'added',
      phase,
      product: n.product,
      name,
      label: labelIfDiffers(n.label, name),
      host: host ? nameOf(catalog, host.product) : undefined,
      frame: host ? undefined : frameOf(after, n),
      zones: zonesOf(n),
      cards: [id],
    });
    const planned = out.findIndex((l) => l.kind === 'planned' && l.product === n.product);
    if (planned >= 0) {
      const o = out.slice();
      o[planned] = line;
      out = o;
    } else if (host) out = upsert(out, line);
    else out = pairReplacement(out, line, catalog);
  }

  for (const id of res.updated) {
    if (!has(before.nodes, id) || !has(after.nodes, id)) continue;
    const a = before.nodes[id];
    const b = after.nodes[id];
    const name = nameOf(catalog, b.product);
    const label = labelIfDiffers(b.label, name);
    const prior = out.findIndex((l) => l.cards.includes(id) && (l.kind === 'added' || l.kind === 'attached' || l.kind === 'replaced'));
    if (prior >= 0) {
      // changed again within the revision it was added in: the added line just follows the node
      const l = out[prior];
      const o = out.slice();
      o[prior] = { ...l, name: l.kind === 'replaced' || l.kind === 'added' || l.kind === 'attached' ? name : l.name, product: b.product, label, zones: zonesOf(b), frame: l.kind === 'attached' ? l.frame : frameOf(after, b) };
      out = o;
      continue;
    }
    let kind: ChangeLine['kind'] | null = null;
    if (a.product !== b.product) kind = 'replaced';
    else if (!sameList(a.zones, b.zones) || (a.group ?? null) !== (b.group ?? null) || (a.attachTo ?? null) !== (b.attachTo ?? null)) kind = 'moved';
    else if (a.label !== b.label || (a.why ?? '') !== (b.why ?? '')) kind = 'changed';
    if (!kind) continue;
    const fromName = nameOf(catalog, a.product);
    const line = lineOf({
      key: `${kind}:${id}`,
      kind,
      phase,
      product: b.product,
      name,
      label,
      fromName: kind === 'replaced' ? fromName : undefined,
      fromLabel: kind === 'replaced' || kind === 'changed' ? labelIfDiffers(a.label, fromName) : undefined,
      frame: frameOf(after, b),
      zones: zonesOf(b),
      fromZones: kind === 'moved' ? zonesOf(a) : undefined,
      cards: [id],
    });
    out = upsert(out, line);
  }

  // connections: edges between two elements that exist. Edges that vanish with their node belong to that node's removed line.
  const endsExist = (g: Graph, id: string): boolean => {
    const e = g.edges[id];
    const ok = (x: string): boolean => has(g.nodes, x) || (x.startsWith('rec:') && g.recs.some((r) => r.product === x.slice(4)));
    return ok(e.from) && ok(e.to);
  };
  const split = op.t === 'insert'; // an insert replaces one edge with two: the new node's line says it
  const edgeAddsVisible = split ? [] : res.added.filter((id) => has(after.edges, id) && !has(before.edges, id) && endsExist(after, id));
  const edgeDels = split ? [] : res.removed.filter((id) => has(before.edges, id) && has(after.nodes, before.edges[id].from) && has(after.nodes, before.edges[id].to));
  const pair = (g: Graph, id: string): [string, string] => [endLabel(g, catalog, g.edges[id].from), endLabel(g, catalog, g.edges[id].to)];
  if (edgeAddsVisible.length) out = bumpConnections(out, 'connections', phase, edgeAddsVisible.map((id) => pair(after, id)));
  if (edgeDels.length) out = bumpConnections(out, 'connectionsRemoved', phase, edgeDels.map((id) => pair(before, id)));
  return out;
}

function bumpConnections(lines: ChangeLine[], kind: 'connections' | 'connectionsRemoved', phase: Phase, pairs: Array<[string, string]>): ChangeLine[] {
  const key = `${kind}:${phase}`;
  const i = lines.findIndex((l) => l.key === key);
  if (i < 0) return [...lines, lineOf({ key, kind, phase, name: '', count: pairs.length, pairs })];
  const cur = lines[i];
  const o = lines.slice();
  o[i] = { ...cur, count: (cur.count ?? 0) + pairs.length, pairs: [...(cur.pairs ?? []), ...pairs] };
  return o;
}

/** "A to B to C" when the pairs chain end to start, else "A to B, C to D". Empty when there are more than three pairs. */
export function connectionDetail(line: ChangeLine, maxPairs = 3): string {
  const pairs = line.pairs ?? [];
  if (!pairs.length || pairs.length > maxPairs) return '';
  const chain = pairs.every((p, i) => i === 0 || pairs[i - 1][1] === p[0]);
  if (chain) return [pairs[0][0], ...pairs.map((p) => p[1])].join(' to ');
  return pairs.map((p) => `${p[0]} to ${p[1]}`).join(', ');
}

/**
 * At commit the server's graph is the truth. Drops lines whose cards the repair removed (a replica merged into one
 * multi-zone node), turns a card that became a badge into an attachment line, and adds a line for anything the
 * repair created or changed that no streamed op explained. Planned lines that never landed are dropped.
 */
export function reconcileChanges(lines: ChangeLine[], base: Graph, committed: Graph, catalog: Catalog, phase: Phase = 'main', addMissing = true): ChangeLine[] {
  const exists = (id: string): boolean => (id.startsWith('rec:') ? committed.recs.some((r) => r.product === id.slice(4)) : has(committed.nodes, id));
  const out: ChangeLine[] = [];
  for (const l of lines) {
    if (l.kind === 'planned') continue;
    if (l.kind === 'connections' || l.kind === 'connectionsRemoved' || l.kind === 'gap') {
      out.push(l);
      continue;
    }
    if (l.kind === 'removed') {
      const back = l.ghosts.filter((id) => !has(committed.nodes, id));
      if (back.length) out.push({ ...l, ghosts: back });
      continue;
    }
    const cards = l.cards.filter(exists);
    if (!cards.length) {
      if (l.kind === 'replaced' && l.ghosts.length) {
        // the replacement did not survive the repair; what remains is the removal
        out.push({ ...l, kind: 'removed', name: l.fromName ?? l.name, label: l.fromLabel, cards: [], key: `removed:${l.ghosts[0]}`, fromName: undefined, fromLabel: undefined });
      }
      continue;
    }
    const id = cards[0];
    const n = has(committed.nodes, id) ? committed.nodes[id] : undefined;
    if (l.kind === 'added' && n && n.attachTo && has(committed.nodes, n.attachTo)) {
      out.push({ ...l, kind: 'attached', host: nameOf(catalog, committed.nodes[n.attachTo].product), frame: undefined, cards });
    } else out.push({ ...l, cards });
  }
  if (!addMissing) return out;
  const covered = new Set(out.flatMap((l) => l.cards));
  for (const n of Object.values(committed.nodes)) {
    if (has(base.nodes, n.id) || covered.has(n.id)) continue;
    const name = nameOf(catalog, n.product);
    const host = n.attachTo && has(committed.nodes, n.attachTo) ? committed.nodes[n.attachTo] : undefined;
    out.push(
      lineOf({
        key: `${host ? 'attached' : 'added'}:${n.id}`,
        kind: host ? 'attached' : 'added',
        phase,
        product: n.product,
        name,
        label: labelIfDiffers(n.label, name),
        host: host ? nameOf(catalog, host.product) : undefined,
        frame: host ? undefined : frameOf(committed, n),
        zones: zonesOf(n),
        cards: [n.id],
      }),
    );
  }
  for (const r of committed.recs) {
    const id = 'rec:' + r.product;
    if (covered.has(id) || base.recs.some((b) => b.product === r.product)) continue;
    out.push(lineOf({ key: `rec:${r.product}`, kind: 'recommended', phase, product: r.product, name: nameOf(catalog, r.product), fit: r.fit, cards: [id] }));
  }
  return out;
}

/** Counts for the collapsed row: cards and recommendations added or removed, from the line list. */
export function countChanges(lines: readonly ChangeLine[]): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const l of lines) {
    if (l.kind === 'added' || l.kind === 'attached' || l.kind === 'recommended') added++;
    else if (l.kind === 'removed') removed++;
    else if (l.kind === 'replaced') {
      added++;
      removed++;
    }
  }
  return { added, removed };
}
