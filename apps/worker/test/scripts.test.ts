// The deploy tooling in apps/worker/scripts, which handles two API keys: put-secret.ts refuses a swapped or misshaped key,
// preflight refuses a key in wrangler.jsonc vars or a Claude model without a price, check-bundle uses Node's own list of
// built-ins, and deploy.ps1 and set-secrets.ps1 keep both keys out of the environment of every child process (npm ci, the
// build, wrangler) and read them from the user scope only at the moment of use. The PowerShell checks that run the scripts
// need Windows PowerShell and are skipped elsewhere; the text checks run everywhere.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { secretProblem } from '../scripts/secret-format.ts';
import { configProblems, keyLookingVars, looksLikeKey, parseWranglerJsonc } from '../scripts/preflight-checks.ts';
import { isNodeBuiltin } from '../scripts/node-builtins.ts';

const here = (p: string): string => fileURLToPath(new URL(p, import.meta.url));
const SCRIPTS = here('../scripts/');
const text = (name: string): string => readFileSync(path.join(SCRIPTS, name), 'utf8');

/** The environment of this process without the keys, so a test never passes a real one on. */
function cleanEnv(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const k of Object.keys(env)) if (/^(ANTHROPIC_API_KEY|DASHSCOPE_API_KEY|CLOUDFLARE_.*)$/i.test(k)) delete env[k];
  return { ...env, ...extra };
}

describe('put-secret.ts: the shape of the two API keys', () => {
  const FAKE_ANTHROPIC = 'sk-ant-api03-FAKE-0123456789abcdef';
  const FAKE_DASHSCOPE = 'sk-fake0123456789abcdef0123456789ab';

  test('secretProblem: the Anthropic key must start with sk-ant-, the Model Studio key must not', () => {
    assert.equal(secretProblem('ANTHROPIC_API_KEY', FAKE_ANTHROPIC), null);
    assert.equal(secretProblem('DASHSCOPE_API_KEY', FAKE_DASHSCOPE), null);
    assert.match(secretProblem('ANTHROPIC_API_KEY', FAKE_DASHSCOPE) ?? '', /sk-ant-/);
    assert.match(secretProblem('ANTHROPIC_API_KEY', 'sk-test-abc') ?? '', /sk-ant-/);
    assert.match(secretProblem('ANTHROPIC_API_KEY', 'sk-ant') ?? '', /sk-ant-/, 'the prefix includes the last dash');
    assert.match(secretProblem('DASHSCOPE_API_KEY', FAKE_ANTHROPIC) ?? '', /Anthropic/);
    assert.equal(secretProblem('SESSION_SECRET', 'whatever'), null);
    for (const [n, v] of [['ANTHROPIC_API_KEY', FAKE_DASHSCOPE], ['DASHSCOPE_API_KEY', FAKE_ANTHROPIC]]) assert.ok(!(secretProblem(n, v) ?? '').includes(v), 'a message never holds the value');
  });

  /** Runs put-secret.ts with the value in the environment; a refused value exits before wrangler is started. */
  function put(name: string, value: string): { status: number | null; out: string } {
    const r = spawnSync(process.execPath, [path.join(SCRIPTS, 'put-secret.ts'), name], { env: cleanEnv({ [name]: value }), encoding: 'utf8', timeout: 20_000, input: '' });
    return { status: r.status, out: `${r.stdout}\n${r.stderr}` };
  }

  test('an Anthropic key given as DASHSCOPE_API_KEY is refused before anything is sent, without echoing it', () => {
    const r = put('DASHSCOPE_API_KEY', FAKE_ANTHROPIC);
    assert.equal(r.status, 1);
    assert.match(r.out, /Anthropic key/);
    assert.match(r.out, /Nothing was set/);
    assert.ok(!r.out.includes(FAKE_ANTHROPIC) && !r.out.includes('0123456789abcdef'));
  });

  test('a key without sk-ant- given as ANTHROPIC_API_KEY is refused too', () => {
    for (const bad of [FAKE_DASHSCOPE, 'not-a-key-at-all', 'sk-proj-0123456789abcdef']) {
      const r = put('ANTHROPIC_API_KEY', bad);
      assert.equal(r.status, 1, bad);
      assert.match(r.out, /must start with sk-ant-/);
      assert.ok(!r.out.includes(bad));
    }
  });

  test('the script runs the check before the ASCII check and before spawning wrangler (text check)', () => {
    const t = text('put-secret.ts');
    assert.ok(t.indexOf('secretProblem(') > 0 && t.indexOf('secretProblem(') < t.indexOf('spawn(process.execPath'));
    assert.ok(t.includes("'ANTHROPIC_API_KEY'"));
  });
});

