// The "why it's here" popover's open and close rules (spec 7.27), as a small machine with injected timers so it is
// testable: hover opens it after 300 ms, focus at once; leaving closes it after a 150 ms grace that the pointer can
// cross into the popover; blur and Escape close it; only one is open at a time.
export const OPEN_DELAY_MS = 300;
export const CLOSE_GRACE_MS = 150;

export type OpenedBy = 'hover' | 'focus' | 'click';

export interface HoverTimers {
  set(fn: () => void, ms: number): number;
  clear(id: number): void;
}

export interface HoverMachine {
  pointerEnter(id: string): void;
  pointerLeave(id: string): void;
  focus(id: string): void;
  blur(id: string): void;
  click(id: string): void;
  popoverEnter(): void;
  popoverLeave(): void;
  /** Keyboard focus moved into the popover (Enter on the card): a blur of the card must not close it. */
  holdForFocus(): void;
  /** Focus left the popover. */
  releaseHold(): void;
  escape(): void;
  closeNow(): void;
  readonly open: string | null;
  readonly openedBy: OpenedBy | null;
  dispose(): void;
}

export function createHoverMachine(onChange: (open: string | null, by: OpenedBy | null) => void, timers: HoverTimers, delays = { open: OPEN_DELAY_MS, close: CLOSE_GRACE_MS }): HoverMachine {
  let open: string | null = null;
  let by: OpenedBy | null = null;
  let held = false;
  let openTimer: number | null = null;
  let closeTimer: number | null = null;

  const clearOpen = (): void => {
    if (openTimer !== null) timers.clear(openTimer);
    openTimer = null;
  };
  const clearClose = (): void => {
    if (closeTimer !== null) timers.clear(closeTimer);
    closeTimer = null;
  };
  const set = (id: string | null, how: OpenedBy | null): void => {
    if (open === id && by === how) return;
    open = id;
    by = how;
    if (id === null) held = false;
    onChange(id, how);
  };
  const scheduleClose = (): void => {
    clearClose();
    if (open === null || held) return;
    closeTimer = timers.set(() => {
      closeTimer = null;
      set(null, null);
    }, delays.close);
  };

  return {
    pointerEnter(id) {
      clearClose();
      if (open === id) return;
      clearOpen();
      openTimer = timers.set(() => {
        openTimer = null;
        set(id, 'hover');
      }, delays.open);
    },
    pointerLeave(id) {
      clearOpen();
      if (open === id) scheduleClose();
    },
    focus(id) {
      clearOpen();
      clearClose();
      set(id, 'focus');
    },
    blur(id) {
      clearOpen();
      if (open === id && !held) {
        clearClose();
        set(null, null);
      }
    },
    click(id) {
      clearOpen();
      clearClose();
      set(id, 'click');
    },
    popoverEnter() {
      clearClose();
    },
    popoverLeave() {
      scheduleClose();
    },
    holdForFocus() {
      held = true;
      clearClose();
    },
    releaseHold() {
      held = false;
    },
    escape() {
      clearOpen();
      clearClose();
      set(null, null);
    },
    closeNow() {
      clearOpen();
      clearClose();
      set(null, null);
    },
    get open() {
      return open;
    },
    get openedBy() {
      return by;
    },
    dispose() {
      clearOpen();
      clearClose();
    },
  };
}
