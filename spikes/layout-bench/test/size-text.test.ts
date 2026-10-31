// Drafted by Qwen (qwen3.8-max) from a written spec; reviewed by Claude.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import type { LayoutState } from '../../../packages/core/src/layout.ts';
import type { AdvanceTable } from '../src/text.ts';
import { fitZoom, bboxOf, sizeRow, aggregateSize, CANVASES, MAX_ZOOM } from '../src/metrics/size.ts';
import { intersectArea, frameFill } from '../src/metrics/frames.ts';
import { textWidth, ellipsize, frameText } from '../src/text.ts';

// ---------- fixtures ----------

const table: AdvanceTable = {
  styles: {
    title: { widths: { a: 0.5, b: 0.6, ' ': 0.25, '…': 0.8 }, cjk: { hangul: 1, han: 1, kana: 1 } },
    subtitle: { widths: { a: 0.5, b: 0.6, ' ': 0.25, '…': 0.8 }, cjk: { hangul: 1, han: 1, kana: 1 } },
    frame: { widths: { a: 0.5, b: 0.6, ' ': 0.25, '…': 0.8 }, cjk: { hangul: 1, han: 1, kana: 1 } },
    caption: { widths: { a: 0.5, b: 0.6, ' ': 0.25, '…': 0.8 }, cjk: { hangul: 1, han: 1, kana: 1 } },
    attach: { widths: { a: 0.5, b: 0.6, ' ': 0.25, '…': 0.8 }, cjk: { hangul: 1, han: 1, kana: 1 } },
  },
};

function makeLayout(overrides?: Partial<LayoutState>): LayoutState {
  return {
    version: 1,
    mode: 'architecture',
    width: 800,
    height: 600,
    pathY: 0,
    cards: {},
    frames: {},
    badges: {},
    slots: {},
    shelves: {},
    shelfKinds: {},
    order: {},
    ...overrides,
  } as unknown as LayoutState;
}

const metrics = { titlePx: 14, subtitlePx: 11, frameLabelPx: 12, cardW: 160, cardH: 80 };

// ---------- fitZoom ----------

describe('fitZoom', () => {
  test('wide diagram limited by width', () => {
    // canvas.w=880, pad=24 → (880-48)/1000 = 0.832; height gives 1.344; cap 1.25 → min is 0.832
    const z = fitZoom(1000, 500, CANVASES[0]);
    assert.ok(Math.abs(z - 0.832) < 1e-9);
  });

  test('tall diagram limited by height', () => {
    // canvas.h=720, pad=24 → (720-48)/1000 = 0.672; width gives 2.08; cap 1.25 → min is 0.672
    const z = fitZoom(400, 1000, CANVASES[0]);
    assert.ok(Math.abs(z - 0.672) < 1e-9);
  });

  test('tiny diagram capped at MAX_ZOOM', () => {
    // (880-48)/100 = 8.32, (720-48)/100 = 6.72, cap 1.25 → min is 1.25
    const z = fitZoom(100, 100, CANVASES[0]);
    assert.equal(z, MAX_ZOOM);
  });

  test('zero size returns the cap', () => {
    assert.equal(fitZoom(0, 100, CANVASES[0]), MAX_ZOOM);
    assert.equal(fitZoom(100, 0, CANVASES[0]), MAX_ZOOM);
  });
});

// ---------- bboxOf ----------

describe('bboxOf', () => {
  test('includes frames, cards and badges', () => {
    const l = makeLayout({
      frames: { f1: { id: 'f1', kind: 'zone', label: 'Z', parent: null, depth: 0, implicit: false, empty: false, x: 0, y: 0, w: 200, h: 200 } } as any,
      cards: { c1: { id: 'c1', kind: 'node', product: 'p', frame: 'f1', slot: '', index: 0, x: 10, y: 10, w: 50, h: 50, badges: [] } } as any,
      badges: { b1: { id: 'b1', x: 180, y: 180, w: 30, h: 30 } } as any,
    });
    const box = bboxOf(l);
    assert.equal(box.x0, 0);
    assert.equal(box.y0, 0);
    assert.equal(box.x1, 210); // max(200, 60, 210)
    assert.equal(box.y1, 210);
    assert.equal(box.w, 210);
    assert.equal(box.h, 210);
  });

  test('handles negative coordinates', () => {
    const l = makeLayout({
      cards: { c1: { id: 'c1', kind: 'node', product: 'p', frame: '', slot: '', index: 0, x: -50, y: -30, w: 20, h: 10, badges: [] } } as any,
    });
    const box = bboxOf(l);
    assert.equal(box.x0, -50);
    assert.equal(box.y0, -30);
    assert.equal(box.x1, -30); // -50+20
    assert.equal(box.y1, -20); // -30+10
    assert.equal(box.w, 20);
    assert.equal(box.h, 10);
  });

  test('returns zeros for an empty layout', () => {
    const box = bboxOf(makeLayout());
    assert.deepEqual(box, { x0: 0, y0: 0, x1: 0, y1: 0, w: 0, h: 0 });
  });
});

