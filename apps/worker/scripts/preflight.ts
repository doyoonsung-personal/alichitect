// Refuses a production deploy while wrangler.jsonc still holds a placeholder (the D1 database_id or the Google client
// id), or turns on a local-only switch. Run by scripts/deploy.ps1 and .github/workflows/deploy.yml before anything is
// uploaded.   node scripts/preflight.ts
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const raw = readFileSync(fileURLToPath(new URL('../wrangler.jsonc', import.meta.url)), 'utf8');
// strip // comments (not inside strings: no value in this file contains //, except URLs, which follow a quote)
const json = raw
  .split('\n')
  .map((l) => l.replace(/(^|[^:"])\/\/.*$/, '$1'))
  .join('\n')
  .replace(/,(\s*[}\]])/g, '$1');
const cfg = JSON.parse(json) as {
  vars: Record<string, string>;
  d1_databases: Array<{ database_id: string }>;
  routes: Array<{ pattern: string; custom_domain?: boolean }>;
  send_email?: unknown[];
};

const problems: string[] = [];
if (/^0{8}-/.test(cfg.d1_databases[0]?.database_id ?? '')) problems.push('d1_databases[0].database_id is the placeholder: run `wrangler d1 create alichitect` and paste its id (docs/DEPLOY.md step 2)');
if (/REPLACE_WITH_/.test(cfg.vars.GOOGLE_CLIENT_ID ?? '') || !/\.apps\.googleusercontent\.com$/.test(cfg.vars.GOOGLE_CLIENT_ID ?? '')) problems.push('vars.GOOGLE_CLIENT_ID is not a Google OAuth client id (docs/DEPLOY.md step 1)');
if (cfg.vars.DEV_FAKE_GOOGLE !== undefined || cfg.vars.MAIL_LOG !== undefined) problems.push('production vars must not set DEV_FAKE_GOOGLE or MAIL_LOG');
if (cfg.vars.ALLOWED_ORIGIN !== 'https://architect.alikorea-demo.com') problems.push('vars.ALLOWED_ORIGIN must be https://architect.alikorea-demo.com');
if (!cfg.vars.ADMIN_EMAILS?.includes('@')) problems.push('vars.ADMIN_EMAILS is empty: nobody could approve anyone');
if (cfg.routes.length !== 1 || cfg.routes[0].pattern !== 'architect.alikorea-demo.com' || cfg.routes[0].custom_domain !== true) problems.push('routes must be exactly the custom domain architect.alikorea-demo.com (the zone is shared with other demos)');

if (problems.length) {
  console.error(`Not ready to deploy:\n  - ${problems.join('\n  - ')}`);
  process.exit(1);
}
console.log('preflight: wrangler.jsonc is ready for production');
