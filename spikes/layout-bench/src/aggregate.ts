// Turns run results into the metrics.json sections and the printed table.
import { aggregateStability } from './metrics/stability.ts';
import type { PhaseStats, StabilityReport } from './metrics/stability.ts';
import { aggregateSize, canvasKey } from './metrics/size.ts';
import type { SizeReport } from './metrics/size.ts';
import type { RouterData, RunResult } from './runner.ts';
import { pct, round, summary } from './stats.ts';
import type { Summary } from './stats.ts';

export interface TextReport {
  states: number;
  cards: number;
  titleCut: number;
  subtitleCut: number;
  statesWithCardCut: number;
  frames: number;
  frameCut: number;
  examples: string[];
}

export function textReport(r: RunResult): TextReport {
  const ex = new Map<string, number>();
  for (const t of r.text) for (const e of t.examples) ex.set(e, (ex.get(e) ?? 0) + 1);
  return {
    states: r.text.length,
    cards: r.text.reduce((s, t) => s + t.cards, 0),
    titleCut: r.text.reduce((s, t) => s + t.titleCut, 0),
    subtitleCut: r.text.reduce((s, t) => s + t.subtitleCut, 0),
    statesWithCardCut: r.text.filter((t) => t.titleCut + t.subtitleCut > 0).length,
    frames: r.text.reduce((s, t) => s + t.frames, 0),
    frameCut: r.text.reduce((s, t) => s + t.frameCut, 0),
    examples: [...ex.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, n]) => `${k} x${n}`),
  };
}

export interface FillReport {
  zone: { frames: number; emptyShare: number | null; perFrameEmpty: Summary };
  byKind: Record<string, { frames: number; emptyShare: number }>;
}

export function fillReport(r: RunResult): FillReport {
  const byKind: Record<string, { frames: number; emptyShare: number }> = {};
  for (const [k, v] of Object.entries(r.fill)) byKind[k] = { frames: v.frames, emptyShare: round(1 - v.cardArea / Math.max(1, v.area), 3) };
  const z = r.fill.zone ?? { frames: 0, area: 0, cardArea: 0 };
  return { zone: { frames: z.frames, emptyShare: z.frames ? round(1 - z.cardArea / Math.max(1, z.area), 3) : null, perFrameEmpty: summary(r.zoneEmpty, 3) }, byKind };
}

export interface RouterReport {
  states: number;
  statesWithCardHits: number;
  cardHits: number;
  statesWithLabelHits: number;
  statesWithFailed: number;
  statesWithOverlap: number;
  overlapPx: Summary;
  /** Overlap over states with 8 or more cards (the reviewer's p95 population). */
  overlapPx8: Summary;
  nearPairs: Summary;
  nearPx: Summary;
  statesWithNear: number;
  nearUnrelatedPairs: Summary;
  statesWithNearUnrelated: number;
  borderPx: Summary;
  borderShare: number;
  detour: { routes: number; p50: number; p95: number; max: number; over1_5: number; over2_5: number };
  crossings: Summary & { none: number; ge5: number; ge10: number; ge20: number };
  crossings8: { states: number; none: number; ge5: number; ge10: number; ge20: number; max: number };
  churn: { frames: number; framesWithChurn: number; comparable: number; changed: number; share: number; changedPx: number };
  ms: Summary;
  solveMs?: Summary;
  over50ms: number;
}

function crossingBuckets(xs: number[]): { none: number; ge5: number; ge10: number; ge20: number } {
  return { none: xs.filter((x) => x === 0).length, ge5: xs.filter((x) => x >= 5).length, ge10: xs.filter((x) => x >= 10).length, ge20: xs.filter((x) => x >= 20).length };
}

