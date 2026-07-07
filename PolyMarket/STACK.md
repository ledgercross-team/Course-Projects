# Tech Stack — Prediction Market MVP (July 2026)

All free on testnet. Target spend: **$0**.

## Contracts
- **Solidity** `^0.8.28` (pin exactly)
- **OpenZeppelin Contracts v5** — ERC1155 (outcome shares), Ownable2Step, ReentrancyGuard, SafeERC20, Pausable
- **Collateral** — test USDC (ERC20) on Sepolia
- **Market model** — CPMM AMM (constant-product), Factory + EIP-1167 clones per market

## Resolution (pick one)
- Price questions → **Chainlink Data Feeds**
- Auto-settle on expiry → **Chainlink Automation**
- Arbitrary events (later) → Chainlink Functions or UMA Optimistic Oracle V3

_v1 = Data Feeds + Automation (price markets only)._

## Dev / Test
- **Foundry** — forge (build/test/fuzz), cast, anvil (local chain)
- forge-std — unit + fuzz + invariant tests
- **Slither** + `forge fmt` — static analysis before deploy
- **GitHub Actions** — `forge test` + `forge coverage` + Slither on PR

## Infra (free tier)
- **Network** — Sepolia
- **RPC** — Alchemy or Infura free key
- **Deploy** — `forge script --broadcast --verify`
- **Verify** — Etherscan free API key
- Secrets in `.env` (burner key only, never commit)

## Frontend (optional)
- Next.js + wagmi + viem + RainbowKit
- Host: Vercel / Cloudflare Pages free tier
- WalletConnect ID: free from reown.com

## Free resources
- Sepolia ETH: sepoliafaucet.com, faucets.chain.link, Google Cloud Web3 faucet
- Test LINK: faucets.chain.link
- Google Cloud: $300 free credit (not needed for testnet)

## MVP loop
1. `forge init` → build + test on anvil (local, free)
2. Faucet: free Sepolia ETH + LINK
3. `forge script --broadcast --verify` → Sepolia via free RPC
4. (optional) deploy frontend to Vercel free

## Deferred (post-MVP)
- UMA / arbitrary-event resolution
- CLOB order-book (real Polymarket model)
- Mainnet deploy (only real cost = gas)
