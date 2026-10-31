// Starts the local turn server on 127.0.0.1:8787 (PORT overrides).
//   node apps/server/src/main.ts       (or: npm run server, from the repo root)
// Environment: DASHSCOPE_API_KEY (required for turns; read here only, never printed), PORT, ALLOWED_ORIGINS,
// QWEN_MODEL, QWEN_FALLBACK_MODEL ('none' disables failover), QWEN_BASE_URL (https, OpenAI-compatible path), MAX_IN_FLIGHT,
// TURN_DEADLINE_MS, TURN_LOG (path, or 0 to disable), LOG_CONTENT=1 (also log the ask and the reply).
import { loadCatalog } from '../../../packages/core/src/catalog-node.ts';
import { configFromEnv } from './config.ts';
import { createTurnServer } from './server.ts';

const config = configFromEnv(process.env);
const apiKey = process.env.DASHSCOPE_API_KEY?.trim() || undefined;
const catalog = loadCatalog();
const srv = createTurnServer({ config, catalog, apiKey, onLine: (l) => console.log(`${new Date().toISOString()} ${l}`) });

try {
  const port = await srv.listen(config.port);
  console.log(`turn server on http://127.0.0.1:${port} | model ${config.model}, fallback ${config.fallbackModel ?? 'none'} | catalog ${catalog.version} (${catalog.entries.length} entries) | key ${apiKey ? 'set' : 'NOT SET: turns answer 503'} | origins ${config.allowedOrigins.join(', ')}`);
} catch (e) {
  const code = (e as { code?: string }).code;
  console.error(code === 'EADDRINUSE' ? `port ${config.port} is in use` : `could not start: ${code ?? 'error'}`);
  process.exit(1);
}

let closing = false;
const shutdown = (): void => {
  if (closing) process.exit(1);
  closing = true;
  srv.close().then(() => process.exit(0));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
