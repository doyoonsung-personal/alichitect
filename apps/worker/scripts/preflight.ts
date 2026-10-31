// Refuses a production deploy while wrangler.jsonc still holds a placeholder (the D1 database_id), turns on a
// local-only switch, or lacks what the account flow needs (the sender address and the Email Service binding that
// sends the sign-up and reset codes, and an admin to approve people). Run by scripts/deploy.ps1 and
// .github/workflows/deploy.yml before anything is uploaded.   node scripts/preflight.ts
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
  send_email?: Array<{ name: string; remote?: boolean }>;
};

const problems: string[] = [];
if (/^0{8}-/.test(cfg.d1_databases[0]?.database_id ?? '')) problems.push('d1_databases[0].database_id is the placeholder: run `wrangler d1 create alichitect` and paste its id (docs/DEPLOY.md step 2)');
if (cfg.vars.MAIL_LOG !== undefined) problems.push('production vars must not set MAIL_LOG (it is for local development only)');
if (Object.keys(cfg.vars).some((k) => /GOOGLE/.test(k))) problems.push('vars still hold a GOOGLE_* setting: Google sign-in was removed');
if (!/^[a-z0-9._-]+@(?:[a-z0-9-]+\.)*alikorea-demo\.com$/.test(cfg.vars.MAIL_FROM ?? '')) problems.push('vars.MAIL_FROM must be an address on alikorea-demo.com or one of its subdomains (the Email Service sender; no-reply@alikorea-demo.com is the one WonderClip already uses)');
if (!cfg.send_email?.some((b) => b.name === 'EMAIL' && b.remote === true)) problems.push('send_email must bind EMAIL with "remote": true: sign-up and password reset send their codes through it');
if (cfg.vars.ALLOWED_ORIGIN !== 'https://architect.alikorea-demo.com') problems.push('vars.ALLOWED_ORIGIN must be https://architect.alikorea-demo.com');
if (!cfg.vars.ADMIN_EMAILS?.includes('@')) problems.push('vars.ADMIN_EMAILS is empty: nobody could approve anyone');
if (cfg.routes.length !== 1 || cfg.routes[0].pattern !== 'architect.alikorea-demo.com' || cfg.routes[0].custom_domain !== true) problems.push('routes must be exactly the custom domain architect.alikorea-demo.com (the zone is shared with other demos)');

if (problems.length) {
  console.error(`Not ready to deploy:\n  - ${problems.join('\n  - ')}`);
  process.exit(1);
}
console.log('preflight: wrangler.jsonc is ready for production');
