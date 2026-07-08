const { ethers } = require("ethers");
const { requireEnv } = require("../config/env");

function loadContractAbi() {
  try {
    return require("../../smart-contract/out/WillRegistry.sol/WillRegistry.json").abi;
  } catch (err) {
    return require("../../frontend/src/contracts/WillRegistry.json").abi;
  }
}

const contractABI = loadContractAbi();

let provider;
let adminWallet;
let contract;

function getContract() {
  if (contract) return contract;

  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || requireEnv("SEPOLIA_RPC_URL");
  const privateKey = requireEnv("ADMIN_PRIVATE_KEY");
  const address = requireEnv("CONTRACT_ADDRESS");

  provider = new ethers.JsonRpcProvider(rpcUrl);
  adminWallet = new ethers.Wallet(privateKey, provider);
  contract = new ethers.Contract(address, contractABI, adminWallet);

  return contract;
}

/// Admin-signed on-chain call: marks death/condition as verified.
async function verifyDeathOnChain(willId) {
  const c = getContract();
  const tx = await c.verifyDeath(willId);
  return tx.wait();
}

/// Admin-signed on-chain call: releases the will to the beneficiary.
async function releaseWillOnChain(willId) {
  const c = getContract();
  const tx = await c.releaseWill(willId);
  return tx.wait();
}

/// Read-only: fetches will metadata directly from the contract.
async function getWillOnChain(willId) {
  const c = getContract();
  return c.getWill(willId);
}

/// Read-only: checks access permission as recorded on-chain.
async function canAccessOnChain(willId, walletAddress) {
  const c = getContract();
  return c.canAccess(willId, walletAddress);
}

module.exports = {
  getContract,
  verifyDeathOnChain,
  releaseWillOnChain,
  getWillOnChain,
  canAccessOnChain,
};
