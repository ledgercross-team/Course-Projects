# Predict — on-chain prediction market (MVP)

Binary YES/NO prediction markets. Contracts are the backend (state, pricing, settlement all on-chain); a Next.js app is the frontend. Free to run end-to-end on Sepolia.

## Layout

```
src/              Solidity contracts (the "backend")
  PredictionMarket.sol   CPMM binary market — buy YES/NO, redeem winners 1:1
  MarketFactory.sol      deploys + registers markets
  MockUSDC.sol           test collateral with an open faucet (testnet only)
test/             Foundry tests (unit + fuzz + solvency invariant)
script/Deploy.s.sol       deploys USDC + factory + 3 demo markets
frontend/         Next.js + wagmi + viem + RainbowKit UI
```

## How it works

Every unit of collateral deposited mints one YES + one NO share, so the market is
**solvent by construction** (`collateralHeld == totalYesShares == totalNoShares`).
A constant-product AMM prices the two sides; the YES price = the implied probability.
After `closeTime`, the resolver reports the outcome and winning shares redeem 1:1.

## 1. Contracts

```bash
export PATH="$PATH:$HOME/.config/.foundry/bin"   # foundry on PATH
forge test              # 8 tests incl. 256-run solvency fuzz
forge build
```

Deploy to Sepolia (needs `.env` — copy `.env.example`):

```bash
forge script script/Deploy.s.sol --rpc-url sepolia --broadcast --verify
```

Copy the printed `MockUSDC` and `MarketFactory` addresses.

## 2. Frontend

```bash
cd frontend
cp .env.local.example .env.local      # paste the two addresses + RPC + WalletConnect id
npm install
npm run dev                           # http://localhost:3000
```

In the UI: connect wallet → **+ Faucet** (mints 1,000 test mUSDC) → pick a market →
Buy YES/NO. After close, the resolver wallet gets Resolve YES/NO buttons on the market
page; once resolved, winners redeem 1:1 and the creator withdraws the pool's remainder.

## Local testing with fake money

Everything runs locally on anvil — the ETH, the mUSDC, all of it is fake.

### 1. Chain + contracts

```bash
anvil                                                     # terminal 1 — local chain

# terminal 2 — deploy USDC + factory + 3 demo markets (anvil key #0)
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

cd frontend && npm run dev                                # terminal 3 — http://localhost:3000
```

The deploy addresses are deterministic on a fresh anvil and already match
`frontend/.env.local` — no config needed.

### 2. Wallet with fake money

1. In MetaMask/Rabby, add a network: RPC `http://127.0.0.1:8545`, chain id `31337`,
   currency ETH. (RainbowKit lists it as "Foundry" on Connect.)
2. Import an anvil account — each has 10,000 fake ETH. Use key #1 for trading
   (keep key #0 as the separate deployer/resolver wallet):
   ```
   0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
   ```
3. On the site: **Connect** → **+ Faucet** — mints 1,000 fake mUSDC per click.

### 3. Trade → resolve → redeem

- Pick a market, enter an amount, **Approve mUSDC**, then **Buy Yes/No**. Watch the price move.
- Demo markets close in 30 days. Skip ahead instead of waiting:
  ```bash
  cast rpc evm_increaseTime 2592000 --rpc-url http://127.0.0.1:8545
  cast rpc evm_mine --rpc-url http://127.0.0.1:8545
  ```
- After close, connect the deployer wallet (key #0 — it's the resolver): the market page
  shows **Resolve YES / Resolve NO**.
- Switch back to the trading wallet → **Redeem** pays winners 1 mUSDC per share. The
  creator (key #0) also gets a **Withdraw liquidity** button.

Caveat: after `evm_increaseTime` the UI countdown still uses your real clock, so it can
say "29d" while the chain already considers the market closed (buys revert with
`MarketClosed`). This mismatch only exists with local time-warping, never on a real
network. Restart anvil + redeploy for a clean slate.

## Free resources

- Sepolia ETH: sepoliafaucet.com, faucets.chain.link, Google Cloud Web3 faucet
- RPC key: alchemy.com free tier
- WalletConnect id: reown.com free
- Host frontend: Vercel free tier

## Deliberately deferred (MVP simplifications)

- **Selling shares** — v1 is buy + hold to resolution. Add `calcSellAmount` + `sell()` next.
- **Chainlink resolution** — resolver is an address for now; swap in a Chainlink Data Feed
  adapter (price markets) or Automation (auto-settle on close). Interface is ready for it.
- **Transferable shares** — balances are internal mappings, not ERC1155. Fine for MVP.
- **Indexer** — the frontend reads the chain directly. Add a The Graph subgraph only when
  list/aggregate queries get slow.
- **Fees** — no trading fee. Add a bps cut in `buy()` when you want LP revenue.
