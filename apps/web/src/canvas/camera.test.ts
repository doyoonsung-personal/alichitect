import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GEOMETRY, fitCamera } from '@ali/core/layout.ts';
import { belowFloor, cameraOf, centerViewport, clampZoom, panExtent, revealViewport, stickyCamera, toScreen, unionRect, viewportOf, zoomAbout, zoomPercent, zoomStep, ZOOM_FLOOR, ZOOM_MAX, ZOOM_MIN } from './camera.ts';

const size = { w: 1040, h: 800 };

describe('camera conversions', () => {
  it('viewportOf and cameraOf are inverses', () => {
    const c = { x: -420, y: -306, zoom: 0.95 };
    const v = viewportOf(c);
    assert.ok(Math.abs(v.x - 420 * 0.95) < 1e-9);
    const back = cameraOf(v);
    assert.ok(Math.abs(back.x - c.x) < 1e-9 && Math.abs(back.y - c.y) < 1e-9 && back.zoom === c.zoom);
  });

  it('a viewport from core fitCamera puts the camera corner at the screen origin', () => {
    const layout = { version: 2, mode: 'architecture', width: 1044, height: 604, bounds: { x: -420, y: -306, w: 1044, h: 604 } } as Parameters<typeof fitCamera>[0];
    const cam = fitCamera(layout, size);
    const v = viewportOf(cam);
    const s = toScreen(v, { x: cam.x, y: cam.y, w: 10, h: 10 });
    assert.ok(Math.abs(s.x) < 1e-6 && Math.abs(s.y) < 1e-6);
  });

  it('stickyCamera feeds fitCamera so a held zoom does not pump', () => {
    const layout = { version: 2, mode: 'architecture', width: 1044, height: 604, bounds: { x: -420, y: -306, w: 1044, h: 604 } } as Parameters<typeof fitCamera>[0];
    const first = fitCamera(layout, size);
    const again = fitCamera(layout, size, stickyCamera(viewportOf(first)));
    assert.equal(again.zoom, first.zoom);
  });
});

describe('zoom', () => {
  it('the floor is the title floor over the title size', () => {
    assert.ok(Math.abs(ZOOM_FLOOR - GEOMETRY.titleFloorPx / GEOMETRY.titlePx) < 1e-9);
    assert.ok(Math.abs(ZOOM_FLOOR - 0.857) < 0.001);
  });

  it('clamps to 0.5 and the core maximum', () => {
    assert.equal(clampZoom(0.1), ZOOM_MIN);
    assert.equal(clampZoom(9), ZOOM_MAX);
    assert.equal(ZOOM_MAX, GEOMETRY.maxZoom);
  });

  it('steps 1.2x and clamps', () => {
    assert.ok(Math.abs(zoomStep(1, 1) - 1.2) < 1e-9);
    assert.equal(zoomStep(1.2, 1), ZOOM_MAX);
    assert.equal(zoomStep(0.5, -1), ZOOM_MIN);
  });

  it('snaps to the readable floor when a step would cross it', () => {
    assert.equal(zoomStep(0.95, -1), ZOOM_FLOOR);
    assert.equal(zoomStep(0.8, 1), ZOOM_FLOOR);
    // from the floor itself, a step out goes below it
    assert.ok(zoomStep(ZOOM_FLOOR, -1) < ZOOM_FLOOR);
  });

  it('belowFloor tolerates rounding', () => {
    assert.equal(belowFloor(ZOOM_FLOOR), false);
    assert.equal(belowFloor(ZOOM_FLOOR - 0.01), true);
    assert.equal(zoomPercent(0.835), '84%');
  });

  it('zoomAbout keeps the world point under the anchor', () => {
    const v = { x: 100, y: 50, zoom: 1 };
    const a = { x: 400, y: 300 };
    const w = { x: (a.x - v.x) / v.zoom, y: (a.y - v.y) / v.zoom };
    const z = zoomAbout(v, 1.25, a);
    assert.ok(Math.abs(w.x * z.zoom + z.x - a.x) < 1e-9);
    assert.ok(Math.abs(w.y * z.zoom + z.y - a.y) < 1e-9);
  });
});

describe('revealViewport', () => {
  const v = { x: 0, y: 0, zoom: 1 };
  it('returns null when the rectangle is visible', () => {
    assert.equal(revealViewport(v, size, { x: 200, y: 200, w: 168, h: 60 }), null);
  });
  it('pans the least distance to show a card on the right', () => {
    const r = revealViewport(v, size, { x: 1000, y: 200, w: 168, h: 60 }, 24);
    assert.ok(r);
    assert.equal(r.zoom, 1);
    assert.equal(r.y, 0);
    assert.equal(r.x, 1040 - 24 - 1168);
  });
  it('shows a card hidden under the open panel', () => {
    const r = revealViewport(v, size, { x: 200, y: 700, w: 168, h: 60 }, 24, 300);
    assert.ok(r);
    assert.ok(r.y < 0);
    assert.ok(700 + r.y + 60 <= 800 - 300 - 24 + 1e-9);
  });
  it('aligns a rectangle larger than the view to the top-left', () => {
    const r = revealViewport(v, size, { x: -50, y: -50, w: 2000, h: 2000 }, 24);
    assert.ok(r);
    assert.equal(r.x, 24 + 50);
    assert.equal(r.y, 24 + 50);
  });
});

describe('helpers', () => {
  it('centerViewport centres a rectangle in the visible area', () => {
    const r = { x: 100, y: 100, w: 200, h: 100 };
    const c = centerViewport({ x: 0, y: 0, zoom: 1 }, size, r, 200);
    const s = toScreen(c, r);
    assert.ok(Math.abs(s.x + s.w / 2 - size.w / 2) < 1e-9);
    assert.ok(Math.abs(s.y + s.h / 2 - (size.h - 200) / 2) < 1e-9);
  });
  it('unionRect covers every rectangle and is null for none', () => {
    assert.equal(unionRect([]), null);
    assert.deepEqual(unionRect([{ x: 0, y: 0, w: 10, h: 10 }, { x: 20, y: -5, w: 5, h: 5 }]), { x: 0, y: -5, w: 25, h: 15 });
  });
  it('panExtent leaves room around the fitted box', () => {
    assert.deepEqual(panExtent({ x: 0, y: 0, w: 100, h: 50 }, 10), [[-10, -10], [110, 60]]);
  });
});
