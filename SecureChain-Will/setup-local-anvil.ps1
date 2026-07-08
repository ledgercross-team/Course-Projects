param(
  [string]$Creator = "",

  [string]$Witness = "",

  [string]$Beneficiary = "",

  [string]$RpcUrl = "http://127.0.0.1:8545",
  [string]$AdminPrivateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  [switch]$SkipDatabaseWallets
)

$ErrorActionPreference = "Stop"

function Assert-Tool($Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "$Name is required. Install Foundry and make sure $Name is on PATH."
  }
}

function Assert-Address($Name, $Address) {
  if ($Address -notmatch "^0x[a-fA-F0-9]{40}$") {
    throw "$Name must be a full 0x Ethereum address."
  }
}

function Set-EnvValue($Path, $Key, $Value) {
  $line = "$Key=$Value"

  if (Test-Path $Path) {
    $content = Get-Content -LiteralPath $Path
  } else {
    $content = @()
  }

  $updated = $false
  $next = foreach ($item in $content) {
    if ($item -match "^\s*$([regex]::Escape($Key))=") {
      $updated = $true
      $line
    } else {
      $item
    }
  }

  if (-not $updated) {
    $next += $line
  }

  Set-Content -LiteralPath $Path -Value $next
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$contractDir = Join-Path $root "smart-contract"
$backendDir = Join-Path $root "backend"
$frontendEnv = Join-Path $root "frontend\.env"
$backendEnv = Join-Path $root "backend\.env"
$frontendContractDir = Join-Path $root "frontend\src\contracts"

Assert-Tool "forge"
Assert-Tool "cast"

$adminWallet = (cast wallet address --private-key $AdminPrivateKey).Trim()
Assert-Address "Admin wallet" $adminWallet

$fundAddresses = [System.Collections.Generic.List[string]]::new()
$fundAddresses.Add($adminWallet.ToLowerInvariant())

foreach ($entry in @(
  @{ Name = "Creator"; Value = $Creator },
  @{ Name = "Witness"; Value = $Witness },
  @{ Name = "Beneficiary"; Value = $Beneficiary }
)) {
  if (-not [string]::IsNullOrWhiteSpace($entry.Value)) {
    Assert-Address $entry.Name $entry.Value
    $fundAddresses.Add($entry.Value.ToLowerInvariant())
  }
}

if (-not $SkipDatabaseWallets) {
  Push-Location $backendDir
  try {
    $walletJson = @'
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const Will = require("./models/Will");

(async () => {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/securechain_will");
  const users = await User.find({}, { wallet: 1 }).lean();
  const wills = await Will.find({}, { creatorWallet: 1, witnessWallet: 1, beneficiaryWallet: 1 }).lean();
  const wallets = new Set();
  for (const user of users) if (user.wallet) wallets.add(user.wallet.toLowerCase());
  for (const will of wills) {
    for (const key of ["creatorWallet", "witnessWallet", "beneficiaryWallet"]) {
      if (will[key]) wallets.add(will[key].toLowerCase());
    }
  }
  console.log(JSON.stringify([...wallets]));
  await mongoose.disconnect();
})().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
'@ | node -

    foreach ($wallet in ($walletJson | ConvertFrom-Json)) {
      Assert-Address "Database wallet" $wallet
      $fundAddresses.Add($wallet.ToLowerInvariant())
    }
  } finally {
    Pop-Location
  }
}

$fundAddresses = @($fundAddresses | Sort-Object -Unique)
if ($fundAddresses.Count -eq 0) {
  throw "No wallet addresses found. Pass -Creator, -Witness, or -Beneficiary with full 0x addresses."
}

Push-Location $contractDir
try {
  forge build

  $previousPrivateKey = $env:PRIVATE_KEY
  $env:PRIVATE_KEY = $AdminPrivateKey
  $deployOutput = forge script script/Deploy.s.sol:DeployWillRegistry `
    --rpc-url $RpcUrl `
    --private-key $AdminPrivateKey `
    --broadcast 2>&1

  $deployText = $deployOutput -join "`n"
  if ($deployText -notmatch "WillRegistry deployed at:\s*(0x[a-fA-F0-9]{40})") {
    Write-Host $deployText
    throw "Could not find deployed contract address in forge output."
  }

  $contractAddress = $Matches[1]
} finally {
  if ($null -eq $previousPrivateKey) {
    Remove-Item Env:\PRIVATE_KEY -ErrorAction SilentlyContinue
  } else {
    $env:PRIVATE_KEY = $previousPrivateKey
  }
  Pop-Location
}

New-Item -ItemType Directory -Force -Path $frontendContractDir | Out-Null
Copy-Item `
  -LiteralPath (Join-Path $contractDir "out\WillRegistry.sol\WillRegistry.json") `
  -Destination (Join-Path $frontendContractDir "WillRegistry.json") `
  -Force

$balanceHex = "0x3635C9ADC5DEA00000" # 1000 ETH
foreach ($address in $fundAddresses) {
  cast rpc anvil_setBalance $address $balanceHex --rpc-url $RpcUrl | Out-Null
}

Set-EnvValue $frontendEnv "VITE_CONTRACT_ADDRESS" $contractAddress
Set-EnvValue $frontendEnv "VITE_CHAIN_ID" "31337"
Set-EnvValue $frontendEnv "VITE_CHAIN_NAME" "Localhost 8545"
if (-not [string]::IsNullOrWhiteSpace($Witness)) {
  Set-EnvValue $frontendEnv "VITE_DEMO_WITNESS_WALLET" $Witness
}
if (-not [string]::IsNullOrWhiteSpace($Beneficiary)) {
  Set-EnvValue $frontendEnv "VITE_DEMO_BENEFICIARY_WALLET" $Beneficiary
}
Set-EnvValue $frontendEnv "VITE_DEMO_ADMIN_WALLET" $adminWallet

Set-EnvValue $backendEnv "BLOCKCHAIN_RPC_URL" $RpcUrl
Set-EnvValue $backendEnv "CONTRACT_ADDRESS" $contractAddress
Set-EnvValue $backendEnv "ADMIN_PRIVATE_KEY" $AdminPrivateKey

Write-Host "Local Anvil setup complete."
Write-Host "Contract: $contractAddress"
Write-Host "Funded wallets with 1000 ETH on ${RpcUrl}:"
foreach ($address in $fundAddresses) {
  Write-Host "  $address"
}
Write-Host "Restart backend and frontend dev servers so they read the updated .env files."
