// The checks of scripts/preflight.ts, as pure functions over the parsed wrangler.jsonc so a test can feed them a bad
// config. A problem is one sentence for the operator; none contains a vars value (a value that looks like a key is
// reported by its name only).
import { isClaudeModelId } from '../../../packages/core/src/pricing.ts';

export interface WranglerConfig {
  vars: Record<string, string>;
  d1_databases: Array<{ database_id: string }>;
  routes: Array<{ pattern: string; custom_domain?: boolean }>;
  send_email?: Array<{ name: string; remote?: boolean }>;
  env?: Record<string, { vars?: Record<string, string> } | undefined>;
}

/** wrangler.jsonc as an object: // comments (a full line, or after a value) and trailing commas removed, as wrangler itself reads it. */
export function parseWranglerJsonc(raw: string): WranglerConfig {
  // not inside strings: no value in the file contains //, except URLs, which follow a quote
  const json = raw
    .split('\n')
    .map((l) => l.replace(/(^|[^:"])\/\/.*$/, '$1'))
    .join('\n')
    .replace(/,(\s*[}\]])/g, '$1');
  return JSON.parse(json) as WranglerConfig;
}

/**
 * Whether a vars value looks like an API key or another secret: an "sk-" token (Model Studio, Anthropic, OpenAI-style
 * keys), or one unbroken run of 32 or more key characters (hex, base64, base64url). vars are committed to the repository
 * and shown in the Cloudflare dashboard, so a secret there is a leak; real vars are words, addresses, URLs and numbers.
 */
export function looksLikeKey(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const v = value.trim();
  return /\bsk-[A-Za-z0-9_-]{8,}/.test(v) || /^[A-Za-z0-9_\-+/=]{32,}$/.test(v);
}

/** The names of the vars (of the config and of each env block) whose value looks like a key. */
export function keyLookingVars(cfg: WranglerConfig): string[] {
  const out: string[] = [];
  const scan = (where: string, vars: Record<string, unknown> | undefined): void => {
    for (const [k, v] of Object.entries(vars ?? {})) if (looksLikeKey(v)) out.push(`${where}${k}`);
  };
  scan('', cfg.vars);
  for (const [name, e] of Object.entries(cfg.env ?? {})) scan(`env.${name}.`, e?.vars);
  return out;
}

export function configProblems(cfg: WranglerConfig, o: { sdkInstalled: boolean }): string[] {
  const problems: string[] = [];
  if (/^0{8}-/.test(cfg.d1_databases[0]?.database_id ?? '')) problems.push('d1_databases[0].database_id is the placeholder: run `wrangler d1 create alichitect` and paste its id (docs/DEPLOY.md step 2)');
  if (cfg.vars.MAIL_LOG !== undefined) problems.push('production vars must not set MAIL_LOG (it is for local development only)');
  if (Object.keys(cfg.vars).some((k) => /GOOGLE/.test(k))) problems.push('vars still hold a GOOGLE_* setting: Google sign-in was removed');
  for (const name of keyLookingVars(cfg)) problems.push(`vars.${name} looks like an API key or token: vars are committed and shown in the dashboard; put secrets with scripts/set-secrets.ps1 instead`);
  if (!/^[a-z0-9._-]+@(?:[a-z0-9-]+\.)*alikorea-demo\.com$/.test(cfg.vars.MAIL_FROM ?? '')) problems.push('vars.MAIL_FROM must be an address on alikorea-demo.com or one of its subdomains (the Email Service sender; no-reply@alikorea-demo.com is the one WonderClip already uses)');
  if (!cfg.send_email?.some((b) => b.name === 'EMAIL' && b.remote === true)) problems.push('send_email must bind EMAIL with "remote": true: sign-up and password reset send their codes through it');
  if (cfg.vars.ALLOWED_ORIGIN !== 'https://architect.alikorea-demo.com') problems.push('vars.ALLOWED_ORIGIN must be https://architect.alikorea-demo.com');
  if (!cfg.vars.ADMIN_EMAILS?.includes('@')) problems.push('vars.ADMIN_EMAILS is empty: nobody could approve anyone');
  if (cfg.vars.CLAUDE_BACKUP_MODEL !== undefined && !isClaudeModelId(cfg.vars.CLAUDE_BACKUP_MODEL)) problems.push('vars.CLAUDE_BACKUP_MODEL must be a Claude model of the PRICES table in packages/core/src/pricing.ts, such as claude-opus-5-5 (the backup uses it only when the ANTHROPIC_API_KEY secret is set, and falls back to claude-opus-5-5 for any other value)');
  for (const k of ['CLAUDE_RESCUES_PER_USER_DAY', 'CLAUDE_RESCUES_PER_ADMIN_DAY']) {
    const v = cfg.vars[k];
    if (v !== undefined && !/^\d{1,6}$/.test(v)) problems.push(`vars.${k} must be a whole number (the Worker falls back to its default for anything else)`);
  }
  const budget = cfg.vars.CLAUDE_BUDGET_USD_PER_DAY;
  if (budget !== undefined && !(budget.trim() !== '' && Number.isFinite(Number(budget)) && Number(budget) >= 0)) problems.push('vars.CLAUDE_BUDGET_USD_PER_DAY must be a number of US dollars, 0 or more');
  if (!o.sdkInstalled) problems.push('the Anthropic SDK is not installed in packages/core: run `npm ci` in packages/core (the Worker bundles it for the Claude backup)');
  if (cfg.routes.length !== 1 || cfg.routes[0].pattern !== 'architect.alikorea-demo.com' || cfg.routes[0].custom_domain !== true) problems.push('routes must be exactly the custom domain architect.alikorea-demo.com (the zone is shared with other demos)');
  return problems;
}
