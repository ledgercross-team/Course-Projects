$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$mongod = Join-Path $root "mongodb-portable\mongodb-win32-x86_64-windows-8.0.12\bin\mongod.exe"

$processes = Get-Process mongod -ErrorAction SilentlyContinue |
  Where-Object { $_.Path -eq $mongod }

if (-not $processes) {
  Write-Host "MongoDB is not running from this project."
  exit 0
}

$processes | Stop-Process
Write-Host "MongoDB stopped."
