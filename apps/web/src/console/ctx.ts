// What the console's parts share: the props from the shell plus the catalog (names in requirement lines and fix sentences).
import type { Catalog, ConsoleProps } from '../app/contracts.ts';

export type ConsoleCtx = ConsoleProps & { catalog: Catalog };

/** True while a turn is in flight (waiting, streaming, fallback or repairing). */
export const isBusy = (phase: ConsoleProps['turn']['phase']): boolean => phase === 'waiting' || phase === 'streaming' || phase === 'fallback' || phase === 'repairing';
