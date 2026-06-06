# Crowdfund DApp

A decentralized crowdfunding platform built with Solidity, Hardhat, Next.js, Wagmi, and MetaMask. Users can create fundraising campaigns, contribute ETH, approve spending requests, and manage campaign funds transparently on the blockchain.

## Features

- Create crowdfunding campaigns
- Contribute ETH to campaigns
- View campaign details and funding status
- Create spending requests
- Approve spending requests
- Finalize approved requests and release funds
- MetaMask wallet integration
- Hardhat local blockchain support

## Tech Stack

- Solidity
- Hardhat
- Next.js
- TypeScript
- Wagmi
- Viem
- Tailwind CSS
- MetaMask

## Getting Started

### Install Dependencies

```bash
npm install

cd frontend
npm install
```

### Start Local Blockchain

```bash
npx hardhat node
```

### Deploy Contracts

```bash
npx hardhat ignition deploy ./ignition/modules/CampaignFactory.ts --network localhost
```

### Run Frontend

```bash
cd frontend
npm run dev
```

Open http://localhost:3000 in your browser.

## Workflow

1. Create a campaign
2. Contribute ETH to the campaign
3. Create spending requests
4. Contributors approve requests
5. Manager finalizes approved requests
6. Funds are transferred to the recipient