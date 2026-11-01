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
  return (
    <header className="header">
      <BrandMark lang={lang} name={t('app.name')} size="header" onHome={() => c.newSession()} homeLabel={t('header.home')} homeDisabled={streaming} />
      <p className="header__title" title={title || undefined}>
        {title || t('header.untitled')}
      </p>
      <div className="header__right">
        <ModeState />
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
    </header>
  );
}
