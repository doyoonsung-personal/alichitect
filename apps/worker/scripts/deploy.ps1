# Production deploy of https://architect.alikorea-demo.com, in this order, stopping at the first failure:
#   1. preflight: wrangler.jsonc has no placeholder left (the D1 id), no local-only switch, and the email binding
#   2. build the web app (apps/web/dist, which the Worker serves as static assets)
#   3. test the Worker
#   4. apply the remote D1 migrations
#   5. wrangler deploy
#
#   powershell -ExecutionPolicy Bypass -File apps\worker\scripts\deploy.ps1
#
# Wrangler signs in with CLOUDFLARE_EMAIL and CLOUDFLARE_API_KEY from your environment. Secrets are set separately with
# scripts\set-secrets.ps1 (once; they survive deploys). Roll back with: npx wrangler rollback (docs/DEPLOY.md).
param([switch]$SkipTests)
$ErrorActionPreference = 'Stop'
# No step below needs the Model Studio or Anthropic key: they live on the Worker (scripts\set-secrets.ps1 puts them there).
# `npm ci` runs the install scripts of every dependency and the build runs more third-party code, and a child process
# inherits this process's environment, so the keys are removed from it before anything runs. (Removing them here does not
# touch the Windows user variables; set-secrets.ps1 reads those at the moment it needs them.)
foreach ($name in 'ANTHROPIC_API_KEY', 'DASHSCOPE_API_KEY') { Remove-Item "Env:$name" -ErrorAction SilentlyContinue }
$worker = Split-Path -Parent $PSScriptRoot
$web = Join-Path (Split-Path -Parent $worker) 'web'
if (-not $env:CLOUDFLARE_EMAIL -or -not $env:CLOUDFLARE_API_KEY) { throw 'Set CLOUDFLARE_EMAIL and CLOUDFLARE_API_KEY in your environment first.' }
$env:CLOUDFLARE_ACCOUNT_ID = 'cfd2a327acfb7d93dc045825f12dd38d'
$env:WRANGLER_SEND_METRICS = 'false'
Remove-Item Env:CLOUDFLARE_API_TOKEN -ErrorAction SilentlyContinue

function Invoke-Step([string]$Title, [string]$Dir, [scriptblock]$Block) {
  Write-Host "`n== $Title" -ForegroundColor Cyan
  Push-Location $Dir
  try {
    & $Block
    if ($LASTEXITCODE -ne 0) { throw "$Title failed (exit $LASTEXITCODE)." }
  } finally {
    Pop-Location
  }
}

Invoke-Step 'Install the shared code (the Anthropic SDK the Worker bundles)' (Join-Path (Split-Path -Parent (Split-Path -Parent $worker)) 'packages\core') { npm ci --no-audit --no-fund }
Invoke-Step 'Install the Worker tools' $worker { npm ci --no-audit --no-fund }
Invoke-Step 'Preflight' $worker { node scripts/preflight.ts }
Invoke-Step 'Build the web app' $web { npm ci --no-audit --no-fund; if ($LASTEXITCODE -eq 0) { npm run build } }
if (-not $SkipTests) { Invoke-Step 'Test the Worker' $worker { npm test } }
Invoke-Step 'Apply D1 migrations (remote)' $worker { node node_modules/wrangler/bin/wrangler.js d1 migrations apply alichitect --remote --env= }
Invoke-Step 'Deploy the Worker' $worker { node node_modules/wrangler/bin/wrangler.js deploy --env= }
Write-Host "`nDeployed. Check: https://architect.alikorea-demo.com/api/health" -ForegroundColor Green
