# Saves your Anthropic API key as a Windows user environment variable (ANTHROPIC_API_KEY) without displaying it.
# The key is typed at a hidden prompt; nothing is printed or written to disk except the user environment.
# Run: powershell -ExecutionPolicy Bypass -File apps\worker\scripts\save-anthropic-key.ps1

$secure = Read-Host 'Paste your Anthropic API key (input is hidden), then press Enter' -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try { $key = ([Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)).Trim() } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }

if (-not $key.StartsWith('sk-ant-')) {
  Write-Host 'That does not look like an Anthropic API key (they start with sk-ant-). Nothing was saved.'
  exit 1
}

[Environment]::SetEnvironmentVariable('ANTHROPIC_API_KEY', $key, 'User')
$key = $null
Write-Host 'Saved ANTHROPIC_API_KEY for your Windows account. You can close this tab.'
