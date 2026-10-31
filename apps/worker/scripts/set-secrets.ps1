# Sets the alichitect Worker's secrets on Cloudflare. You run this yourself; nothing here prints a secret.
#
#   powershell -ExecutionPolicy Bypass -File apps\worker\scripts\set-secrets.ps1
#   powershell -ExecutionPolicy Bypass -File apps\worker\scripts\set-secrets.ps1 -Only DASHSCOPE_API_KEY
#   powershell -ExecutionPolicy Bypass -File apps\worker\scripts\set-secrets.ps1 -Only SESSION_SECRET -RotateSession
#
#   DASHSCOPE_API_KEY     read from your environment (the same variable the local server uses)
#   GOOGLE_CLIENT_SECRET  asked for with a hidden prompt (Google Cloud Console > Clients > the OAuth client)
#   SESSION_SECRET        generated: 48 random bytes. Set once; skipped when it already exists, because a new one signs
#                         everybody out. -RotateSession replaces it on purpose.
#
# Wrangler signs in with CLOUDFLARE_EMAIL and CLOUDFLARE_API_KEY from your environment. Each value reaches
# `wrangler secret put` on standard input through scripts\put-secret.ts (never a command-line argument, never a file).
# Needs `npm ci` in apps\worker first. If the Worker does not exist yet, wrangler creates it (with no route) to hold
# the secrets; the first deploy then fills it in.
param(
  [ValidateSet('DASHSCOPE_API_KEY', 'GOOGLE_CLIENT_SECRET', 'SESSION_SECRET')]
  [string[]]$Only = @('DASHSCOPE_API_KEY', 'GOOGLE_CLIENT_SECRET', 'SESSION_SECRET'),
  [switch]$RotateSession
)
$ErrorActionPreference = 'Stop'
$worker = Split-Path -Parent $PSScriptRoot
$wrangler = Join-Path $worker 'node_modules\wrangler\bin\wrangler.js'
$put = Join-Path $PSScriptRoot 'put-secret.ts'
if (-not (Test-Path $wrangler)) { throw "wrangler is not installed: run 'npm ci' in $worker first." }
if (-not $env:CLOUDFLARE_EMAIL -or -not $env:CLOUDFLARE_API_KEY) { throw 'Set CLOUDFLARE_EMAIL and CLOUDFLARE_API_KEY in your environment first.' }
$env:CLOUDFLARE_ACCOUNT_ID = 'cfd2a327acfb7d93dc045825f12dd38d'
$env:WRANGLER_SEND_METRICS = 'false'
Remove-Item Env:CLOUDFLARE_API_TOKEN -ErrorAction SilentlyContinue # use the global key from the environment

function Invoke-Put([string]$Name, [string[]]$Extra = @()) {
  & node $put $Name @Extra
  if ($LASTEXITCODE -ne 0) { throw "Setting $Name failed (exit $LASTEXITCODE)." }
}

Push-Location $worker
try {
  $existing = @()
  $json = & node $wrangler secret list --env= --format json 2>$null
  if ($LASTEXITCODE -eq 0 -and $json) {
    try { $existing = @(($json | Out-String | ConvertFrom-Json) | ForEach-Object { $_.name }) } catch { $existing = @() }
  }
  Write-Host "Secrets already on the Worker: $(if ($existing.Count) { $existing -join ', ' } else { 'none' })"

  if ($Only -contains 'DASHSCOPE_API_KEY') {
    if (-not $env:DASHSCOPE_API_KEY) { throw 'DASHSCOPE_API_KEY is not set in your environment.' }
    Invoke-Put 'DASHSCOPE_API_KEY'
  }

  if ($Only -contains 'GOOGLE_CLIENT_SECRET') {
    $secure = Read-Host -AsSecureString 'Google OAuth client secret (input hidden)'
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
      # only for the next call, in this process; removed right after
      $env:GOOGLE_CLIENT_SECRET = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
      Invoke-Put 'GOOGLE_CLIENT_SECRET'
    } finally {
      [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
      Remove-Item Env:GOOGLE_CLIENT_SECRET -ErrorAction SilentlyContinue
    }
  }

  if ($Only -contains 'SESSION_SECRET') {
    if (($existing -contains 'SESSION_SECRET') -and -not $RotateSession) {
      Write-Host 'SESSION_SECRET exists: kept (pass -RotateSession to replace it; that signs everybody out).'
    } else {
      Invoke-Put 'SESSION_SECRET' @('--generate')
    }
  }
  Write-Host 'Done. `wrangler secret put` deploys each secret at once; no redeploy is needed.'
} finally {
  Pop-Location
}
