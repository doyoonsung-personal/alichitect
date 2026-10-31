// The console (spec 7.7 to 7.14, 8, 9): the architecture's working record, not a chat. Requirements pinned at the top,
// the revision record in the middle, the composer at the bottom. It renders ConsoleProps and calls actions; it never
// imports the store. Strings come from `t`.
import { useMemo } from 'react';
import type { ReactElement } from 'react';
import '../styles/console.css';
import { useCatalog } from '../app/contracts.ts';
import type { ConsoleProps } from '../app/contracts.ts';
import { Composer } from './Composer.tsx';
import { RevisionLog } from './Record.tsx';
import { ReplayBanner } from './ReplayBanner.tsx';
import { Requirements } from './Requirements.tsx';
import { Toast } from './Toast.tsx';
import type { ConsoleCtx } from './ctx.ts';

export function Console(p: ConsoleProps): ReactElement {
  const catalog = useCatalog();
  const ctx = useMemo<ConsoleCtx>(() => ({ ...p, catalog }), [p, catalog]);
  return (
    <aside className="console" aria-label={p.t('console.label')}>
      <ReplayBanner ctx={ctx} />
      <Requirements ctx={ctx} />
      <RevisionLog ctx={ctx} />
      <div className="cmp-wrap">
        <Toast ctx={ctx} />
        <Composer ctx={ctx} />
      </div>
    </aside>
  );
}
