import { WorkflowSettings } from './WorkflowSettings.tsx';
import { useWorkflowProps } from '../workflow/props.ts';
// The working view's header (48 px): the lockup (a link to the landing), the session title, and the controls.
import type { ReactElement } from 'react';
import { BrandMark } from '../brand/BrandMark.tsx';
import { ExportButton } from '../export/ExportButton.tsx';
import { Icon } from './Icon.tsx';
import { LanguageMenu, ModeState, SessionsMenu, ThemeMenu } from './controls.tsx';
import { AccountMenu } from './AccountMenu.tsx';
import { useAppState, useController, useT } from '../store/react.tsx';
import { isStreaming } from '../store/selectors.ts';
import type { AppState } from '../store/types.ts';

const selTitle = (s: AppState) => s.session.title;
const selFocus = (s: AppState) => s.ui.focusDiagram;

export function Header(): ReactElement {
  const { lang, t } = useT();
  const c = useController();
  const title = useAppState(selTitle);
  const focus = useAppState(selFocus);
  const streaming = useAppState(isStreaming);
  const mode = useAppState((s) => s.session.mode ?? 'cloud');
  const workflow = useWorkflowProps();
  const canvasGraph = useAppState((s) => s.display.graph);
  const hasWorkflow = Object.keys(workflow.workflow.nodes).length > 0;
  const hasCloud = Object.keys(canvasGraph.nodes).length > 0 || canvasGraph.recs.length > 0;
  const showWorkflow = mode === 'workflow' || hasWorkflow;
  const showCloud = mode === 'cloud' || hasCloud;
  return (
    <header className="header">
      <BrandMark lang={lang} name={t('app.name')} size="header" onHome={() => c.newSession()} homeLabel={t('header.home')} homeDisabled={streaming} />
      <p className="header__title" title={title || undefined}>
        {title || t('header.untitled')}
      </p>
      <div className="header__right">
        <ModeState />
        {showWorkflow && <label className="workflow-diagrams">
          <span className="visually-hidden">{t('focus.label')}</span>
          <select aria-label={t('focus.label')} value={mode} onChange={(e) => c.setMode(e.target.value as 'cloud' | 'workflow')}>
            <option value="workflow">{t('focus.workflow')}</option>
            {showCloud && <option value="cloud">{t('focus.cloud')}</option>}
          </select>
        </label>}
        <button type="button" className="btn btn--ghost" aria-pressed={focus} onClick={() => c.setFocusDiagram(!focus)}>
          <Icon name={focus ? 'showConsole' : 'focusDiagram'} />
          <span>{focus ? t('header.showConsole') : t('header.focusDiagram')}</span>
        </button>
        <ExportButton />
        <SessionsMenu />
        <button type="button" className="btn btn--ghost" onClick={() => c.newSession()} disabled={streaming}>
          <Icon name="plus" />
          <span>{t('header.newSession')}</span>
        </button>
        <LanguageMenu />
        <ThemeMenu />
        <AccountMenu />
      </div>
      {mode === 'workflow' && <WorkflowSettings {...workflow} />}
    </header>
  );
}
