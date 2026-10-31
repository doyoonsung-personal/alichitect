// Replay app shell: toolbar, canvas, metrics overlay and the "why" popover. URL parameters (scenario, theme, speed,
// router, capture) let the headless measurement script drive it; window.__replay exposes progress and metrics.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { JSX } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Canvas, MOVE_MS } from './canvas/Canvas.tsx';
import type { RoutedFrame, ViewFrame } from './canvas/Canvas.tsx';
import { HoverContext } from './canvas/hover.ts';
import type { HoverApi } from './canvas/hover.ts';
import { Toolbar } from './ui/Toolbar.tsx';
import type { RouterChoice, Speed, ThemeChoice, ToolbarStatus } from './ui/Toolbar.tsx';
import { MetricsOverlay } from './ui/MetricsOverlay.tsx';
import type { MetricsSnapshot } from './ui/MetricsOverlay.tsx';
import { Popover } from './ui/Popover.tsx';
import { catalog, data } from './data.ts';
import { SCENARIOS } from './replay/scenarios.ts';
import { play } from './replay/player.ts';
import type { BatchMetric } from './replay/player.ts';
import { createAvoidRouter, createChannelRouter } from './routing/routers.ts';

interface ReplayWindow {
  __replay?: { done: boolean; error: string | null; metrics: Record<string, unknown> };
}
const w = window as unknown as ReplayWindow;

const params = new URLSearchParams(location.search);
const pick = <T extends string>(k: string, allowed: readonly T[], dflt: T): T => {
  const v = params.get(k) as T | null;
  return v && allowed.includes(v) ? v : dflt;
};

const LANE_TITLE: Record<string, string> = {
  clients: 'Clients', onprem: 'On-premises', thirdparty: 'Third party', dns: 'DNS', edge: 'Edge', ingress: 'Ingress', compute: 'Compute',
  middleware: 'Messaging', cache: 'Cache', database: 'Database', search: 'Search', filestore: 'File storage', boundary: 'VPC boundary',
  storage: 'Storage', ai: 'AI', analytics: 'Analytics', integration: 'Integration', ops: 'Operations', security: 'Security', network: 'Network',
  governance: 'Governance', saas: 'SaaS',
};
const SCOPE_TITLE: Record<string, string> = { external: 'Outside the cloud', global: 'Global', edge: 'Edge network', region: 'Regional service', vpc: 'Inside the VPC', 'vpc-edge': 'VPC boundary', account: 'Account level', saas: 'Bought per seat' };

function fpsStats(samples: number[]): { mean: number; p5: number; min: number } {
  if (!samples.length) return { mean: 0, p5: 0, min: 0 };
  const s = [...samples].sort((a, b) => a - b);
  return { mean: +(s.reduce((a, b) => a + b, 0) / s.length).toFixed(1), p5: +s[Math.floor(s.length * 0.05)].toFixed(1), min: +s[0].toFixed(1) };
}