describe('preflight: a key in the vars, and the Claude settings', () => {
  const real = parseWranglerJsonc(readFileSync(here('../wrangler.jsonc'), 'utf8'));
  const ok = { sdkInstalled: true };
  const withVars = (v: Record<string, string>): typeof real => ({ ...real, vars: { ...real.vars, ...v } });

  test('the real wrangler.jsonc passes, and parses the way preflight.ts reads it', () => {
    assert.deepEqual(configProblems(real, ok), []);
    assert.equal(real.vars.CLAUDE_RESCUES_PER_USER_DAY, '10');
    assert.equal(real.vars.CLAUDE_RESCUES_PER_ADMIN_DAY, '30');
    assert.equal(real.vars.CLAUDE_BUDGET_USD_PER_DAY, '5');
    assert.deepEqual(keyLookingVars(real), []);
  });

  test('looksLikeKey: sk- tokens and long unbroken key-like runs, not words, addresses, URLs or numbers', () => {
    for (const k of ['sk-ant-api03-abcdefghijklmnop', 'sk-0123456789abcdef', 'abcdef0123456789abcdef0123456789', 'AbCdEfGhIjKlMnOpQrStUvWxYz0123456789-_', 'bearer sk-abcdefghij1234']) assert.equal(looksLikeKey(k), true, k);
    for (const v of ['claude-opus-5-5', 'https://architect.alikorea-demo.com', 'dysung.alicloud@gmail.com', 'Alibaba Cloud Architecture Builder', '5', '240000', 'no-reply@alikorea-demo.com', 'qwen3.8-max', '', 'sk-ant', 'task-force', 'risk-assessment-notes']) assert.equal(looksLikeKey(v), false, v);
    assert.equal(looksLikeKey(5), false);
  });

  test('a vars value that looks like a key fails the preflight, naming the var and never the value', () => {
    for (const key of ['sk-ant-api03-AAAAAAAAAAAAAAAAAAAAAAAAAAAA', 'sk-1234567890abcdefghij', 'f'.repeat(40)]) {
      for (const name of ['CLAUDE_BACKUP_MODEL', 'SITE_NAME', 'SOMETHING_NEW']) {
        const problems = configProblems(withVars({ [name]: key }), ok);
        assert.ok(problems.some((p) => p.startsWith(`vars.${name} looks like an API key`)), `${name}=${key.slice(0, 8)}...: ${problems.join(' | ')}`);
        assert.ok(!problems.join('\n').includes(key), 'the value is not repeated');
      }
    }
  });

  test('a key in the dev env block fails it too (that file is committed as well)', () => {
    const cfg = { ...real, env: { dev: { vars: { ...(real.env?.dev?.vars ?? {}), ANTHROPIC_API_KEY: 'sk-ant-api03-BBBBBBBBBBBBBBBBBBBB' } } } };
    assert.deepEqual(keyLookingVars(cfg), ['env.dev.ANTHROPIC_API_KEY']);
    assert.ok(configProblems(cfg, ok).some((p) => p.includes('vars.env.dev.ANTHROPIC_API_KEY looks like an API key')));
  });

  test('CLAUDE_BACKUP_MODEL must be a Claude model of the PRICES table; the caps must be numbers', () => {
    for (const m of ['claude-opus-5-5', 'claude-opus-5', 'claude-opus-4-8']) assert.deepEqual(configProblems(withVars({ CLAUDE_BACKUP_MODEL: m }), ok), [], m);
    for (const m of ['claude-made-up', 'gpt-5', 'claude-opus-5-5-preview', '']) assert.ok(configProblems(withVars({ CLAUDE_BACKUP_MODEL: m }), ok).some((p) => p.includes('CLAUDE_BACKUP_MODEL')), m);
    for (const [k, v] of [['CLAUDE_RESCUES_PER_USER_DAY', 'ten'], ['CLAUDE_RESCUES_PER_ADMIN_DAY', '-1'], ['CLAUDE_RESCUES_PER_USER_DAY', ''], ['CLAUDE_BUDGET_USD_PER_DAY', 'five'], ['CLAUDE_BUDGET_USD_PER_DAY', '-2'], ['CLAUDE_BUDGET_USD_PER_DAY', '']]) {
      assert.ok(configProblems(withVars({ [k]: v }), ok).some((p) => p.includes(k)), `${k}=${v}`);
    }
    assert.deepEqual(configProblems(withVars({ CLAUDE_BUDGET_USD_PER_DAY: '2.5', CLAUDE_RESCUES_PER_USER_DAY: '0' }), ok), []);
  });

  test('the older checks still hold: placeholder id, MAIL_LOG, sender, binding, origin, admins, route, SDK', () => {
    assert.ok(configProblems({ ...real, d1_databases: [{ database_id: '00000000-0000-0000-0000-000000000000' }] }, ok).some((p) => p.includes('placeholder')));
    assert.ok(configProblems(withVars({ MAIL_LOG: '1' }), ok).some((p) => p.includes('MAIL_LOG')));
    assert.ok(configProblems(withVars({ MAIL_FROM: 'a@example.com' }), ok).some((p) => p.includes('MAIL_FROM')));
    assert.ok(configProblems({ ...real, send_email: [] }, ok).some((p) => p.includes('send_email')));
    assert.ok(configProblems(withVars({ ALLOWED_ORIGIN: 'https://x.example.com' }), ok).some((p) => p.includes('ALLOWED_ORIGIN')));
    assert.ok(configProblems(withVars({ ADMIN_EMAILS: '' }), ok).some((p) => p.includes('ADMIN_EMAILS')));
    assert.ok(configProblems({ ...real, routes: [] }, ok).some((p) => p.includes('routes')));
    assert.ok(configProblems(real, { sdkInstalled: false }).some((p) => p.includes('Anthropic SDK')));
  });

  test('preflight.ts itself exits 0 on the real config', () => {
    const r = spawnSync(process.execPath, [path.join(SCRIPTS, 'preflight.ts')], { encoding: 'utf8', timeout: 20_000 });
    assert.equal(r.status, 0, `${r.stdout}${r.stderr}`);
  });
});

