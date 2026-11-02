// Fills the builders' props from the store (the shell uses these; the builders never import the store). Each hook reads
// state slices, which are stable references, and builds the prop object in a memo.
import { useMemo } from 'react';
import { useAppState, useCatalog, useController, useT } from '../store/react.tsx';
import { assumptionViews } from '../store/asks.ts';
import {
  activeDocument, activeNodeCount, activeHighlight, activePan, canExport, buildMarks, headerMode, isSolutionMap,
  isStreaming, productCount, requirements, summaryView, taggedRevision,
} from '../store/selectors.ts';
import { catalog as bundled } from '../catalog/catalog.ts';
import { DEFAULT_MAX_ASK_CHARS } from '@ali/core/prompt.ts';
import type { AppState } from '../store/types.ts';
import type { CanvasProps, ConsoleProps, PanelProps } from './contracts.ts';

const s = {
  session: (a: AppState) => a.session,
  work: (a: AppState) => a.work,
  turn: (a: AppState) => a.turn,
  conn: (a: AppState) => a.conn,
  replay: (a: AppState) => a.replay,
  ui: (a: AppState) => a.ui,
  display: (a: AppState) => a.display,
  streaming: isStreaming,
};

export function useConsoleProps(): ConsoleProps {
  const catalog = useCatalog();
  const { lang, t } = useT();
  const c = useController();
  const session = useAppState(s.session);
  const work = useAppState(s.work);
  const turn = useAppState(s.turn);
  const conn = useAppState(s.conn);
  const replay = useAppState(s.replay);
  const ui = useAppState(s.ui);
  const mode = useAppState(headerMode);
  const actions = useMemo<ConsoleProps['actions']>(
    () => ({
      submit: (ask) => c.submit(ask),
      stop: c.stop,
      retry: c.retry,
      editAndResend: c.editAndResend,
      unpin: c.unpin,
      undoUnpin: c.undoUnpin,
      clearToast: c.clearToast,
      draftTaken: c.draftTaken,
      highlight: c.highlight,
      panTo: c.panTo,
      checkHealth: c.checkHealth,
      startReplay: () => void c.startReplay(lang === 'ko' ? 'korean' : lang === 'zh' ? 'chinese' : 'ecommerce'),
      restartReplay: c.restartReplay,
      exitReplay: c.exitReplay,
      setReplaySpeed: c.setReplaySpeed,
    }),
    [c, lang],
  );
  const requirementList = useMemo(() => requirements({ session, work } as AppState, catalog), [session, work, catalog]);
  const summary = useMemo(() => summaryView({ session } as AppState), [session]);
  const assumptions = useMemo(() => assumptionViews(session, work), [session, work]);
  const latest = session.revisions.length ? [...session.revisions].reverse().find((r) => r.status === 'done') : undefined;
  return useMemo<ConsoleProps>(
    () => ({
      lang,
      t,
      requirements: requirementList,
      assumptions,
      revisions: session.revisions,
      turn,
      streamingRevision: work ? work.n : null,
      summary,
      conn: mode,
      replay,
      askLimit: conn.health?.limits.askChars ?? DEFAULT_MAX_ASK_CHARS,
      draft: ui.composerDraft,
      toast: ui.toast,
      highlightedRevision: ui.highlight?.revision ?? null,
      latestCommitted: latest ? latest.n : null,
      reveal: ui.reveal,
      actions,
    }),
    [lang, t, requirementList, assumptions, session.revisions, turn, work, summary, mode, replay, conn.health, ui, latest, actions],
  );
}

export function useCanvasProps(): CanvasProps {
  const { lang, t } = useT();
  const c = useController();
  const catalog = useCatalog();
  const session = useAppState(s.session);
  const work = useAppState(s.work);
  const turn = useAppState(s.turn);
  const display = useAppState(s.display);
  const ui = useAppState(s.ui);
  const solution = useAppState(isSolutionMap);
  const streaming = useAppState(s.streaming);
  const building = useMemo(() => buildMarks({ work, display } as AppState), [work, display]);
  const tagged = useMemo(() => taggedRevision({ work, session } as AppState), [work, session]);
  const actions = useMemo<CanvasProps['actions']>(() => ({ setSize: c.setCanvasSize, highlight: c.highlight, hoverCard: c.hoverCard, revealRevision: c.revealRevision }), [c]);
  return useMemo<CanvasProps>(
    () => ({
      lang,
      t,
      catalog,
      display,
      mode: solution ? 'solution' : 'architecture',
      building,
      tagged,
      reading: streaming && !display.layout && session.revisions.length === 1 && turn.phase !== 'error',
      finishing: session.revisions.at(-1)?.finishing === true,
      blank: !streaming && !display.layout && (session.revisions.at(-1)?.status === 'failed' || session.revisions.at(-1)?.status === 'stopped'),
      streaming,
      highlight: activeHighlight({ session, ui } as AppState),
      panTo: activePan({ session, ui } as AppState),
      hoverCard: ui.hoverCard,
      provenance: session.provenance,
      focusDiagram: ui.focusDiagram,
      actions,
    }),
    [lang, t, catalog, display, solution, building, tagged, streaming, session, turn.phase, ui.highlight, ui.panTo, ui.hoverCard, ui.focusDiagram, actions],
  );
}

export function usePanelProps(): PanelProps {
  const { lang, t } = useT();
  const c = useController();
  const catalog = useCatalog();
  const session = useAppState(s.session);
  const display = useAppState(s.display);
  const conn = useAppState(s.conn);
  const ui = useAppState(s.ui);
  const solution = useAppState(isSolutionMap);
  const streaming = useAppState(s.streaming);
  const count = useAppState(productCount);
  const actions = useMemo<PanelProps['actions']>(() => ({ setOpen: c.setPanelOpen, highlight: c.highlight, panTo: c.panTo, revealRevision: c.revealRevision }), [c]);
  const latest = [...session.revisions].reverse().find((r) => r.status === 'done');
  return useMemo<PanelProps>(
    () => ({
      lang,
      t,
      catalog,
      open: ui.panelOpen,
      display,
      mode: solution ? 'solution' : 'architecture',
      count,
      revisions: session.revisions,
      provenance: session.provenance,
      latestCommitted: latest ? latest.n : null,
      highlight: activeHighlight({ session, ui } as AppState),
      catalogVersion: conn.health?.catalog.version ?? bundled.version,
      streaming,
      actions,
    }),
    [lang, t, catalog, ui.panelOpen, ui.highlight, display, solution, count, session, latest, conn.health, streaming, actions],
  );
}

/** State contract for the phase 5 header toggle and export entry point. */
export function useDocumentProps() {
  const c = useController();
  const mode = useAppState((a) => a.session.mode);
  const document = useAppState(activeDocument, (a, b) => a.view === b.view && a.graph === b.graph);
  const nodeCount = useAppState(activeNodeCount);
  const exportAvailable = useAppState(canExport);
  return { mode, document, nodeCount, exportAvailable, setMode: c.setMode };
}
