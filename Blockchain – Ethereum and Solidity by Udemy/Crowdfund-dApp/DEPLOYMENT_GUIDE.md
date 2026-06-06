# Crowdfund DApp - Final Deployment & Usage Guide

This guide provides step-by-step instructions to deploy and run the production-quality decentralized crowdfunding platform.

## 1. Prerequisites
- Node.js (v20+ recommended)
- An Ethereum wallet (e.g., MetaMask) with Sepolia ETH (for testnet deployment)
- Alchemy or Infura API Key (for Sepolia deployment)

---

## 2. Smart Contract Deployment (Hardhat v3)

### A. Environment Setup
1. Navigate to the root directory: `cd crowdfund-dapp`
2. Create a `.env` file based on `.env.example`:
   ```bash
   SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
   PRIVATE_KEY=your_wallet_private_key
   ETHERSCAN_API_KEY=your_etherscan_key
   ```

### B. Local Deployment (Hardhat Node)
1. Start a local node:
   ```bash
   npx hardhat node
   ```
2. Deploy the factory in a new terminal:
   ```bash
   npx hardhat ignition deploy ./ignition/modules/CampaignFactory.ts --network localhost
   ```

### C. Sepolia Deployment
1. Deploy the factory:
   ```bash
   npx hardhat ignition deploy ./ignition/modules/CampaignFactory.ts --network sepolia
   ```
2. Note the deployed `CampaignFactory` address from the output.

---

## 3. Frontend Configuration (Next.js 15)

### A. Update Factory Address
1. Open `frontend/src/constants/index.ts`.
2. Update `FACTORY_ADDRESS` with your deployed address:
   ```typescript
   export const FACTORY_ADDRESS = '0xYourDeployedAddressHere' as `0x${string}`;
   ```

### B. Run the Frontend
1. Navigate to the frontend directory: `cd crowdfund-dapp/frontend`
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 4. Platform Usage Instructions

### 1. Connect Wallet
Click the **Connect Wallet** button in the navbar. Ensure your wallet is on the correct network (Sepolia or Localhost).

### 2. Create a Campaign
- Navigate to **Create Campaign**.
- Provide a Title, Description, Image URL, Funding Goal, and Minimum Contribution.
- Submit the transaction and wait for confirmation.

### 3. Discover & Contribute
- Browse campaigns on the homepage.
- Click **View Campaign** to see details.
- Enter an amount (must meet minimum) and click **Back this project**.

### 4. Manage Spending Requests (For Managers)
- In the campaign detail view, click **Create Request**.
- Define what the funds will be used for, the amount, and the recipient address.
- Contributors can then visit the **View Requests** page to approve.
- Once `> 50%` of contributors have approved, click **Finalize Request** to release funds.

---

## 5. Maintenance & Troubleshooting
- **Tests**: Run `npx hardhat test` in the root to verify logic.
- **Build**: Run `npm run build` in `frontend/` to check for production readiness.
- **Contract Verification**: To verify on Etherscan:
  ```bash
  npx hardhat verify --network sepolia DEPLOYED_ADDRESS
  ```

---
**Build with ❤️ using Hardhat v3, Viem, and Next.js 15.**
