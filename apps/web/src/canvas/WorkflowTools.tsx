import type { WorkflowLayout } from '../workflow/layout-adapter.ts';
import { overviewColumns, overviewViewport } from '../workflow/camera.ts';
import type { Viewport } from '../workflow/camera.ts';
import type { TFn } from '../i18n/t.ts';
export function WorkflowTools(p: {
  layout: WorkflowLayout; viewport: Viewport; size: { width: number; height: number }; t: TFn;
  following: boolean; disabled: boolean; resume(): void; tidy(): void; fit(): void; zoom(delta: number): void;
  navigate(x: number, y: number): void;
}) {
  const columns = overviewColumns(p.layout), b = p.layout.bounds, v = overviewViewport(p.viewport, p.size);
  return <div className="wf-tools">
    <div className="wf-tools__row">
      <button onClick={p.fit}>{p.t('canvas.fit')}</button>
      <button aria-label={p.t('canvas.zoomOut')} onClick={() => p.zoom(-0.1)}>−</button>
      <button aria-label={p.t('canvas.zoomIn')} onClick={() => p.zoom(0.1)}>+</button>
      <button aria-pressed={p.following} onClick={p.resume}>{p.t(p.following ? 'workflow.canvas.follow' : 'workflow.canvas.resume')}</button>
      <button disabled={p.disabled} onClick={p.tidy}>{p.t('workflow.canvas.tidy')}</button>
    </div>
    <div className="wf-overview" aria-label={p.t('workflow.canvas.overview')}>
      <svg viewBox={'0 0 ' + Math.max(1, b.w) + ' ' + Math.max(1, b.h)} preserveAspectRatio="none"
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId);
          const r = e.currentTarget.getBoundingClientRect(); p.navigate((e.clientX - r.x) / r.width * b.w, (e.clientY - r.y) / r.height * b.h); }}
        onPointerMove={(e) => { if (!e.buttons) return; const r = e.currentTarget.getBoundingClientRect();
          p.navigate((e.clientX - r.x) / r.width * b.w, (e.clientY - r.y) / r.height * b.h); }}>
        {Object.values(p.layout.cards).map((c) => <rect key={c.id} x={c.x} y={c.y} width={c.w} height={c.h} fill="currentColor" opacity=".3" />)}
        <rect x={v.x} y={v.y} width={v.w} height={v.h} fill="none" stroke="currentColor" strokeWidth="3" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="wf-overview__columns">{columns.map((col) =>
        <button key={col} aria-label={p.t('workflow.canvas.column', { n: col + 1 })}
          onClick={() => p.navigate(col * (b.w / Math.max(1, columns.at(-1)! + 1)), 0)}>{col + 1}</button>)}</div>
    </div>
  </div>;
}
