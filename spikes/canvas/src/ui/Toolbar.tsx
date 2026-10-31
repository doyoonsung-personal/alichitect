import { useCallback } from 'react';
import type { JSX, KeyboardEvent } from 'react';

export type Speed = '1x' | '4x' | 'instant';
export type RouterChoice = 'libavoid' | 'channel';
export type ThemeChoice = 'light' | 'dark';

export interface ScenarioInfo {
  id: string;
  title: string;
  subtitle: string;
}

export interface ToolbarStatus {
  state: 'idle' | 'streaming' | 'done';
  ops: number;
  totalOps: number;
  say: string;
}

export interface ToolbarProps {
  scenarios: ScenarioInfo[];
  scenario: string;
  onScenario(id: string): void;
  speed: Speed;
  onSpeed(s: Speed): void;
  router: RouterChoice;
  onRouter(r: RouterChoice): void;
  theme: ThemeChoice;
  onTheme(t: ThemeChoice): void;
  onReplay(): void;
  status: ToolbarStatus;
}

interface SegOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string> {
  ariaLabel: string;
  options: SegOption<T>[];
  value: T;
  onChange(v: T): void;
}

function Segmented<T extends string>(props: SegmentedProps<T>): JSX.Element {
  const { ariaLabel, options, value, onChange } = props;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const idx = options.findIndex((o) => o.value === value);
      let next = -1;
      if (e.key === 'ArrowRight') {
        next = (idx + 1) % options.length;
      } else if (e.key === 'ArrowLeft') {
        next = (idx - 1 + options.length) % options.length;
      }
      if (next !== -1) {
        e.preventDefault();
        onChange(options[next].value);
        const btns = e.currentTarget.querySelectorAll<HTMLButtonElement>(
          '[role="radio"]'
        );
        btns[next]?.focus();
      }
    },
    [options, value, onChange]
  );

  return (
    <div
      className="tb-seg"
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          tabIndex={value === opt.value ? 0 : -1}
          className="tb-seg-btn"
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

const SPEED_OPTIONS: SegOption<Speed>[] = [
  { value: '1x', label: '1x' },
  { value: '4x', label: '4x' },
  { value: 'instant', label: 'Instant' },
];

const ROUTER_OPTIONS: SegOption<RouterChoice>[] = [
  { value: 'libavoid', label: 'libavoid' },
  { value: 'channel', label: 'Channel' },
];

export function Toolbar(props: ToolbarProps): JSX.Element {
  const {
    scenarios,
    scenario,
    onScenario,
    speed,
    onSpeed,
    router,
    onRouter,
    theme,
    onTheme,
    onReplay,
    status,
  } = props;

  const currentScenario = scenarios.find((s) => s.id === scenario);

  return (
    <header className="tb">
      <div className="tb-brand">
        <span className="tb-title">Architecture canvas</span>
        <span className="tb-tag">spike</span>
      </div>

      <label className="tb-label" htmlFor="tb-scenario">
        Scenario
      </label>
      <select
        id="tb-scenario"
        className="tb-select"
        value={scenario}
        onChange={(e) => onScenario(e.target.value)}
      >
        {scenarios.map((s) => (
          <option key={s.id} value={s.id}>
            {s.title}
          </option>
        ))}
      </select>
      {currentScenario && (
        <span className="tb-sub">{currentScenario.subtitle}</span>
      )}

      <Segmented<Speed>
        ariaLabel="Replay speed"
        options={SPEED_OPTIONS}
        value={speed}
        onChange={onSpeed}
      />

      <Segmented<RouterChoice>
        ariaLabel="Edge router"
        options={ROUTER_OPTIONS}
        value={router}
        onChange={onRouter}
      />

      <button
        type="button"
        className="tb-icon-btn"
        aria-pressed={theme === 'dark'}
        aria-label="Dark theme"
        onClick={() => onTheme(theme === 'dark' ? 'light' : 'dark')}
      >
        {theme === 'light' ? (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <path d="M19.5 14.6A7.5 7.5 0 0 1 9.4 4.5a7.5 7.5 0 1 0 10.1 10.1z" />
          </svg>
        ) : (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M6 18l1.4-1.4M16.6 7.4 18 6" />
          </svg>
        )}
      </button>

      <button type="button" className="tb-primary" onClick={onReplay}>
        Replay
      </button>

      <div className="tb-status">
        <span
          className="tb-dot"
          data-state={status.state}
          aria-hidden="true"
        />
        <span className="tb-say" title={status.say} aria-live="polite">
          {status.say}
        </span>
        <span className="tb-count tnum">
          {status.ops} / {status.totalOps} ops
        </span>
      </div>
    </header>
  );
}
