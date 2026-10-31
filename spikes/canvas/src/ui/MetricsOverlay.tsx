import type { JSX } from 'react';

export interface MetricsSnapshot {
  fps: number;
  layoutMs: number;
  routeMs: number;
  router: string;
  lastMoved: number;
  maxMoved: number;
  batches: number;
  nodes: number;
  edges: number;
  intersections: number;
  crossings: number;
}

export interface MetricsOverlayProps {
  m: MetricsSnapshot;
  collapsed: boolean;
  onToggle(): void;
}

export function MetricsOverlay(props: MetricsOverlayProps): JSX.Element {
  const { m, collapsed, onToggle } = props;

  return (
    <aside
      className="mx"
      aria-label="Replay metrics"
      data-collapsed={collapsed ? 'true' : 'false'}
    >
      <button
        type="button"
        className="mx-head"
        aria-expanded={!collapsed}
        onClick={onToggle}
      >
        <span>Metrics</span>
        <span className="mx-fps tnum">{Math.round(m.fps)} fps</span>
      </button>
      {!collapsed && (
        <dl className="mx-grid">
          <div className="mx-row">
            <dt>Layout</dt>
            <dd className="tnum">{m.layoutMs.toFixed(2)} ms</dd>
          </div>
          <div className="mx-row">
            <dt>Route</dt>
            <dd className="tnum">{m.routeMs.toFixed(1)} ms</dd>
          </div>
          <div className="mx-row">
            <dt>Router</dt>
            <dd className="tnum">{m.router}</dd>
          </div>
          <div className="mx-row">
            <dt>Moved, last batch</dt>
            <dd className="tnum">{m.lastMoved}</dd>
          </div>
          <div className="mx-row">
            <dt>Moved, max batch</dt>
            <dd className="tnum">{m.maxMoved}</dd>
          </div>
          <div className="mx-row">
            <dt>Batches</dt>
            <dd className="tnum">{m.batches}</dd>
          </div>
          <div className="mx-row">
            <dt>Cards / edges</dt>
            <dd className="tnum">
              {m.nodes} / {m.edges}
            </dd>
          </div>
          <div className="mx-row">
            <dt>Edge-card hits</dt>
            <dd className="tnum">{m.intersections}</dd>
          </div>
          <div className="mx-row">
            <dt>Crossings</dt>
            <dd className="tnum">{m.crossings}</dd>
          </div>
        </dl>
      )}
    </aside>
  );
}