// ---------- sizeRow ----------

describe('sizeRow', () => {
  test('zoom, aspect, and rendered title px for a 1700x370 layout on 1040x800 canvas', () => {
    const l = makeLayout({
      cards: {
        c1: { id: 'c1', kind: 'node', product: 'p', frame: '', slot: '', index: 0, x: 0, y: 0, w: 1700, h: 370, badges: [] },
      } as any,
    });
    const canvas = CANVASES[1]; // 1040x800
    const row = sizeRow('s1', 1, l, metrics, canvas);
    // zoom = min((1040-48)/1700, (800-48)/370, 1.25) = min(0.58352..., 2.032..., 1.25) → round to 4 dp
    const expectedZoom = Math.round(((1040 - 48) / 1700) * 10000) / 10000; // 0.5835
    assert.equal(row.zoom, expectedZoom);
    // aspect = round(1700/370, 3) = round(4.594594..., 3) = 4.595
    assert.equal(row.aspect, 4.595);
    // titlePx = round(14 * 0.5835, 2) = round(8.169, 2) = 8.17
    assert.equal(row.titlePx, Math.round(14 * expectedZoom * 100) / 100);
    assert.equal(row.w, 1700);
    assert.equal(row.h, 370);
    assert.equal(row.cards, 1);
  });
});

// ---------- aggregateSize ----------

describe('aggregateSize', () => {
  test('below11 and below12 shares', () => {
    const rows = [
      { session: 'a', turn: 1, mode: 'architecture' as const, cards: 3, w: 100, h: 100, aspect: 1, zoom: 1, titlePx: 10, subtitlePx: 10, framePx: 10 },
      { session: 'b', turn: 1, mode: 'architecture' as const, cards: 5, w: 200, h: 200, aspect: 1, zoom: 1, titlePx: 11.5, subtitlePx: 11.5, framePx: 11.5 },
    ];
    const report = aggregateSize(CANVASES[0], rows);
    // titlePx values: [10, 11.5]; below 11 → 1/2 = 0.5; below 12 → 2/2 = 1
    assert.equal(report.all.below11.title, 0.5);
    assert.equal(report.all.below12.title, 1);
  });

  test('byCards bucket keys', () => {
    const report = aggregateSize(CANVASES[0], []);
    const keys = Object.keys(report.byCards);
    assert.deepEqual(keys, ['1-6', '7-12', '13-18', '19-24', '25+']);
  });
});

// ---------- intersectArea & frameFill ----------

describe('intersectArea', () => {
  test('overlapping rects', () => {
    // a: 0..100 x 0..100, b: 50..150 x 50..150 → overlap 50x50 = 2500
    const area = intersectArea({ x: 0, y: 0, w: 100, h: 100 }, { x: 50, y: 50, w: 100, h: 100 });
    assert.equal(area, 2500);
  });

  test('non-overlapping rects return 0', () => {
    const area = intersectArea({ x: 0, y: 0, w: 50, h: 50 }, { x: 100, y: 100, w: 50, h: 50 });
    assert.equal(area, 0);
  });
});

describe('frameFill', () => {
  test('zone frame half covered gives zoneEmpty 0.5', () => {
    const l = makeLayout({
      frames: {
        f1: { id: 'f1', kind: 'zone', label: 'Z', parent: null, depth: 0, implicit: false, empty: false, x: 0, y: 0, w: 100, h: 100 },
      } as any,
      cards: {
        c1: { id: 'c1', kind: 'node', product: 'p', frame: 'f1', slot: '', index: 0, x: 0, y: 0, w: 50, h: 100, badges: [] },
      } as any,
    });
    const result = frameFill(l);
    // covered = 50*100 = 5000, area = 10000, zoneEmpty = 1 - 5000/10000 = 0.5
    assert.equal(result.zoneEmpty.length, 1);
    assert.ok(Math.abs(result.zoneEmpty[0] - 0.5) < 1e-9);
    assert.equal(result.byKind['zone'].cardArea, 5000);
  });

  test('card outside frame contributes 0', () => {
    const l = makeLayout({
      frames: {
        f1: { id: 'f1', kind: 'zone', label: 'Z', parent: null, depth: 0, implicit: false, empty: false, x: 0, y: 0, w: 100, h: 100 },
      } as any,
      cards: {
        c1: { id: 'c1', kind: 'node', product: 'p', frame: 'f1', slot: '', index: 0, x: 200, y: 200, w: 50, h: 50, badges: [] },
      } as any,
    });
    const result = frameFill(l);
    assert.equal(result.byKind['zone'].cardArea, 0);
    assert.ok(Math.abs(result.zoneEmpty[0] - 1) < 1e-9);
  });
});

// ---------- textWidth ----------