export function App(): JSX.Element {
  const capture = params.get('capture') === '1';
  const [scenario, setScenario] = useState(() => pick('scenario', SCENARIOS.map((s) => s.id), 'a'));
  const [speed, setSpeed] = useState<Speed>(() => pick('speed', ['1x', '4x', 'instant'] as const, '1x'));
  const [router, setRouter] = useState<RouterChoice>(() => pick('router', ['libavoid', 'channel'] as const, 'libavoid'));
  const [theme, setTheme] = useState<ThemeChoice>(() => pick('theme', ['light', 'dark'] as const, matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  const [run, setRun] = useState(0);
  const [frame, setFrame] = useState<ViewFrame | null>(null);
  const [routed, setRouted] = useState<RoutedFrame | null>(null);
  const [status, setStatus] = useState<ToolbarStatus>({ state: 'idle', ops: 0, totalOps: 0, say: '' });
  const [snap, setSnap] = useState<MetricsSnapshot>({ fps: 0, layoutMs: 0, routeMs: 0, router, lastMoved: 0, maxMoved: 0, batches: 0, nodes: 0, edges: 0, intersections: 0, crossings: 0 });
  const [collapsed, setCollapsed] = useState(false);
  const [hover, setHover] = useState<{ id: string; rect: DOMRect } | null>(null);
  const batches = useRef<BatchMetric[]>([]);
  const fps = useRef<{ samples: number[]; long: number; frames: number }>({ samples: [], long: 0, frames: 0 });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // fps meter: frame count per 500 ms window while a replay streams
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let winStart = last;
    let winFrames = 0;
    const loop = (t: number): void => {
      const dt = t - last;
      last = t;
      fps.current.frames++;
      if (dt > 50) fps.current.long++;
      winFrames++;
      if (t - winStart >= 500) {
        const v = (winFrames * 1000) / (t - winStart);
        fps.current.samples.push(v);
        setSnap((s) => ({ ...s, fps: v }));
        winStart = t;
        winFrames = 0;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const r = router === 'libavoid' ? createAvoidRouter() : createChannelRouter();
    batches.current = [];
    fps.current = { samples: [], long: 0, frames: 0 };
    w.__replay = { done: false, error: null, metrics: {} };
    setFrame(null);
    setRouted(null);
    setHover(null);
    setSnap((s) => ({ ...s, router, lastMoved: 0, maxMoved: 0, batches: 0 }));
    const started = performance.now();
    const stop = play(
      { scenario, speed, router: r, catalog, data, moveMs: MOVE_MS },
      {
        onFrame: (f) => setFrame(f),
        onRoutes: (rt) => setRouted(rt),
        onStatus: (st) => setStatus(st),
        onBatch: (m) => {
          batches.current.push(m);
          setSnap((s) => ({
            ...s,
            layoutMs: m.layoutMs,
            routeMs: m.routeMs ?? s.routeMs,
            lastMoved: m.moved,
            maxMoved: Math.max(s.maxMoved, m.moved),
            batches: batches.current.length,
            nodes: m.cards,
            edges: m.routes ?? s.edges,
            intersections: m.intersections ?? s.intersections,
            crossings: m.crossings ?? s.crossings,
          }));
        },
        onDone: ({ final, routerFailed }) => {
          const bs = batches.current;
          const live = bs.filter((b) => b.i > 0 || speed === 'instant');
          const num = (xs: Array<number | undefined>): number[] => xs.filter((x): x is number => typeof x === 'number');
          const mean = (xs: number[]): number => (xs.length ? +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(3) : 0);
          const max = (xs: number[]): number => (xs.length ? +Math.max(...xs).toFixed(3) : 0);
          w.__replay = {
            done: true,
            error: w.__replay?.error ?? null,
            metrics: {
              scenario,
              router,
              speed,
              wallMs: Math.round(performance.now() - started),
              batches: bs,
              fps: { ...fpsStats(fps.current.samples), samples: fps.current.samples.map((x) => +x.toFixed(1)), longFrames: fps.current.long, frames: fps.current.frames },
              stability: {
                totalMoved: live.reduce((a, b) => a + b.moved, 0),
                maxMovedPerBatch: max(live.map((b) => b.moved)),
                unrelatedTotal: live.reduce((a, b) => a + b.unrelated, 0),
                maxMovedUnrelated: max(live.map((b) => b.unrelated)),
                held: live.reduce((a, b) => a + b.held, 0),
              },
              layout: { meanMs: mean(live.map((b) => b.layoutMs)), maxMs: max(live.map((b) => b.layoutMs)) },
              route: { meanMs: mean(num(bs.map((b) => b.routeMs))), maxMs: max(num(bs.map((b) => b.routeMs))), meanRoundTripMs: mean(num(bs.map((b) => b.routeRoundTripMs))), maxRoundTripMs: max(num(bs.map((b) => b.routeRoundTripMs))) },
              final: { ...final, routerFailedTotal: routerFailed },
            },
          };
        },
        onError: (msg) => {
          if (w.__replay) w.__replay.error = msg;
          console.error(msg);
        },
      },
    );
    return () => {
      stop();
      r.dispose?.();
    };
  }, [scenario, speed, router, run]);

  const hoverApi = useMemo<HoverApi>(
    () => ({
      current: hover?.id ?? null,
      show: (id, rect) => setHover({ id, rect }),
      hide: (id) => setHover((h) => (h && h.id === id ? null : h)),
    }),
    [hover?.id],
  );

  const pop = useMemo(() => {
    if (!hover || !frame) return null;
    const id = hover.id;
    const isRec = id.startsWith('rec:');
    const product = isRec ? id.slice(4) : frame.display.nodes[id]?.product;
    if (!product) return null;
    const e = catalog.byId.get(product) ?? catalog.resolve(product).entry;
    const node = isRec ? undefined : frame.display.nodes[id];
    const rec = isRec ? frame.display.recs.find((r) => r.product === product) : undefined;
    const card = frame.layout.cards[id];
    const meta: string[] = [];
    if (e) meta.push(`${SCOPE_TITLE[e.scope] ?? e.scope} · ${LANE_TITLE[e.lane] ?? e.lane}`);
    if (card?.zones && card.zones.length > 1) meta.push(`Zones ${card.zones.map((z) => z.toUpperCase()).join(' · ')}`);
    if (node?.attachTo && frame.display.nodes[node.attachTo]) meta.push(`On ${frame.display.nodes[node.attachTo].label}`);
    if (rec) meta.push(rec.fit === 'primary' ? 'Primary pick' : 'Complement');
    if (e && e.status !== 'ga') meta.push(e.status === 'preview' ? 'Preview' : e.status);
    if (e?.price) meta.push(`${e.price.summary.split(';')[0]} (as of ${e.price.asOf})`);
    return { title: e?.name ?? product, label: node?.label ?? rec?.product ?? product, why: node?.why ?? rec?.why, purpose: e?.purpose ?? '', meta, note: e?.note };
  }, [hover, frame]);

  const hot = hover?.id ?? null;
  const onTheme = useCallback((t: ThemeChoice) => setTheme(t), []);
  const def = SCENARIOS.find((s) => s.id === scenario)!;

  return (
    <HoverContext.Provider value={hoverApi}>
      <div className="app" data-capture={capture ? 'true' : undefined}>
        <Toolbar
          scenarios={SCENARIOS.map((s) => ({ id: s.id, title: s.title, subtitle: s.subtitle }))}
          scenario={scenario}
          onScenario={(id) => setScenario(id)}
          speed={speed}
          onSpeed={setSpeed}
          router={router}
          onRouter={setRouter}
          theme={theme}
          onTheme={onTheme}
          onReplay={() => setRun((n) => n + 1)}
          status={status}
        />
        <main className="stage">
          <p className="ask">
            <span className="ask-k">Asked</span> {def.ask}
          </p>
          <ReactFlowProvider>
            <Canvas frame={frame} routed={routed} catalog={catalog} hot={hot} capture={capture} />
          </ReactFlowProvider>
          {!capture && <MetricsOverlay m={snap} collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />}
        </main>
        {pop && <Popover id="card-pop" open anchor={{ x: hover!.rect.x, y: hover!.rect.y, w: hover!.rect.width, h: hover!.rect.height }} {...pop} />}
      </div>
    </HoverContext.Provider>
  );
}
