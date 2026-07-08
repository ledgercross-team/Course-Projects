$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$mongoRoot = Join-Path $root "mongodb-portable"
$mongod = Join-Path $mongoRoot "mongodb-win32-x86_64-windows-8.0.12\bin\mongod.exe"
$config = Join-Path $mongoRoot "mongod.cfg"

if (-not (Test-Path -LiteralPath $mongod)) {
  throw "mongod.exe was not found at $mongod"
}

New-Item -ItemType Directory -Force `
  (Join-Path $mongoRoot "data\db"), `
  (Join-Path $mongoRoot "logs") | Out-Null

$existing = Get-Process mongod -ErrorAction SilentlyContinue |
  Where-Object { $_.Path -eq $mongod }

if ($existing) {
  Write-Host "MongoDB is already running on process id $($existing.Id)."
  exit 0
}

Start-Process -FilePath $mongod -ArgumentList "--config", "`"$config`"" -WindowStyle Hidden
Write-Host "MongoDB started on mongodb://127.0.0.1:27017"
