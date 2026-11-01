# Sets the alichitect Worker's secrets on Cloudflare. You run this yourself; nothing here prints a secret.
#
#   powershell -ExecutionPolicy Bypass -File apps\worker\scripts\set-secrets.ps1
#   powershell -ExecutionPolicy Bypass -File apps\worker\scripts\set-secrets.ps1 -Only DASHSCOPE_API_KEY
#   powershell -ExecutionPolicy Bypass -File apps\worker\scripts\set-secrets.ps1 -Only ANTHROPIC_API_KEY
#   powershell -ExecutionPolicy Bypass -File apps\worker\scripts\set-secrets.ps1 -Only SESSION_SECRET -RotateSession
#
#   DASHSCOPE_API_KEY  read from your Windows user environment ([Environment]::GetEnvironmentVariable('DASHSCOPE_API_KEY',
#                      'User'): the same variable the local server uses), at the moment it is put and not before
#   ANTHROPIC_API_KEY  optional: the Claude backup that finishes turns Model Studio's content filter stops. Read from your
#                      Windows user environment the same way (save-anthropic-key.ps1 writes it, so a value saved after
#                      this shell started still counts). When it is absent it is skipped and the Worker runs without the
#                      backup. To turn the backup off later: node node_modules\wrangler\bin\wrangler.js secret delete ANTHROPIC_API_KEY --env=
#   SESSION_SECRET     generated: 48 random bytes. It signs the session and code-flow cookies and keys the stored
#                      email-code and throttle HMACs. Set once; skipped when it already exists, because a new one signs
#                      everybody out and voids every code in flight. -RotateSession replaces it on purpose.
#
# Neither key stays in this process's environment: both are removed from it first thing, so no child process (node,
# wrangler and whatever they load) inherits them. Each is read from the user scope only when its own put runs, handed to
# put-secret.ts through the environment of that one call (never a command-line argument, never a file), and removed again
# straight after. put-secret.ts checks the value's shape (sk-ant- for the Anthropic key, never for the Model Studio key).
#
# There is nothing else: accounts are email and password (no identity provider, so no client secret), and the codes
# go out through the Email Service binding, which needs no secret.
#
# Wrangler signs in with CLOUDFLARE_EMAIL and CLOUDFLARE_API_KEY from your environment. Each value reaches
# `wrangler secret put` on standard input through scripts\put-secret.ts.
# Needs `npm ci` in apps\worker first. If the Worker does not exist yet, wrangler creates it (with no route) to hold
# the secrets; the first deploy then fills it in.
param(
  [ValidateSet('DASHSCOPE_API_KEY', 'ANTHROPIC_API_KEY', 'SESSION_SECRET')]
  [string[]]$Only = @('DASHSCOPE_API_KEY', 'ANTHROPIC_API_KEY', 'SESSION_SECRET'),
  [switch]$RotateSession
)
$ErrorActionPreference = 'Stop'
foreach ($name in 'ANTHROPIC_API_KEY', 'DASHSCOPE_API_KEY') { Remove-Item "Env:$name" -ErrorAction SilentlyContinue }
$worker = Split-Path -Parent $PSScriptRoot
$wrangler = Join-Path $worker 'node_modules\wrangler\bin\wrangler.js'
$put = Join-Path $PSScriptRoot 'put-secret.ts'
if (-not (Test-Path $wrangler)) { throw "wrangler is not installed: run 'npm ci' in $worker first." }
if (-not $env:CLOUDFLARE_EMAIL -or -not $env:CLOUDFLARE_API_KEY) { throw 'Set CLOUDFLARE_EMAIL and CLOUDFLARE_API_KEY in your environment first.' }
$env:CLOUDFLARE_ACCOUNT_ID = 'cfd2a327acfb7d93dc045825f12dd38d'
$env:WRANGLER_SEND_METRICS = 'false'
Remove-Item Env:CLOUDFLARE_API_TOKEN -ErrorAction SilentlyContinue # use the global key from the environment

# A key from the Windows user environment, read now and not earlier; $null when it is absent or blank.
function Get-UserSecret([string]$Name) {
  $v = [Environment]::GetEnvironmentVariable($Name, 'User')
  if ($v -and $v.Trim()) { return $v.Trim() }
  return $null
}

# Runs put-secret.ts for one secret. A value (a key read from the user environment) is in this process's environment only
# for the length of the call, and is removed afterwards even when the call fails.
function Invoke-Put([string]$Name, [string[]]$Extra = @(), [string]$Value = '') {
  if ($Value) { Set-Item -Path "Env:$Name" -Value $Value }
  try {
    & node $put $Name @Extra
    if ($LASTEXITCODE -ne 0) { throw "Setting $Name failed (exit $LASTEXITCODE)." }
  } finally {
    Remove-Item "Env:$Name" -ErrorAction SilentlyContinue
  }
}

Push-Location $worker
try {
  $existing = @()
  # Before the first deploy the Worker does not exist yet and `secret list` fails; treat that as "no secrets".
  $json = $null
  $prevPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try { $json = & node $wrangler secret list --env= --format json 2>$null } catch { $json = $null }
  $ErrorActionPreference = $prevPreference
  if ($LASTEXITCODE -eq 0 -and $json) {
    try { $existing = @(($json | Out-String | ConvertFrom-Json) | ForEach-Object { $_.name }) } catch { $existing = @() }
  }
  Write-Host "Secrets already on the Worker: $(if ($existing.Count) { $existing -join ', ' } else { 'none' })"

  if ($Only -contains 'DASHSCOPE_API_KEY') {
    $dashscope = Get-UserSecret 'DASHSCOPE_API_KEY'
    if (-not $dashscope) { throw 'DASHSCOPE_API_KEY is not set in your Windows user environment (this script reads it from there, not from the shell). Save it there first.' }
    try { Invoke-Put 'DASHSCOPE_API_KEY' -Value $dashscope } finally { $dashscope = $null }
  }

  if ($Only -contains 'ANTHROPIC_API_KEY') {
    $anthropic = Get-UserSecret 'ANTHROPIC_API_KEY'
    if ($anthropic) {
      try { Invoke-Put 'ANTHROPIC_API_KEY' -Value $anthropic } finally { $anthropic = $null }
      Write-Host 'ANTHROPIC_API_KEY set: the Claude backup is on (model CLAUDE_BACKUP_MODEL in wrangler.jsonc).'
    } else {
      Write-Host 'ANTHROPIC_API_KEY is not in your Windows user environment: skipped. The Worker runs without the Claude backup.'
      if ($Only.Count -eq 1) { throw 'Nothing was set: save the key first with apps\worker\scripts\save-anthropic-key.ps1.' }
    }
  }

  if ($Only -contains 'SESSION_SECRET') {
    if (($existing -contains 'SESSION_SECRET') -and -not $RotateSession) {
      Write-Host 'SESSION_SECRET exists: kept (pass -RotateSession to replace it; that signs everybody out).'
    } else {
      Invoke-Put 'SESSION_SECRET' @('--generate')
    }
  }

  if ($existing -contains 'GOOGLE_CLIENT_SECRET') {
    Write-Host 'GOOGLE_CLIENT_SECRET is still on the Worker from the Google sign-in, which is gone. Remove it with:'
    Write-Host '  node node_modules\wrangler\bin\wrangler.js secret delete GOOGLE_CLIENT_SECRET --env='
  }
  Write-Host 'Done. `wrangler secret put` deploys each secret at once; no redeploy is needed.'
} finally {
  Pop-Location
}
