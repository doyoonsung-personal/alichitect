import { Component, useEffect, useRef, useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { useAppState, useT } from '../../store/react.tsx';
import { isStreaming } from '../../store/selectors.ts';
import type { WorkspaceProps } from './workspace.tsx';

const labels = { en: 'Business case', ko: '사업 가치 분석', zh: '业务价值分析' };
const retryLabels = { en: 'Could not open the business case. Try again.', ko: '사업 가치 분석을 열지 못했습니다. 다시 시도하세요.', zh: '无法打开业务价值分析。请重试。' };

class WorkspaceBoundary extends Component<{ children: ReactNode; retry(): void; label: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <span role="alert"><button type="button" className="btn btn--ghost" onClick={this.props.retry}>{this.props.label}</button></span> : this.props.children;
  }
}

/** The host only imports this gate. Loading or failing the optional module never blocks design or pricing. */
export function BusinessCaseEntry() {
  const { lang } = useT();
  const enabled = useAppState(state => state.account?.features?.businessCase === true);
  const eligible = useAppState(state => !state.replay && (state.session.memory.turns.some(turn => turn.role === 'user') ||
    Object.keys(state.session.memory.graph.nodes).length > 0 || Object.keys(state.session.memory.workflow?.nodes ?? {}).length > 0));
  const blocked = useAppState(state => isStreaming(state) || state.pricingStatus === 'working');
  const sessionId = useAppState(state => state.session.id);
  const [Workspace, setWorkspace] = useState<ComponentType<WorkspaceProps> | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [boundaryVersion, setBoundaryVersion] = useState(0);
  const mounted = useRef(true);
  const trigger = useRef<HTMLButtonElement>(null);
  const launchEpoch = useRef(0);
  const currentGate = useRef({ sessionId, enabled, eligible });
  currentGate.current = { sessionId, enabled, eligible };
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { launchEpoch.current++; setOpen(false); }, [sessionId, enabled]);
  if (!enabled || !eligible) return null;
  async function launch() {
    setFailed(false);
    if (Workspace) { setOpen(true); return; }
    setLoading(true);
    const epoch = launchEpoch.current;
    try {
      const module = await import('./workspace.tsx');
      if (mounted.current) {
        setWorkspace(() => module.default);
        if (launchEpoch.current === epoch && currentGate.current.sessionId === sessionId && currentGate.current.enabled && currentGate.current.eligible) setOpen(true);
      }
    } catch { if (mounted.current && launchEpoch.current === epoch) setFailed(true); }
    finally { if (mounted.current) setLoading(false); }
  }
  return <>
    <button ref={trigger} className="btn btn--ghost business-case-entry" type="button" disabled={blocked || loading}
      aria-haspopup="dialog" onClick={() => void launch()} title={labels[lang]}>
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M3 16h14M5 13V9m5 4V5m5 8V2" /></svg>
      <span>{labels[lang]}</span>
    </button>
    {failed && <span role="alert">{lang === 'ko' ? '다시 시도해 주세요.' : lang === 'zh' ? '请重试。' : 'Please try again.'}</span>}
    {Workspace && <WorkspaceBoundary key={`${sessionId}:${boundaryVersion}`} label={retryLabels[lang]} retry={() => { setBoundaryVersion(version => version + 1); setOpen(true); }}>
      <Workspace key={sessionId} open={open} onClose={() => { setOpen(false); trigger.current?.focus(); }} />
    </WorkspaceBoundary>}
  </>;
}
