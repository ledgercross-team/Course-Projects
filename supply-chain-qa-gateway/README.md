# Supply Chain Quality Assurance Gateway

A showcase Ethereum and Solidity capstone project that demonstrates how a business-to-business payment workflow can be secured and automated through smart contracts.

## Project Overview

In traditional supply chain operations, payment is often dependent on manual confirmation that a shipment has arrived and meets the expected quality standards. This process can be slow, error-prone, and difficult to track.

The **Supply Chain Quality Assurance Gateway** is a decentralized application designed to improve that workflow. In this project, a supplier submits a delivery payment request, a warehouse manager verifies the shipment, and the payment is released only after approval is recorded on the Ethereum blockchain.

This project was built as a capstone to showcase practical skills in:

- Solidity smart contract development
- Ethereum-based payment workflows
- role-based access control
- contract testing
- secure transaction handling
- decentralized application architecture

---

## Problem Statement

In many business environments, shipment approval and payment release happen through manual systems such as emails, spreadsheets, and internal approvals. These systems can create delays, disputes, and poor transparency.

This project addresses that issue by creating a smart contract based quality assurance gateway where:

- buyers can deposit funds in advance
- suppliers can create shipment-related payment requests
- warehouse managers can approve or reject requests after physical inspection
- payment is released automatically on successful approval
- all major actions are recorded onchain for traceability

---

## Key Features

### 1. Buyer Fund Deposit

Authorized buyers can deposit Ether into the smart contract. These funds are then used to support shipment payment requests.

### 2. Delivery Request Creation

Authorized suppliers can create a delivery request by providing:

- shipment ID
- shipment description
- requested payment amount
- buyer address
- assigned warehouse approver address

Each request is stored onchain with its own status and metadata.

### 3. Approval and Rejection Workflow

The assigned warehouse manager can review a shipment and then:

- approve the request if the shipment passes verification
- reject the request if the shipment fails quality or delivery checks

### 4. Automatic Payment Release

Once a request is approved, the smart contract automatically releases the corresponding payment to the supplier.

### 5. Onchain Request Tracking

Each delivery request maintains a clear lifecycle on the blockchain. This improves traceability and makes the process transparent.

### 6. Role-Based Access Control

Only authorized users can perform specific actions. The project includes roles such as:

- Admin
- Buyer
- Supplier
- Warehouse Manager

### 7. Emergency Pause Functionality

The contract includes a pausable mechanism so the admin can stop sensitive actions if a critical issue is discovered.

### 8. Smart Contract Testing

The project includes unit tests covering key workflows such as:

- deployment and admin assignment
- buyer deposits
- supplier request creation
- approval and payment release
- rejection handling
- paused contract protection

---

## Smart Contract Workflow

The system follows this basic process:

1. The admin assigns roles to participants.
2. A buyer deposits funds into the contract.
3. A supplier creates a delivery request.
4. The assigned warehouse manager inspects the shipment.
5. The warehouse manager approves or rejects the request.
6. If approved, the contract releases the payment to the supplier.
7. If rejected, the request remains unpaid and the buyer balance stays available.

---

## Roles in the System

### Admin

The administrator manages access control and can pause or unpause the contract when necessary.

### Buyer

The buyer deposits funds into the smart contract to support delivery payment requests.

### Supplier

The supplier submits requests claiming that a shipment has been delivered and is ready for payment approval.

### Warehouse Manager

The warehouse manager acts as the approver who verifies the shipment physically and decides whether payment should be released.

---

## Security Features

This project applies several smart contract security practices:

- **Role-based access control** to restrict sensitive functions
- **Pausable contract design** for emergency response
- **Controlled payment flow** to ensure funds are only released after approval
- **Onchain auditability** through transparent request tracking
- **Validation checks** for request creation and status transitions

---

## Tech Stack

### Blockchain / Smart Contract

- Solidity
- Hardhat
- OpenZeppelin Contracts
- TypeScript
- Viem

### Frontend

- React
- Vite
- TypeScript
- wagmi
- viem
- RainbowKit
- TanStack Query

### Wallet / Network

- MetaMask
- Ethereum Sepolia Testnet

---

## Project Structure

```text
supply-chain-qa-gateway/
├── contracts/
│   ├── contracts/
│   │   └── SupplyChainQAGateway.sol
│   ├── test/
│   │   └── SupplyChainQAGateway.ts
│   ├── ignition/
│   ├── hardhat.config.ts
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   ├── package.json
│   └── ...
│
├── screenshots/
│   ├── compile-success.png
│   └── test-success.png
│
├── README.md
└── .gitignore
```