/** Router report over the sessions `keep` accepts (default all). */
export function routerReport(all: RouterData, keep: (session: string) => boolean = () => true): RouterReport {
  const d = { quality: all.quality.filter((x) => keep(x.session)), churn: all.churn.filter((x) => keep(x.session)), calls: all.calls.filter((x) => keep(x.session)) };
  const ms = d.calls.map((c) => c.ms);
  const solve = d.calls.filter((c) => c.solveMs !== undefined).map((c) => c.solveMs as number);
  const q = d.quality;
  const det = q.flatMap((x) => x.a.detours);
  const cr = q.map((x) => x.m.crossings);
  const cr8 = q.filter((x) => x.cards >= 8).map((x) => x.m.crossings);
  const len = q.reduce((s, x) => s + x.a.lengthPx, 0);
  const comparable = d.churn.reduce((s, c) => s + c.comparable, 0);
  const changed = d.churn.reduce((s, c) => s + c.changed, 0);
  const out: RouterReport = {
    states: q.length,
    statesWithCardHits: q.filter((x) => x.m.edgeNodeIntersections > 0).length,
    cardHits: q.reduce((s, x) => s + x.m.edgeNodeIntersections, 0),
    statesWithLabelHits: q.filter((x) => x.m.labelHits > 0).length,
    statesWithFailed: q.filter((x) => x.failed > 0).length,
    statesWithOverlap: q.filter((x) => x.m.overlapPx > 0).length,
    overlapPx: summary(q.map((x) => x.m.overlapPx), 0),
    overlapPx8: summary(q.filter((x) => x.cards >= 8).map((x) => x.m.overlapPx), 0),
    nearPairs: summary(q.map((x) => x.a.nearPairs), 1),
    nearPx: summary(q.map((x) => x.a.nearPx), 0),
    statesWithNear: q.filter((x) => x.a.nearPairs > 0).length,
    nearUnrelatedPairs: summary(q.map((x) => x.a.nearUnrelatedPairs), 1),
    statesWithNearUnrelated: q.filter((x) => x.a.nearUnrelatedPairs > 0).length,
    borderPx: summary(q.map((x) => x.a.borderPx), 0),
    borderShare: round(q.reduce((s, x) => s + x.a.borderPx, 0) / Math.max(1, len), 4),
    detour: { routes: det.length, p50: round(pct(det, 0.5), 2), p95: round(pct(det, 0.95), 2), max: round(Math.max(0, ...det), 2), over1_5: round(det.filter((x) => x > 1.5).length / Math.max(1, det.length), 3), over2_5: round(det.filter((x) => x > 2.5).length / Math.max(1, det.length), 3) },
    crossings: { ...summary(cr, 1), ...crossingBuckets(cr) },
    crossings8: { states: cr8.length, ...crossingBuckets(cr8), max: Math.max(0, ...cr8) },
    churn: { frames: d.churn.length, framesWithChurn: d.churn.filter((c) => c.changed > 0).length, comparable, changed, share: round(changed / Math.max(1, comparable), 4), changedPx: d.churn.reduce((s, c) => s + c.changedPx, 0) },
    ms: summary(ms, 2),
    over50ms: ms.filter((x) => x > 50).length,
  };
  if (solve.length) out.solveMs = summary(solve, 2);
  return out;
}

export interface CanvasSection {
  canvas: string;
  frames: number;
  layoutMs: Summary;
  stability: StabilityReport;
  size: SizeReport;
  /** Size on the final eval run only (the reviewer's population). */
  sizeFinal: SizeReport;
  text: TextReport;
  frames_: FillReport;
}

export function canvasSection(r: RunResult): CanvasSection {
  return {
    canvas: canvasKey(r.canvas),
    frames: r.frames,
    layoutMs: summary(r.layoutMs, 3),
    stability: aggregateStability(r.stability),
    size: aggregateSize(r.canvas, r.size),
    sizeFinal: aggregateSize(r.canvas, r.size.filter((x) => x.session.startsWith('final:'))),
    text: textReport(r),
    frames_: fillReport(r),
  };
}

// ---------- printed table ----------

const pad = (s: string | number, n: number): string => String(s).padStart(n);
const padR = (s: string | number, n: number): string => String(s).padEnd(n);
const pctS = (x: number): string => `${(x * 100).toFixed(1)}%`;

function stabLine(name: string, p: PhaseStats): string {
  return `  ${padR(name, 12)} batches ${pad(p.batches, 6)}  moved ${pad(p.moved, 5)}  unrelated ${pad(p.unrelated, 4)} in ${pad(p.batchesWithUnrelated, 3)} batches, ${pad(p.casesWithUnrelated.length, 2)} cases  same-block ${pad(p.sameBlock, 4)}  reslotted ${pad(p.reslotted, 3)}  max ${p.maxUnrelatedPx} px  hist ${JSON.stringify(p.unrelatedHistogram)}`;
}

