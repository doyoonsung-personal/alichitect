// Fit tool: uniform rescaling of glyph geometry must keep shapes intact and land them where the grid rules say.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitMap, glyphSource, mapPath, mapTree } from '../fit.ts';
import { nodeBBox, pathBBox } from '../bbox.ts';
import { sanitizeSvg } from '../sanitize.ts';

const double = { s: 2, tx: 10, ty: -10 };

test('absolute coordinates are scaled and translated; relative ones only scaled', () => {
  assert.equal(mapPath('M1 2L3 4H5V6Z', double), 'M12 -6L16 -2H20V2Z');
  assert.equal(mapPath('M1 2l3 4h5v6z', double), 'M12 -6l6 8h10v12z');
  // A leading m is absolute; an m after z is relative to the subpath start.
  assert.equal(mapPath('m1 2 3 4zm5 6', double), 'M12 -6l6 8zm10 12');
});

test('curves map every control point', () => {
  assert.equal(mapPath('M0 0C1 1 2 2 3 3S4 4 5 5Q6 6 7 7T8 8', double), 'M10 -10C12 -8 14 -6 16 -4S18 -2 20 0Q22 2 24 4T26 6');
});

test('arcs scale their radii and end point, and keep rotation and flags, even when flags are packed', () => {
  assert.equal(mapPath('M0 0A5 6 30 1 0 10 10', double), 'M10 -10A10 12 30 1 0 30 10');
  assert.equal(mapPath('M0 0a5 5 0 1110 0', double), 'M10 -10a10 10 0 1 1 20 0');
});

test('implicit repeats after M become explicit line commands', () => {
  assert.equal(mapPath('M0 0 1 1 2 2', { s: 1, tx: 0, ty: 0 }), 'M0 0L1 1L2 2');
  assert.equal(mapPath('M0 0m1 1 2 2', { s: 1, tx: 0, ty: 0 }), 'M0 0m1 1l2 2');
});

test('malformed path data is refused, not guessed', () => {
  assert.throws(() => mapPath('M0', double));
  assert.throws(() => mapPath('0 0', double));
  assert.throws(() => mapPath('M0 0A1 1 0 2 0 1 1', double));
});

test('shapes keep their geometry under the map, and transforms are refused', () => {
  const m = { s: 0.5, tx: 100, ty: 200 };
  assert.deepEqual(mapTree({ el: 'circle', a: { cx: '10', cy: '20', r: '8' } }, m).a, { cx: '105', cy: '210', r: '4' });
  assert.deepEqual(mapTree({ el: 'rect', a: { width: '10', height: '20', rx: '4' } }, m).a, { x: '100', y: '200', width: '5', height: '10', rx: '2' });
  assert.deepEqual(mapTree({ el: 'polygon', a: { points: '0,0 10 20' } }, m).a, { points: '100,200 105,210' });
  assert.throws(() => mapTree({ el: 'path', a: { d: 'M0 0', transform: 'scale(2)' } }, m));
});

test('fitMap centres the box and scales its larger side to the extent', () => {
  const d = 'M100 300H500V500H100Z';
  const m = fitMap(pathBBox(d)!, 800);
  const b = pathBBox(mapPath(d, m))!;
  assert.deepEqual([b.x0, b.y0, b.x1, b.y1].map(Math.round), [112, 312, 912, 712]);
});

test('a fitted glyph survives the sanitizer unchanged', () => {
  const src = '<svg viewBox="0 0 1024 1024"><path fill-rule="evenodd" d="M200 200h400v400H200zM300 300v200h200V300z"/><circle cx="700" cy="700" r="50"/></svg>';
  const { root } = sanitizeSvg(src);
  const m = fitMap(nodeBBox(root!)!, 860);
  const fitted = { el: 'svg' as const, a: { viewBox: '0 0 1024 1024' }, c: root!.c!.map((c) => mapTree(c, m)) };
  const again = sanitizeSvg(glyphSource(fitted));
  assert.deepEqual(again.dropped.filter((x) => x !== 'attr:svg@xmlns'), []);
  const b = nodeBBox(again.root!)!;
  assert.ok(Math.abs(b.x1 - b.x0 - 860) < 1 && Math.abs((b.x0 + b.x1) / 2 - 512) < 1, `${b.x0} ${b.x1}`);
});