describe('check-bundle: Node built-ins from node:module', () => {
  test('isNodeBuiltin flags every built-in and its subpaths, and nothing else', () => {
    for (const m of ['node:sqlite', 'node:fs', 'fs', 'fs/promises', 'path', 'dns', 'dns/promises', 'readline', 'worker_threads', 'vm', 'assert', 'assert/strict', 'async_hooks', 'perf_hooks', 'diagnostics_channel', 'http2', 'inspector', 'tty', 'dgram', 'cluster', 'repl', 'v8', 'stream/web', 'util/types', 'child_process', 'zlib']) assert.equal(isNodeBuiltin(m), true, m);
    for (const m of ['wrangler', '@anthropic-ai/sdk', '@anthropic-ai/sdk/streaming', './util.ts', '../node_modules/x', 'esbuild', 'undici', 'react', '/abs/fs', 'fsx', 'dnsx/promises']) assert.equal(isNodeBuiltin(m), false, m);
    for (const m of builtinModules) assert.equal(isNodeBuiltin(m), true, m);
  });

  test('the old hand-kept list missed built-ins that the new check catches (the reason for the change)', () => {
    const old = /^node:|^(fs|path|os|crypto|http|https|net|tls|url|child_process|stream|buffer|util|zlib)(\/|$)/;
    const missed = ['dns', 'readline', 'worker_threads', 'vm', 'assert', 'async_hooks', 'perf_hooks', 'http2', 'tty', 'dgram', 'cluster', 'v8'].filter((m) => !old.test(m));
    assert.ok(missed.length >= 10);
    for (const m of missed) assert.equal(isNodeBuiltin(m), true, m);
  });

  test('check-bundle.ts uses it and keeps no list of its own', () => {
    const t = text('check-bundle.ts');
    assert.match(t, /from '\.\/node-builtins\.ts'/);
    assert.match(t, /isNodeBuiltin\(im\.path\)/);
    assert.ok(!/child_process\|stream\|buffer/.test(t.replace(/execFileSync/g, '')), 'no hand-kept regular expression of module names');
    assert.match(text('node-builtins.ts'), /from 'node:module'/);
  });
});

