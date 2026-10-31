// The working view: header, console on the left, the stage on the right (canvas, with the products bar and panel under
// it). The builders' components get their props from the store through the hooks in app/props.ts.
import { useEffect } from 'react';
import type { ReactElement } from 'react';
import { Header } from './Header.tsx';
import { Console } from '../console/index.tsx';
import { Canvas } from '../canvas/index.tsx';
import { Panel } from '../panel/index.tsx';
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
    <div className="app app--working" data-focus={focus || undefined} data-panel-open={open || undefined}>
      <a className="skip" href="#composer" onClick={(e) => { e.preventDefault(); document.querySelector<HTMLElement>('.console [data-flip="composer"] textarea')?.focus(); }}>
        {t('skip.toComposer')}
      </a>
      <a className="skip" href="#diagram" onClick={(e) => { e.preventDefault(); document.getElementById('diagram')?.focus(); }}>
        {t('skip.toDiagram')}
      </a>
      <Header />
      <div className="work">
        <div className="work__console" hidden={focus}>
          <Console {...consoleProps} />
        </div>
        <div className="stage" data-enter={handoff || undefined}>
          <main id="diagram" className="stage__canvas" tabIndex={-1} aria-label={t('canvas.label')}>
            <Canvas {...canvasProps} />
          </main>
          <div className="stage__panel">
            <Panel {...panelProps} />
          </div>
        </div>
      </div>
      <p className="visually-hidden" role="status" aria-live="polite">
        {live?.text}
      </p>
    </div>
  );
}
