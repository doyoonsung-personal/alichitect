import type { ReactElement } from 'react';
import { Landing } from '../landing/Landing.tsx';
import { WorkingView } from '../shell/WorkingView.tsx';
import { useAppState } from '../store/react.tsx';
import type { AppState } from '../store/types.ts';

const selView = (s: AppState) => s.view;

export function App(): ReactElement {
  const view = useAppState(selView);
  return view === 'landing' ? <Landing /> : <WorkingView />;
}