/** The PowerShell code of a script: comment lines and trailing comments removed, so a text check cannot be satisfied by a comment. */
function code(name: string): string[] {
  return text(name)
    .split('\n')
    .map((l) => l.replace(/\s+#.*$/, '').trimEnd())
    .filter((l) => l.trim() && !l.trim().startsWith('#'));
}
const firstIndex = (lines: string[], re: RegExp): number => lines.findIndex((l) => re.test(l));
const REMOVAL = /foreach \(\$name in 'ANTHROPIC_API_KEY', 'DASHSCOPE_API_KEY'\) \{ Remove-Item "Env:\$name" -ErrorAction SilentlyContinue \}/;

describe('deploy.ps1 and set-secrets.ps1: the keys stay out of child processes (text)', () => {
  test('deploy.ps1 removes both keys from its environment before any step runs, and never reads them', () => {
    const c = code('deploy.ps1');
    const removal = firstIndex(c, REMOVAL);
    assert.ok(removal >= 0, 'both names are removed');
    const firstRun = firstIndex(c, /\b(npm|node|Invoke-Step)\b/);
    assert.ok(firstRun > removal, `removal (line ${removal}) comes before the first command (line ${firstRun}: ${c[firstRun]})`);
    assert.ok(firstIndex(c, /Invoke-Step 'Install the shared code/) > removal);
    assert.ok(!c.some((l) => /\$env:(ANTHROPIC|DASHSCOPE)_API_KEY|GetEnvironmentVariable/.test(l)), 'deploy.ps1 has no use for either key');
  });

  test('set-secrets.ps1 removes both keys first, reads each from the user scope inside a function, only when its put runs', () => {
    const c = code('set-secrets.ps1');
    const removal = firstIndex(c, REMOVAL);
    assert.ok(removal >= 0);
    assert.ok(firstIndex(c, /^param\(|^\)$/) < removal, 'right after the parameters');
    const firstRun = firstIndex(c, /(&\s*node|\bnpm\b|Push-Location)/);
    assert.ok(firstRun > removal, 'before the first command');
    assert.ok(!c.some((l) => /\$env:(ANTHROPIC|DASHSCOPE)_API_KEY/.test(l)), 'neither key is read from the shell environment');
    const reads = c.map((l, i) => [i, l] as const).filter(([, l]) => /GetEnvironmentVariable\(/.test(l));
    assert.equal(reads.length, 1, 'one place reads the user scope');
    assert.match(reads[0][1], /GetEnvironmentVariable\(\$Name, 'User'\)/);
    const fn = firstIndex(c, /^function Get-UserSecret/);
    assert.ok(fn >= 0 && fn < reads[0][0] && reads[0][0] < firstIndex(c, /^function Invoke-Put/), 'inside Get-UserSecret');
    const uses = c.map((l, i) => [i, l] as const).filter(([, l]) => /Get-UserSecret '/.test(l));
    assert.equal(uses.length, 2, 'once per key');
    for (const [i] of uses) assert.ok(i > firstRun, 'only after the secret list has run, right where the key is put');
    // the value goes into the environment of the put call only, and comes out of it again in a finally block
    const putFn = c.slice(firstIndex(c, /^function Invoke-Put/), firstIndex(c, /^Push-Location/)).join('\n');
    assert.match(putFn, /Set-Item -Path "Env:\$Name" -Value \$Value/);
    assert.match(putFn, /finally \{\s*Remove-Item "Env:\$Name"/);
  });
});

const POWERSHELL = process.platform === 'win32' && spawnSync('powershell.exe', ['-NoProfile', '-Command', 'exit 0'], { timeout: 20_000 }).status === 0;

describe('deploy.ps1 and set-secrets.ps1 in Windows PowerShell', { skip: !POWERSHELL && 'needs Windows PowerShell' }, () => {
  const ps = (args: string[], env: NodeJS.ProcessEnv): { status: number | null; out: string } => {
    const r = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', ...args], { env, encoding: 'utf8', timeout: 90_000 });
    return { status: r.status, out: `${r.stdout}\n${r.stderr}` };
  };
  /** A directory first on PATH with a `name`.cmd that records, per call, whether each key is in its environment. */
  function fakeTool(name: string): { dir: string; log: string; env: (extra?: Record<string, string>) => NodeJS.ProcessEnv } {
    const dir = mkdtempSync(path.join(tmpdir(), `fake-${name}-`));
    const log = path.join(dir, 'calls.log');
    writeFileSync(path.join(dir, `${name}.cmd`), ['@echo off', 'set A=unset', 'set D=unset', 'if defined ANTHROPIC_API_KEY set A=SET', 'if defined DASHSCOPE_API_KEY set D=SET', `echo ${name} %1 %2 anthropic=%A% dashscope=%D%>>"${log}"`, 'exit /b %FAKE_EXIT%'].join('\r\n'));
    return {
      dir,
      log,
      env: (extra = {}) => {
        const env = cleanEnv({ CLOUDFLARE_EMAIL: 'test@example.com', CLOUDFLARE_API_KEY: 'not-a-real-cloudflare-key', FAKE_EXIT: '1', ANTHROPIC_API_KEY: 'sk-ant-FAKE-0123456789', DASHSCOPE_API_KEY: 'sk-FAKE-0123456789', ...extra });
        const pathKey = Object.keys(env).find((k) => k.toLowerCase() === 'path') ?? 'Path';
        env[pathKey] = `${dir};${env[pathKey] ?? ''}`;
        return env;
      },
    };
  }

  test('both scripts parse', () => {
    for (const name of ['deploy.ps1', 'set-secrets.ps1', 'save-anthropic-key.ps1']) {
      const r = ps(['-Command', `$e = $null; [void][System.Management.Automation.Language.Parser]::ParseFile('${path.join(SCRIPTS, name)}', [ref]$null, [ref]$e); exit $e.Count`], cleanEnv());
      assert.equal(r.status, 0, `${name}: ${r.out}`);
    }
  });

  test('deploy.ps1: the first npm ci already runs without either key in its environment', () => {
    const t = fakeTool('npm');
    try {
      const r = ps(['-File', path.join(SCRIPTS, 'deploy.ps1'), '-SkipTests'], t.env());
      assert.notEqual(r.status, 0, 'the fake npm fails, so the deploy stops at the first step');
      const calls = readFileSync(t.log, 'utf8').trim().split(/\r?\n/);
      assert.equal(calls.length, 1, 'stopped at the first npm call');
      assert.match(calls[0], /^npm ci .*anthropic=unset dashscope=unset$/);
      assert.ok(!r.out.includes('sk-ant-FAKE') && !r.out.includes('sk-FAKE-0123'));
    } finally {
      rmSync(t.dir, { recursive: true, force: true });
    }
  });

  test('set-secrets.ps1: neither `wrangler secret list` nor `put-secret.ts` inherits a key from the shell', () => {
    const t = fakeTool('node');
    try {
      const wrangler = here('../node_modules/wrangler/bin/wrangler.js');
      assert.ok(existsSync(wrangler), 'needs npm ci in apps/worker');
      const r = ps(['-File', path.join(SCRIPTS, 'set-secrets.ps1'), '-Only', 'SESSION_SECRET'], t.env({ FAKE_EXIT: '0' }));
      assert.equal(r.status, 0, r.out);
      const calls = readFileSync(t.log, 'utf8').trim().split(/\r?\n/);
      assert.equal(calls.length, 2, `secret list, then put-secret: ${calls.join(' | ')}`);
      for (const c of calls) assert.match(c, /anthropic=unset dashscope=unset$/, c);
      assert.ok(!r.out.includes('sk-ant-FAKE') && !r.out.includes('sk-FAKE-0123'));
    } finally {
      rmSync(t.dir, { recursive: true, force: true });
    }
  });
});
