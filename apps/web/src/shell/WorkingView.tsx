import { useWorkflowProps } from '../workflow/props.ts';
import { WorkflowPanel } from '../panel/WorkflowPanel.tsx';
// The working view: header, console on the left, the stage on the right (canvas, with the products bar and panel under
// it). The builders' components get their props from the store through the hooks in app/props.ts.
import { useEffect } from 'react';
import type { ReactElement } from 'react';
import { Header } from './Header.tsx';
import { Console } from '../console/index.tsx';
import { Canvas } from '../canvas/index.tsx';
import { Panel } from '../panel/index.tsx';
import { PricingStage } from '../pricing/PricingStage.tsx';
import { useCanvasProps, useConsoleProps, usePanelProps } from '../app/props.ts';
import { useAppState, useController, useT } from '../store/react.tsx';
import { playHandoff } from './handoff.ts';
import type { AppState } from '../store/types.ts';

const selFocus = (s: AppState) => s.ui.focusDiagram;
const selHandoff = (s: AppState) => s.ui.handoff;
const selOpen = (s: AppState) => s.ui.panelOpen;
const selLive = (s: AppState) => s.ui.live;

export function WorkingView(): ReactElement {
  const { t } = useT();
  const c = useController();
  const focus = useAppState(selFocus);
  const handoff = useAppState(selHandoff);
  const open = useAppState(selOpen);
  const live = useAppState(selLive);
  const consoleProps = useConsoleProps();
  const canvasProps = useCanvasProps();
  const panelProps = usePanelProps();
  const workflowProps = useWorkflowProps();
  const mode = useAppState((s) => s.session.mode ?? 'cloud');
  const sessionId = useAppState((s) => s.session.id);
  const pricingOpen = useAppState((s) => !!s.session.pricingOpen);
  const hasPricing = useAppState((s) => !!(s.session.pricingOpen || s.session.pricingPending || s.session.pricing));

  // the landing box travels to the composer once the console has mounted
  useEffect(() => {
    if (!handoff) return;
    const played = playHandoff(() => c.endHandoff());
    if (!played) c.endHandoff();
  }, [handoff, c]);

  // After the handoff, focus lands in the composer.
  useEffect(() => {
    if (handoff) return;
    const composer = document.querySelector<HTMLElement>('.console [data-flip="composer"] textarea');
    if (composer && document.activeElement === document.body) composer.focus();
  }, [handoff]);

  return (
    <div className="app app--working" data-view={mode} data-focus={focus || undefined} data-panel-open={open || undefined}>
      <a className="skip" href={pricingOpen ? '#pricing-reply' : '#composer'} onClick={(e) => { e.preventDefault(); document.querySelector<HTMLElement>(pricingOpen ? '#pricing-reply' : '.console [data-flip="composer"] textarea')?.focus(); }}>
        {t('skip.toComposer')}
      </a>
      <a className="skip" href={pricingOpen ? '#estimate' : '#diagram'} onClick={(e) => { e.preventDefault(); document.getElementById(pricingOpen ? 'estimate' : 'diagram')?.focus(); }}>
        {t(pricingOpen ? 'pricing.skip' : 'skip.toDiagram')}
      </a>
      <Header />
      <div className="work" hidden={pricingOpen}>
        <div className="work__console" hidden={focus}>
          <Console {...consoleProps} />
        </div>
        <div key={sessionId} className="stage" data-enter={handoff || undefined}>
          <main id="diagram" className="stage__canvas" tabIndex={-1} aria-label={t(mode === 'workflow' ? 'workflow.canvas.label' : 'canvas.label')}>
            <Canvas key={mode} {...(mode === 'workflow' ? workflowProps : canvasProps)} />
          </main>
          <div className="stage__panel">
            {mode === 'workflow' ? <WorkflowPanel {...workflowProps} /> : <Panel {...panelProps} />}
          </div>
        </div>
      </div>
      {hasPricing && <PricingStage key={sessionId} open={pricingOpen} />}
      <p className="visually-hidden" role="status" aria-live="polite">
        <span key={live?.seq}>{live?.text}</span>
      </p>
    </div>
  );
}
