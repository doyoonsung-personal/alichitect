// Shell controls used on both the landing and the working view: the language switch (a segmented group on the landing,
// a menu in the working view), the theme menu, the Sessions menu and the connection state label.
import type { ReactElement } from 'react';
import { Menu } from './Menu.tsx';
import { Icon } from './Icon.tsx';
import type { UiIconName } from './Icon.tsx';
import { THEME_CHOICES, setTheme, useTheme } from './theme.ts';
import type { ThemeChoice } from './theme.ts';
import { useAppState, useController, useT } from '../store/react.tsx';
import { headerMode } from '../store/selectors.ts';
import type { Lang } from '../i18n/t.ts';
import type { AppState } from '../store/types.ts';

const LANG_LABEL: Record<Lang, string> = { en: 'EN', ko: '한국어', zh: '中文' };
const LANG_NAME: Record<Lang, string> = { en: 'English', ko: '한국어', zh: '中文' };
const LANG_TAG: Record<Lang, string> = { en: 'en', ko: 'ko', zh: 'zh' };
const LANGS: Lang[] = ['en', 'ko', 'zh'];

export function ChangelogLink(): ReactElement | null {
  const { lang, t } = useT();
  const account = useAppState((s) => s.account);
  const working = useAppState((s) => s.view === 'working');
  if (!account) return null;
  return <a className="btn btn--ghost" data-changelog-link href={'/changelog?fallbackLang=' + lang}
    target={working ? '_blank' : undefined} rel={working ? 'noopener' : undefined}>{t('header.changelog')}</a>;
}

export function LanguageSwitch(): ReactElement {
  const { lang, t } = useT();
  const c = useController();
  return (
    <div className="seg" role="group" aria-label={t('header.language')}>
      {LANGS.map((l) => (
        <button key={l} type="button" className="seg__btn" lang={LANG_TAG[l]} aria-pressed={lang === l} onClick={() => c.setLanguage(l)}>
          {LANG_LABEL[l]}
        </button>
      ))}
    </div>
  );
}

export function LanguageMenu(): ReactElement {
  const { lang, t } = useT();
  const c = useController();
  return (
    <Menu
      className="menu--lang"
      triggerLabel={t('header.languageMenu')}
      trigger={
        <>
          <Icon name="globe" />
          <span lang={LANG_TAG[lang]}>{LANG_LABEL[lang]}</span>
        </>
      }
      items={LANGS.map((l) => ({ key: l, label: LANG_NAME[l], lang: LANG_TAG[l], current: l === lang, onSelect: () => c.setLanguage(l) }))}
    />
  );
}

const THEME_ICON: Record<ThemeChoice, UiIconName> = { light: 'sun', dark: 'moon', system: 'system' };

/** Light, Dark or System, in the header's menu grammar: an icon trigger showing the choice in force, three radio items. */
export function ThemeMenu(): ReactElement {
  const { t } = useT();
  const theme = useTheme();
  const name: Record<ThemeChoice, string> = { light: t('theme.light'), dark: t('theme.dark'), system: t('theme.system') };
  const label = `${t('theme.menu')}: ${name[theme]}`;
  return (
    <Menu
      className="menu--theme"
      triggerClassName="btn btn--ghost btn--icon"
      triggerLabel={label}
      triggerTitle={label}
      menuLabel={t('theme.menu')}
      trigger={<Icon name={THEME_ICON[theme]} />}
      items={THEME_CHOICES.map((c) => ({
        key: c,
        label: (
          <>
            <Icon name={THEME_ICON[c]} />
            <span>{name[c]}</span>
            <Icon name="check" className="menu__check" />
          </>
        ),
        text: name[c],
        meta: c === 'system' ? t('theme.systemMeta') : undefined,
        checked: c === theme,
        onSelect: () => setTheme(c),
      }))}
    />
  );
}

export function formatDate(ms: number, lang: Lang): string {
  try {
    return new Intl.DateTimeFormat(lang, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(ms));
  } catch {
    return new Date(ms).toISOString().slice(0, 16).replace('T', ' ');
  }
}

const selSessions = (s: AppState) => s.sessions;
const selCurrent = (s: AppState) => s.session.id;

export function SessionsMenu(p: { withNew?: boolean }): ReactElement {
  const { lang, t } = useT();
  const c = useController();
  const sessions = useAppState(selSessions);
  const current = useAppState(selCurrent);
  const disabled = sessions.length === 0 && !p.withNew;
  return (
    <Menu
      className="menu--sessions"
      triggerLabel={t('header.sessions')}
      trigger={
        <>
          <Icon name="history" />
          <span>{t('header.sessions')}</span>
        </>
      }
      disabled={disabled}
      disabledTitle={t('header.noSessions')}
      empty={t('header.noSessions')}
      items={sessions.map((s) => ({
        key: s.id,
        label: <span className="menu__title">{s.title || t('header.untitled')}</span>,
        text: s.title,
        meta: (
          <>
            <span>{formatDate(s.updatedAt, lang)}</span>
            <span aria-hidden="true"> · </span>
            <span>{t('sessions.revisions', { n: s.revisions })}</span>
          </>
        ),
        current: s.id === current,
        onSelect: () => c.openSession(s.id),
      }))}
      footer={p.withNew ? { key: 'new', label: t('header.newSession'), onSelect: () => c.newSession() } : undefined}
    />
  );
}

export function ModeState(): ReactElement {
  const { t } = useT();
  const mode = useAppState(headerMode);
  const health = useAppState((s: AppState) => s.conn.health);
  const label = mode === 'live' ? t('header.live') : mode === 'replay' ? t('header.replay') : mode === 'offline' ? t('header.offline') : t('header.checking');
  const title = mode === 'live' && health ? t('header.modelTooltip', { model: health.model, endpoint: health.endpoint.replace(/^dashscope-intl\..*$/, 'Singapore endpoint') }) : undefined;
  return (
    <span className={`mode mode--${mode}`} title={title}>
      <span className="mode__dot" aria-hidden="true" />
      <span className="mode__label">{label}</span>
    </span>
  );
}
