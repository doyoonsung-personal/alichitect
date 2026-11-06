import { WorkflowSettings } from './WorkflowSettings.tsx';
import { useMemo } from 'react';
import { deploymentNotices } from '../workflow/deployment-notices.ts';
import { useWorkflowProps } from '../workflow/props.ts';
// The working view's header (48 px): the lockup (a link to the landing), the session title, and the controls.
import type { ReactElement } from 'react';
import { BrandMark } from '../brand/BrandMark.tsx';
import { ExportButton } from '../export/ExportButton.tsx';
import { BusinessCaseEntry } from '../features/business-case/entry.tsx';
// Optional BD meeting brief module. Removing the feature removes this import and the <BdBriefEntry /> below;
// the entry itself renders nothing unless /api/me advertised features.bdBrief (see features/bd-brief/entry.tsx).
import { BdBriefEntry } from '../features/bd-brief/entry.tsx';
import { Icon } from './Icon.tsx';
import { ChangelogLink, LanguageMenu, ModeState, SessionsMenu, ThemeMenu } from './controls.tsx';
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
  const memory = useAppState((s) => s.session.memory);
  const pricingOpen = useAppState((s) => !!s.session.pricingOpen);
  const canPrice = useAppState((s) => !s.replay && (!!s.session.pricing || !!s.session.pricingPending ||
    Object.keys(s.session.memory.graph.nodes).length > 0 || s.session.memory.graph.recs.length > 0 ||
    Object.keys(s.session.memory.workflow?.nodes ?? {}).length > 0));
  const notices = useMemo(() => deploymentNotices(memory, workflow.catalog, t), [memory, workflow.catalog, t]);
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
        {!pricingOpen && showWorkflow && <label className="workflow-diagrams">
          <span className="visually-hidden">{t('focus.label')}</span>
          <select aria-label={t('focus.label')} disabled={streaming} value={mode} onChange={(e) => c.setMode(e.target.value as 'cloud' | 'workflow')}>
            <option value="workflow">{t('focus.workflow')}</option>
            {showCloud && <option value="cloud">{t(memory.deploymentSource ? 'deployment.title' : 'focus.cloud')}</option>}
          </select>
        </label>}
        {!pricingOpen && hasWorkflow && (!memory.deploymentSource || notices.length > 0 || !hasCloud) &&
          <button className="btn btn--secondary" type="button" disabled={workflow.disabled} onClick={c.drawDeployment}>
            {t(memory.deploymentSource ? 'deployment.redraw' : 'deployment.draw')}
          </button>}
        {canPrice && <button type="button" className="btn btn--secondary pricing-toggle" disabled={streaming}
          onClick={() => c.setPricingOpen(!pricingOpen)}>
          {t(pricingOpen ? 'pricing.back' : 'pricing.open')}
        </button>}
        {!pricingOpen && <button type="button" className="btn btn--ghost" aria-pressed={focus} onClick={() => c.setFocusDiagram(!focus)}>
          <Icon name={focus ? 'showConsole' : 'focusDiagram'} />
          <span>{focus ? t('header.showConsole') : t('header.focusDiagram')}</span>
        </button>}
        <ExportButton />
        <BusinessCaseEntry />
        <BdBriefEntry />
        <ChangelogLink />
        <SessionsMenu />
        <button type="button" className="btn btn--ghost" onClick={() => c.newSession()} disabled={streaming}>
          <Icon name="plus" />
          <span>{t('header.newSession')}</span>
        </button>
        <LanguageMenu />
        <ThemeMenu />
        <AccountMenu />
      </div>
      {!pricingOpen && mode === 'workflow' && <WorkflowSettings {...workflow} />}
      {!pricingOpen && notices.length > 0 && <div className="deployment-notices" role="status">{notices.map(text => <p key={text}>{text}</p>)}</div>}
    </header>
  );
}
