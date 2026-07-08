param(
  [Parameter(Mandatory = $true)]
  [string]$Address,

  [string]$RpcUrl = "http://127.0.0.1:8545",
  [string]$Eth = "1000"
)

$ErrorActionPreference = "Stop"

if ($Address -notmatch "^0x[a-fA-F0-9]{40}$") {
  throw "Address must be a full 0x Ethereum address."
}

if (-not (Get-Command cast -ErrorAction SilentlyContinue)) {
  throw "cast is required. Install Foundry and make sure cast is on PATH."
}

$wei = cast to-wei $Eth ether
$hexWei = "0x" + ([System.Numerics.BigInteger]::Parse($wei).ToString("x"))

cast rpc anvil_setBalance $Address $hexWei --rpc-url $RpcUrl | Out-Null
$balance = cast balance $Address --ether --rpc-url $RpcUrl

Write-Host "Funded $Address"
Write-Host "Balance: $balance ETH"