export function printTable(layoutName: string, sections: CanvasSection[], primary: string, routers: Record<string, RouterReport>, turnStability: StabilityReport | null): string {
  const L: string[] = [];
  const p = sections.find((s) => s.canvas === primary) ?? sections[0];
  L.push(`== layout ${layoutName}  (${p.frames} frames per canvas; layout ms p50 ${p.layoutMs.p50} p95 ${p.layoutMs.p95} max ${p.layoutMs.max})`);
  L.push(`-- stability, one op per batch (canvas ${p.canvas})`);
  L.push(stabLine('all', p.stability.all));
  L.push(stabLine('first turns', p.stability.firstTurns));
  L.push(stabLine('follow-ups', p.stability.followUps));
  if (turnStability) {
    L.push(`-- stability, one batch per turn`);
    L.push(stabLine('all', turnStability.all));
    L.push(stabLine('first turns', turnStability.firstTurns));
    L.push(stabLine('follow-ups', turnStability.followUps));
  }
  L.push(`  worst: ${p.stability.worst.slice(0, 5).map((w) => `${w.session} T${w.turn} ${w.batch} ${w.unrelated} cards max ${w.maxPx}px`).join(' | ')}`);
  const s0 = p.size;
  L.push(`-- size (${s0.states} turn-end states): width p50 ${s0.width.p50} max ${s0.width.max}; height p50 ${s0.height.p50} max ${s0.height.max}; aspect p50 ${s0.aspect.p50} max ${s0.aspect.max}; arch>=8 cards ${s0.arch8.states} states, aspect p50 ${s0.arch8.aspect.p50}`);
  L.push(`   canvas      zoom p50  title p50   sub p50   frame p50   title<11  title<12  sub<11  frame<11  unrelated moves`);
  for (const s of sections) {
    const a = s.size.all;
    L.push(`   ${padR(s.canvas, 10)} ${pad(a.zoom.p50.toFixed(3), 8)}  ${pad(a.titlePx.p50.toFixed(1), 9)} ${pad(a.subtitlePx.p50.toFixed(1), 9)} ${pad(a.framePx.p50.toFixed(1), 10)}  ${pad(pctS(a.below11.title), 8)} ${pad(pctS(a.below12.title), 9)} ${pad(pctS(a.below11.subtitle), 7)} ${pad(pctS(a.below11.frame), 9)}  ${pad(s.stability.all.unrelated, 15)}`);
  }
  L.push(`   title px p50 by card count at ${primary}: ${Object.entries(p.size.byCards).map(([k, g]) => `${k}: ${g.states ? g.titlePx.p50.toFixed(1) : '-'} (n ${g.states}, <11 ${pctS(g.below11.title)})`).join('; ')}`);
  const t = p.text;
  L.push(`-- text: ${t.cards} cards in ${t.states} states; titles cut ${t.titleCut} (${pctS(t.titleCut / Math.max(1, t.cards))}), subtitles cut ${t.subtitleCut} (${pctS(t.subtitleCut / Math.max(1, t.cards))}); states with a cut card ${t.statesWithCardCut}; frame labels cut ${t.frameCut} of ${t.frames}`);
  const ze = p.frames_.zone.emptyShare;
  L.push(`-- frames: zone frames ${p.frames_.zone.frames}, empty share ${ze === null ? '-' : pctS(ze)} (per zone p50 ${ze === null ? '-' : pctS(p.frames_.zone.perFrameEmpty.p50)}); vpc ${p.frames_.byKind.vpc ? pctS(p.frames_.byKind.vpc.emptyShare) : '-'}; region ${p.frames_.byKind.region ? pctS(p.frames_.byKind.region.emptyShare) : '-'}`);
  for (const [name, r] of Object.entries(routers)) {
    L.push(`-- routes ${name} (${r.states} turn-end states): card hits in ${r.statesWithCardHits} states (${r.cardHits}); overlap in ${r.statesWithOverlap} states (p95 ${r.overlapPx.p95} px); near-parallel <10px in ${r.statesWithNear} states (pairs p50 ${r.nearPairs.p50} p95 ${r.nearPairs.p95}), unrelated in ${r.statesWithNearUnrelated}`);
    L.push(`   border-run px p50 ${r.borderPx.p50} p95 ${r.borderPx.p95} (${pctS(r.borderShare)} of length); detour p50 ${r.detour.p50} p95 ${r.detour.p95} max ${r.detour.max} (>1.5: ${pctS(r.detour.over1_5)}); crossings p50 ${r.crossings.p50} p95 ${r.crossings.p95} max ${r.crossings.max}, none ${r.crossings.none}, >=10 ${r.crossings.ge10}`);
    L.push(`   churn: ${r.churn.changed} of ${r.churn.comparable} unmoved routes redrawn (${pctS(r.churn.share)}) in ${r.churn.framesWithChurn} of ${r.churn.frames} frames; time ms p50 ${r.ms.p50} p95 ${r.ms.p95} max ${r.ms.max}${r.solveMs ? ` (solve p50 ${r.solveMs.p50} p95 ${r.solveMs.p95})` : ''}; over 50 ms ${r.over50ms}`);
  }
  return L.join('\n');
}
