$ErrorActionPreference = 'Stop'
$source = $PSScriptRoot
$target = Join-Path $env:LOCALAPPDATA 'PongX'
New-Item -ItemType Directory -Force -Path $target | Out-Null
Copy-Item -Path (Join-Path $source '*') -Destination $target -Recurse -Force
$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
$parts = @($userPath -split ';' | Where-Object { $_ })
if ($parts -notcontains $target) {
  [Environment]::SetEnvironmentVariable('Path', (($parts + $target) -join ';'), 'User')
}
Write-Host 'PongX installed for the current Windows user.' -ForegroundColor Green
Write-Host 'Close and reopen your terminal, then run: pongx login'
