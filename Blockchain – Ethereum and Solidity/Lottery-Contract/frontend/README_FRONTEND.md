# Lottery Frontend

Modern React + TypeScript frontend for the Lottery Smart Contract.

## Prerequisites

- Node.js (Latest LTS)
- MetaMask extension installed in your browser
- A local Hardhat node or Sepolia testnet account with ETH

## Getting Started

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Configure Environment:**
    Create a `.env` file in the `frontend` directory:
    ```bash
    cp .env.example .env
    ```
    Add your deployed contract address:
    ```env
    VITE_LOTTERY_CONTRACT_ADDRESS=0xYourContractAddress
    ```

3.  **Run Development Server:**
    ```bash
    npm run dev
    ```

4.  **Build for Production:**
    ```bash
    npm run build
    ```

## Connecting MetaMask

### Local Hardhat Network
1.  Start Hardhat node in the root directory:
    ```bash
    npx hardhat node
    ```
2.  Add a custom network to MetaMask:
    - RPC URL: `http://127.0.0.1:8545`
    - Chain ID: `31337`
    - Currency: `ETH`
3.  Import one of the private keys provided by `hardhat node` into MetaMask.

### Sepolia Testnet
1.  Ensure you have Sepolia ETH in your MetaMask.
2.  Deploy the contract to Sepolia from the root directory.
3.  Update `VITE_LOTTERY_CONTRACT_ADDRESS` in `.env`.

## Features
- **Manager Info:** View the address of the contract manager.
- **Player Stats:** See how many players are currently in the lottery.
- **Contract Balance:** View the total pool of ETH to be won.
- **Enter Lottery:** Send at least 0.01 ETH to join the pool.
- **Pick Winner:** Only the manager can trigger this to select a winner and distribute the funds.
