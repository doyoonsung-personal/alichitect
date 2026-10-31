import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import '@xyflow/react/dist/base.css';
import './ui/tokens.css';
import './ui/ui.css';
import './canvas/canvas.css';
import { App } from './App.tsx';

createRoot(document.getElementById('root')!).render(<App />);
