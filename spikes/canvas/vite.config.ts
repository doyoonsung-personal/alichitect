import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// The spike imports packages/core, the catalog JSON and the recorded streams from the repo root.
const repoRoot = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true, fs: { allow: [repoRoot] } },
  preview: { port: 5173, strictPort: true },
  worker: { format: 'es' },
  build: { target: 'es2022' },
});
