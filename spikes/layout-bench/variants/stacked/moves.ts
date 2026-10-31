// Analysis helper for the stacked variant (not part of the layout): lists the batches with unrelated moves, with the
// moved cards' slots, so each cause can be named. Run from the repo root:
//   node spikes/layout-bench/variants/stacked/moves.ts [--sources final,baseline] [--phase follow|first|all] [--limit 40]
import { loadCatalog } from '../../../../packages/core/src/catalog-node.ts';
import type { LayoutState } from '../../../../packages/core/src/layout.ts';
import { loadSessions } from '../../src/inputs.ts';
import type { SourceId } from '../../src/inputs.ts';
import { buildTrace } from '../../src/trace.ts';
import { classifyMoves } from '../../src/metrics/stability.ts';
import { layoutStacked } from './layout.ts';

const arg = (k: string, d: string): string => {
  const i = process.argv.indexOf('--' + k);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const sources = arg('sources', 'final,baseline').split(',') as SourceId[];
const phase = arg('phase', 'all');
const limit = Number(arg('limit', '40'));
const mode = arg('batch', 'op') as 'op' | 'turn';
const [cw, chh] = arg('canvas', '1040x800').split('x').map(Number);
const catalog = loadCatalog();
const trace = buildTrace(loadSessions(sources, catalog, { ops: 'content' }), catalog, mode);

const causes = new Map<string, number>();
let shown = 0;
let total = 0;
for (const st of trace.sessions) {
  let prev: LayoutState | undefined;
  for (const f of st.frames) {
    const next = layoutStacked(f.display, catalog, prev, { canvas: { w: cw, h: chh } });
    if (prev && f.count && f.kind !== 'base' && (phase === 'all' || (phase === 'first') === f.first)) {
      const m = classifyMoves(prev, next);
      const un = m.moved.filter((x) => x.cls === 'unrelated');
      if (un.length) {
        total += un.length;
        const slots = [...new Set(un.map((x) => next.cards[x.id].slot.replace(/^.*?(~[a-z]+#|#)/, '$1')))].join(' ');
        const dy = un.map((x) => Math.round(next.cards[x.id].y - prev!.cards[x.id].y));
        const dx = un.map((x) => Math.round(next.cards[x.id].x - prev!.cards[x.id].x));
        const k = `${f.label.split(',')[0].replace(/:.*/, '')} -> ${slots} dx${[...new Set(dx)].join('/')} dy${[...new Set(dy)].join('/')}`;
        causes.set(k, (causes.get(k) ?? 0) + un.length);
        if (process.argv.includes('--frames') && shown < limit) for (const [k, L] of [['prev', prev], ['next', next]] as const) console.log('   ' + k + ' ' + Object.values(L.frames).filter((x) => x.kind !== 'lane' || un.some((u) => next.cards[u.id].frame === x.id)).map((x) => x.id + '[' + x.kind + ']@' + Math.round(x.y) + '+' + Math.round(x.h)).join(' '));
        if (shown++ < limit) console.log(`${st.spec.id} T${f.turn + 1} ${f.first ? 'first' : 'follow'} [${f.label}] ${un.length}: ${un.slice(0, 5).map((x) => `${x.id}@${next.cards[x.id].slot} (${dx[un.indexOf(x)]},${dy[un.indexOf(x)]})`).join(', ')}`);
      }
    }
    prev = next;
  }
}
console.log(`\nunrelated ${total}; by op -> slots and shift:`);
for (const [k, n] of [...causes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40)) console.log(`${String(n).padStart(5)}  ${k}`);
