// The account control (hosted Worker only): who is signed in, today's turns against the quota, Account settings, Admin
// for admins, and Sign out. It is the same Menu as Sessions and the language menu. Where GET /api/me does not exist
// (the local turn server) there is no account in the store and this renders nothing.
import type { ReactElement } from 'react';
import { Menu } from './Menu.tsx';
import { Icon } from './Icon.tsx';
import { useAppState, useController, useT } from '../store/react.tsx';
import { nextResetMs, quotaOf, shortName } from '../stream/account.ts';
import type { Account } from '../stream/account.ts';
import type { Lang } from '../i18n/t.ts';
import type { AppState } from '../store/types.ts';

const selAccount = (s: AppState) => s.account;

/** "09:00 GMT+9": when the day's count starts again, in the person's own zone. */
export function resetTime(now: number, lang: Lang): string {
  try {
    return new Intl.DateTimeFormat(lang, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZoneName: 'short' }).format(new Date(nextResetMs(now)));
  } catch {
    return '00:00 UTC';
  }
}

export function AccountMenu(): ReactElement | null {
  const account = useAppState(selAccount);
  return account ? <AccountMenuFor account={account} /> : null;
}

function AccountMenuFor({ account }: { account: Account }): ReactElement {
  const { lang, t } = useT();
  const c = useController();
  const name = shortName(account);
  const quota = quotaOf(account);
  const reset = resetTime(Date.now(), lang);
  const out = quota.kind === 'limited' && quota.left === 0;
  return (
    <Menu
      className="menu--account"
      triggerLabel={`${t('account.menu')}: ${name}`}
      trigger={
        <>
          <Icon name="user" />
          <span className="menu__who">{name}</span>
        </>
      }
      head={
        <>
          <p className="acct__name">{account.name || account.email}</p>
          {account.name ? <p className="acct__email">{account.email}</p> : null}
          <p className="acct__row">
            <span className="acct__label">{t('account.turnsToday')}</span>
            <span className={`acct__num${out ? ' acct__num--out' : ''}`}>{quota.kind === 'limited' ? t('account.turnsOf', { used: quota.used, limit: quota.limit }) : t('account.turnsUnlimited', { used: quota.used })}</span>
          </p>
          {quota.kind === 'limited' ? <p className={`acct__reset${out ? ' acct__reset--out' : ''}`}>{out ? t('account.limitReached', { time: reset }) : t('account.resets', { time: reset })}</p> : null}
        </>
      }
      items={[
        { key: 'account', label: t('account.settings'), meta: t('account.settingsMeta'), href: account.links.account, onSelect: () => undefined },
        ...(account.links.admin ? [{ key: 'admin', label: t('account.admin'), meta: t('account.adminMeta'), href: account.links.admin, onSelect: () => undefined }] : []),
      ]}
      footer={{ key: 'out', label: t('account.signOut'), onSelect: () => c.signOut() }}
    />
  );
}
