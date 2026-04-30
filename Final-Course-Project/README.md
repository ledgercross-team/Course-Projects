# Kickstart (Ethereum Campaign DApp)

A simple crowdfunding-style DApp:
(basic ui to experiment with deploying contract and building a user interface that works)

- **Solidity contracts** in `contracts/` (compiled artifacts in `ethereum/build/`)
- **Web3 helpers** in `ethereum/`
- **Next.js UI** in `pages/` (served via a small custom server in `server.js`)
- **Deploy script** in `deploy.js` to deploy the `CampaignFactory` contract

## Prerequisites

- Node.js (LTS recommended)
- An Ethereum RPC endpoint (e.g. Infura/Alchemy) for the target network
- A wallet seed phrase **ONLY for local development** (never commit secrets)

## Install

```bash
npm install
```

## Environment variables

Create a `.env` file in the project root (it is ignored by git via `.gitignore`).

Example:

```bash
# Used by the deploy script to sign transactions. The vars can be obtained by following the udemy ethereum and solidity courses's module instruction regarding metamask dev account and infura
MNEMONIC=''

# RPC URL used for deployments / server-side calls
INFURA_URL='https://sepolia.infura.io/v3/<projectId>'

#the url and address for next.js config is optional
#the address youd get after deploying the contract
FACTORY_ADDRESS=0x...


Notes:

- Variables prefixed with `NEXT_PUBLIC_` can be embedded into client-side bundles by Next.js.
- real mnemonics or private keys have been extracted from the .env prior to zipping. 

## Compile contracts

This project includes a compile script:

```bash
node ethereum/compile.js
```

It writes build artifacts into `ethereum/build/`.

## Deploy the factory contract

Deploy `CampaignFactory` using the configured `MNEMONIC` + `INFURA_URL`:

```bash
npm run deploy
```

After deployment, copy the printed address into your `.env` as `FACTORY_ADDRESS` (and optionally `NEXT_PUBLIC_FACTORY_ADDRESS`).

## Run the app

Start the Next.js app (custom server on port 3000):

```bash
npm run dev
```

Then open http://localhost:3000

## Tests

```bash
npm test
```

## Troubleshooting

- If the UI shows a “Missing FACTORY_ADDRESS” warning, deploy the factory and set `FACTORY_ADDRESS`.
- If the browser can’t send transactions, ensure MetaMask is installed and connected to the same network.
- If deployment fails, verify the RPC URL is correct and the deploying account has test ETH.