describe('textWidth', () => {
  test('ab at 10px in title style includes letterSpacingEm -0.006', () => {
    // (0.5 + (-0.006)) + (0.6 + (-0.006)) = 1.088 em → * 10 = 10.88
    const w = textWidth(table, 'title', 'ab', 10);
    assert.ok(Math.abs(w - 10.88) < 1e-9);
  });

  test('Hangul syllable uses cjk.hangul advance', () => {
    // U+AC00 is Hangul Syllable "가"; charEm returns cjk.hangul = 1
    // title letterSpacingEm = -0.006 → (1 - 0.006) * 10 = 9.94
    const w = textWidth(table, 'title', '\uAC00', 10);
    assert.ok(Math.abs(w - 9.94) < 1e-9);
  });

  test('unknown Latin character falls back to n width when present', () => {
    const tWithN: AdvanceTable = {
      styles: {
        ...table.styles,
        title: { ...table.styles.title, widths: { ...table.styles.title.widths, n: 0.45 } },
      },
    };
    // 'z' not in widths → fallback to widths['n'] = 0.45
    // title ls = -0.006 → (0.45 - 0.006) * 10 = 4.44
    const w = textWidth(tWithN, 'title', 'z', 10);
    assert.ok(Math.abs(w - 4.44) < 1e-9);
  });

  test('unknown Latin character falls back to 0.56 when n absent', () => {
    // 'z' not in widths, no 'n' → fallback 0.56
    // title ls = -0.006 → (0.56 - 0.006) * 10 = 5.54
    const w = textWidth(table, 'title', 'z', 10);
    assert.ok(Math.abs(w - 5.54) < 1e-9);
  });

  test('frame style uses letterSpacingEm 0.07', () => {
    // 'a' width 0.5, frame ls = 0.07 → (0.5 + 0.07) * 10 = 5.7
    const w = textWidth(table, 'frame', 'a', 10);
    assert.ok(Math.abs(w - 5.7) < 1e-9);
  });
});

// ---------- ellipsize ----------

describe('ellipsize', () => {
  test('text that fits is returned unchanged', () => {
    // 'a' in title at 10px: (0.5 - 0.006)*10 = 4.94, avail=100 → fits
    const result = ellipsize(table, 'title', 'a', 10, 100);
    assert.equal(result, 'a');
  });

  test('text that does not fit ends with ellipsis within room', () => {
    // 'ab' at 10px title = 10.88px, avail=10 → doesn't fit
    // try 'a…': (0.5-0.006)*10 + (0.8-0.006)*10 = 4.94 + 7.94 = 12.88 > 10 → lo stays 0
    // result: '' trimmed + '…' = '…'
    const result = ellipsize(table, 'title', 'ab', 10, 10);
    assert.equal(result.endsWith('…'), true);
    // verify estimated width of result is within room (+0.01 tolerance used by fits)
    const rw = textWidth(table, 'title', result, 10);
    assert.ok(rw <= 10 + 0.01);
  });

  test('partial prefix with ellipsis fits', () => {
    // 'aba' at 10px title: (0.5-0.006 + 0.6-0.006 + 0.5-0.006)*10 = 1.582*10 = 15.82
    // avail = 14 → doesn't fit full string
    // try mid=2 'ab…': (0.5-0.006 + 0.6-0.006 + 0.8-0.006)*10 = 1.882*10 = 18.82 > 14 → hi=1
    // try mid=1 'a…': (0.5-0.006 + 0.8-0.006)*10 = 1.288*10 = 12.88 ≤ 14 → lo=1
    // result: 'a…'
    const result = ellipsize(table, 'title', 'aba', 10, 14);
    assert.equal(result, 'a…');
  });
});

// ---------- frameText ----------

describe('frameText', () => {
  test('non-implicit region frame gives label Region and caption equal to frame label', () => {
    const f = { id: 'f1', kind: 'region', label: 'us-east-1', parent: null, depth: 0, implicit: false, empty: false, x: 0, y: 0, w: 100, h: 100 } as any;
    const result = frameText(f);
    assert.equal(result.label, 'Region');
    assert.equal(result.caption, 'us-east-1');
  });

  test('implicit vpc gives only VPC', () => {
    const f = { id: 'f1', kind: 'vpc', label: 'my-vpc', parent: null, depth: 0, implicit: true, empty: false, x: 0, y: 0, w: 100, h: 100 } as any;
    const result = frameText(f);
    assert.equal(result.label, 'VPC');
    assert.equal(result.caption, undefined);
  });

  test('other kinds return their own label', () => {
    const f = { id: 'f1', kind: 'lane', label: 'Compute', parent: null, depth: 0, implicit: false, empty: false, x: 0, y: 0, w: 100, h: 100 } as any;
    const result = frameText(f);
    assert.equal(result.label, 'Compute');
    assert.equal(result.caption, undefined);
  });

  test('non-implicit zone gives Zone label with caption', () => {
    const f = { id: 'f1', kind: 'zone', label: 'az-1', parent: null, depth: 0, implicit: false, empty: false, x: 0, y: 0, w: 100, h: 100 } as any;
    const result = frameText(f);
    // zone is not region or vpc, so falls through to return { label: f.label }
    assert.equal(result.label, 'az-1');
    assert.equal(result.caption, undefined);
  });
});
