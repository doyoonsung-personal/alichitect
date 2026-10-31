// Live smoke test: one real turn through the turn server, printing only events and timings (no reply text, no key).
//   node apps/server/scripts/smoke.ts                      starts a temporary server on 127.0.0.1:5198 with the real key
//   node apps/server/scripts/smoke.ts --url http://127.0.0.1:8787   uses a server that is already running
//   --ask "..."  the message (default: a residency + no-Kubernetes web shop)   --port 5198  the temporary server's port
// Reads DASHSCOPE_API_KEY from the environment (temporary server only) and never prints it. Exit code 0 when the turn
// committed. The temporary server logs metadata to apps/server/logs/smoke.jsonl and is stopped before exit.
import path from 'node:path';
import { loadCatalog } from '../../../packages/core/src/catalog-node.ts';
import { createMemory } from '../../../packages/core/src/prompt.ts';
import type { ServerEvent } from '../../../packages/core/src/types.ts';
import { SERVER_DIR, configFromEnv } from '../src/config.ts';
import { createTurnServer } from '../src/server.ts';
import type { TurnServer } from '../src/server.ts';

const args = process.argv.slice(2);
const arg = (name: string): string | undefined => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const ask = arg('ask') ?? 'A small web shop for customers in Southeast Asia. Customer data must stay in Singapore, and we do not want Kubernetes.';
let base = arg('url');
let srv: TurnServer | null = null;

if (!base) {
  const port = Number(arg('port') ?? 5198);
  if (!Number.isInteger(port) || port < 5174 || port > 5199) throw new Error('--port must be in 5174-5199');
  const apiKey = process.env.DASHSCOPE_API_KEY?.trim();
  if (!apiKey) throw new Error('DASHSCOPE_API_KEY is not set');
  const config = configFromEnv({ ...process.env, PORT: String(port), TURN_LOG: path.join(SERVER_DIR, 'logs', 'smoke.jsonl') });
  srv = createTurnServer({ config, catalog: loadCatalog(), apiKey });
  await srv.listen(port);
  base = `http://127.0.0.1:${port}`;
}

const t0 = performance.now();
const ms = (): string => `+${String(Math.round(performance.now() - t0)).padStart(6)} ms`;
let committed = false;
try {
  const health = (await (await fetch(`${base}/api/health`, { headers: { Origin: 'http://localhost:5174' } })).json()) as Record<string, unknown>;
  console.log(`${ms()} health ok=${health.ok} model=${health.model} fallback=${health.fallbackModel} endpoint=${health.endpoint} key=${health.keyConfigured ? 'set' : 'missing'} catalog=${(health.catalog as { version: string }).version}`);
  const res = await fetch(`${base}/api/turn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5174' },
    body: JSON.stringify({ sessionId: `smoke-${Date.now()}`, ask, memory: createMemory() }),
  });
  console.log(`${ms()} HTTP ${res.status} ${res.headers.get('content-type')}`);
  if (!res.ok || !res.body) {
    const j = (await res.json()) as Record<string, unknown>;
    console.log(`${ms()} rejected code=${j.code}`);
  } else {
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    let partials = 0;
    const seen: Record<string, number> = {};
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i: number;
      while ((i = buf.indexOf('\n')) >= 0) {
        const lineText = buf.slice(0, i);
        buf = buf.slice(i + 1);
        if (!lineText.trim()) continue;
        const e = JSON.parse(lineText) as Record<string, unknown> & { type: string };
        seen[e.type] = (seen[e.type] ?? 0) + 1;
        const phase = e.phase ? `[${e.phase}]` : '';
        if (e.type === 'say' && !e.final) {
          if (partials++ === 0) console.log(`${ms()} say${phase} first partial`);
          continue;
        }
        if (e.type === 'say') console.log(`${ms()} say${phase} final #${e.id}`);
        else if (e.type === 'op') {
          const op = e.op as Record<string, unknown>;
          const what = op.t === 'req' ? `req regions=${JSON.stringify(op.regions ?? [])} avoid=${JSON.stringify(op.avoid ?? [])}` : `${op.t} ${op.id ?? op.product ?? ''}`.trim();
          console.log(`${ms()} op${phase} ${what}`);
        } else if (e.type === 'warn') {
          const w = e.warning as { code: string; severity: string; repaired: boolean };
          console.log(`${ms()} warn${phase} ${w.code} ${w.severity}${w.repaired ? ' repaired' : ''}`);
        } else if (e.type === 'usage') console.log(`${ms()} usage${phase} $${(e.costUsd as number).toFixed(5)}`);
        else if (e.type === 'done') {
          const t = e.timings as Record<string, number | null>;
          console.log(`${ms()} done${phase} truncated=${e.truncated} firstByte=${t.firstByteMs} firstSay=${t.firstSayMs} firstOp=${t.firstOpMs} firstNode=${t.firstNodeMs} total=${t.totalMs} ms`);
        } else if (e.type === 'error') console.log(`${ms()} error${phase} ${(e.error as { code: string }).code}`);
        else if (e.type === 'status') console.log(`${ms()} status ${e.code}`);
        else if (e.type === 'commit') {
          committed = true;
          const c = e as unknown as Extract<ServerEvent, { type: 'commit' }>;
          const m = c.memory;
          const codes = [...new Set(c.warnings.map((w) => `${w.code}:${w.severity}`))].join(' ') || 'none';
          console.log(`${ms()} commit nodes=${Object.keys(m.graph.nodes).length} edges=${Object.keys(m.graph.edges).length} turns=${m.turns.length} requirements=${m.requirements.length} constraints=${JSON.stringify((m.constraints ?? []).map((x) => ({ regions: x.regions, avoid: x.avoid })))} warnings=${codes}`);
        } else if (e.type === 'summary') console.log(`${ms()} summary (${String(e.summary).length} chars)`);
        else if (e.type === 'fatal') console.log(`${ms()} fatal ${e.code} retryable=${e.retryable}`);
        else console.log(`${ms()} ${e.type}`);
      }
    }
    console.log(`${ms()} end of stream; events ${JSON.stringify(seen)}`);
  }
} finally {
  if (srv) await srv.close();
}
process.exit(committed ? 0 : 1);
