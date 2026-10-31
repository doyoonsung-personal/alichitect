import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// The app imports packages/core (source and catalog JSON) from the repo root through aliases.
const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const core = fileURLToPath(new URL('../../packages/core/src', import.meta.url));
const catalog = fileURLToPath(new URL('../../packages/core/catalog', import.meta.url));
// The local turn server (apps/server). The Host header is rewritten to the target's, as the server's DNS-rebinding check requires.
const api = { target: process.env.API_TARGET ?? 'http://127.0.0.1:8787', changeOrigin: true };

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@ali/core': core, '@ali/catalog': catalog } },
  server: {
    port: 5174,
    strictPort: true,
    fs: { allow: [repoRoot] },
    proxy: { '/api': api },
  },
  preview: { port: 5174, strictPort: true, proxy: { '/api': api } },
  worker: { format: 'es' },
  build: { target: 'es2022' },
});
