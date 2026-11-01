// Refuses a production deploy while wrangler.jsonc still holds a placeholder (the D1 database_id), turns on a
// local-only switch, holds a vars value that looks like an API key, or lacks what the account flow needs (the sender
// address and the Email Service binding that sends the sign-up and reset codes, and an admin to approve people). Also
// checks the Claude backup's settings (a Claude model of the PRICES table in CLAUDE_BACKUP_MODEL, numeric caps) and that the
// Anthropic SDK the turn path bundles is installed in packages/core. The checks themselves are in preflight-checks.ts.
// Run by scripts/deploy.ps1 and .github/workflows/deploy.yml before anything is uploaded.   node scripts/preflight.ts
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { configProblems, parseWranglerJsonc } from './preflight-checks.ts';

const cfg = parseWranglerJsonc(readFileSync(fileURLToPath(new URL('../wrangler.jsonc', import.meta.url)), 'utf8'));
const problems = configProblems(cfg, { sdkInstalled: existsSync(fileURLToPath(new URL('../../../packages/core/node_modules/@anthropic-ai/sdk/package.json', import.meta.url))) });

if (problems.length) {
  console.error(`Not ready to deploy:\n  - ${problems.join('\n  - ')}`);
  process.exit(1);
}
console.log('preflight: wrangler.jsonc is ready for production');
