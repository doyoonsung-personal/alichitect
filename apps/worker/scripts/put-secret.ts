// Puts one secret on the production Worker through `wrangler secret put`, writing the value to wrangler's standard
// input byte for byte (Windows PowerShell's own pipe adds a UTF-8 byte-order mark, which would corrupt the secret).
// Used by scripts/set-secrets.ps1; never prints the value.
//   node scripts/put-secret.ts DASHSCOPE_API_KEY              value from the environment variable of the same name
//   node scripts/put-secret.ts ANTHROPIC_API_KEY              the same (set-secrets.ps1 copies it from the Windows user
//                                                             environment into this process's environment first)
//   node scripts/put-secret.ts SESSION_SECRET --generate      48 random bytes, base64url
// The two API keys are shape-checked first (secret-format.ts): ANTHROPIC_API_KEY must start with sk-ant-, and
// DASHSCOPE_API_KEY must not, so a swapped pair is refused before anything leaves this machine.
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { secretProblem } from './secret-format.ts';

const NAMES = ['DASHSCOPE_API_KEY', 'ANTHROPIC_API_KEY', 'SESSION_SECRET'] as const;
const name = process.argv[2] as (typeof NAMES)[number];
if (!NAMES.includes(name)) {
  console.error(`usage: node scripts/put-secret.ts ${NAMES.join('|')} [--generate]`);
  process.exit(2);
}
const generate = process.argv.includes('--generate');
if (name === 'SESSION_SECRET' && !generate) {
  console.error('SESSION_SECRET is always generated here: pass --generate.');
  process.exit(2);
}
const value = generate ? randomBytes(48).toString('base64url') : (process.env[name] ?? '').trim();
if (!value) {
  console.error(`${name} is empty: nothing was set.`);
  process.exit(1);
}
const problem = generate ? null : secretProblem(name, value);
if (problem) {
  console.error(problem);
  process.exit(1);
}
if (!/^[\x21-\x7e]+$/.test(value)) {
  console.error(`${name} has spaces or non-ASCII characters: check the value. Nothing was set.`);
  process.exit(1);
}
const env: NodeJS.ProcessEnv = { ...process.env, WRANGLER_SEND_METRICS: 'false', CLOUDFLARE_ACCOUNT_ID: 'cfd2a327acfb7d93dc045825f12dd38d' };
for (const n of NAMES) delete env[n]; // wrangler gets the value on stdin only
const wrangler = fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url));
const child = spawn(process.execPath, [wrangler, 'secret', 'put', name, '--env='], { cwd: fileURLToPath(new URL('..', import.meta.url)), env, stdio: ['pipe', 'inherit', 'inherit'] });
child.stdin.end(value, 'utf8');
child.on('exit', (code) => process.exit(code ?? 1));
