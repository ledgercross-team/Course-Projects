import { BrowserProvider, Contract, formatEther } from "ethers";
import contractData from "../contracts/WillRegistry.json";

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
const EXPECTED_CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || 11155111); // Sepolia
const EXPECTED_CHAIN_HEX = `0x${EXPECTED_CHAIN_ID.toString(16)}`;
const EXPECTED_CHAIN_NAME = import.meta.env.VITE_CHAIN_NAME || "Sepolia";
const CHAIN_CONFIGS = {
  11155111: {
    chainId: "0xaa36a7",
    chainName: "Sepolia",
    nativeCurrency: {
      name: "Sepolia Ether",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrls: ["https://rpc.sepolia.org"],
    blockExplorerUrls: ["https://sepolia.etherscan.io"],
  },
  31337: {
    chainId: "0x7a69",
    chainName: "Localhost 8545",
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrls: ["http://127.0.0.1:8545"],
  },
};

export const WillStatus = ["Created", "WitnessApproved", "Verified", "Released", "Rejected"];

export function hasMetaMask() {
  return typeof window !== "undefined" && Boolean(window.ethereum);
}

export function getWalletErrorMessage(error) {
  const message = error?.message || "";

  if (error?.code === -32002 || message.includes("-32002") || message.includes("already pending")) {
    return "MetaMask already has a pending request. Open MetaMask and approve or reject it, then try again.";
  }

  if (error?.code === 4001 || message.includes("user rejected")) {
    return "MetaMask request was rejected.";
  }

  return message || "MetaMask request failed. Please try again.";
}

async function ensureExpectedNetwork() {
  const currentChainId = await window.ethereum.request({ method: "eth_chainId" });
  if (currentChainId?.toLowerCase() === EXPECTED_CHAIN_HEX.toLowerCase()) return;

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: EXPECTED_CHAIN_HEX }],
    });
  } catch (switchError) {
    if (switchError.code !== 4902) {
      throw new Error(`Please switch MetaMask to ${EXPECTED_CHAIN_NAME}.`);
    }

    const chainConfig = CHAIN_CONFIGS[EXPECTED_CHAIN_ID];
    if (!chainConfig) {
      throw new Error(`Please add ${EXPECTED_CHAIN_NAME} to MetaMask, then try again.`);
    }

    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [{ ...chainConfig, chainName: EXPECTED_CHAIN_NAME }],
    });
  }

  const switchedChainId = await window.ethereum.request({ method: "eth_chainId" });
  if (switchedChainId?.toLowerCase() !== EXPECTED_CHAIN_HEX.toLowerCase()) {
    throw new Error(`Please switch MetaMask to ${EXPECTED_CHAIN_NAME}.`);
  }
}

export async function connectWallet({ forceAccountSelection = false } = {}) {
  if (!hasMetaMask()) {
    throw new Error("MetaMask is not installed. Please install it to continue.");
  }

  await ensureExpectedNetwork();

  if (forceAccountSelection) {
    await window.ethereum.request({
      method: "wallet_requestPermissions",
      params: [{ eth_accounts: {} }],
    });
  }

  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  const provider = new BrowserProvider(window.ethereum);

  return { provider, address: accounts[0] };
}

export async function getWalletBalance(address) {
  if (!hasMetaMask()) throw new Error("MetaMask is not installed");
  if (!address) return "0";

  await ensureExpectedNetwork();
  const provider = new BrowserProvider(window.ethereum);
  const balance = await provider.getBalance(address);
  return formatEther(balance);
}

export async function getSigner() {
  if (!hasMetaMask()) throw new Error("MetaMask is not installed");
  await ensureExpectedNetwork();
  const provider = new BrowserProvider(window.ethereum);
  return provider.getSigner();
}

export async function getContractReadOnly() {
  if (!hasMetaMask()) throw new Error("MetaMask is not installed");
  await ensureExpectedNetwork();
  const provider = new BrowserProvider(window.ethereum);
  return new Contract(CONTRACT_ADDRESS, contractData.abi, provider);
}

export async function getContractWithSigner() {
  const signer = await getSigner();
  return new Contract(CONTRACT_ADDRESS, contractData.abi, signer);
}

/// Calls createWill() on-chain and returns { onChainId, txHash }.
export async function createWillOnChain({ witness, beneficiary, cid, hash }) {
  const contract = await getContractWithSigner();
  const tx = await contract.createWill(witness, beneficiary, cid, hash);
  const receipt = await tx.wait();

  const event = receipt.logs
    .map((log) => {
      try {
        return contract.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((parsed) => parsed && parsed.name === "WillCreated");

  const onChainId = event ? Number(event.args.id) : null;
  return { onChainId, txHash: receipt.hash };
}

export async function approveByWitnessOnChain(onChainId) {
  const contract = await getContractWithSigner();
  const tx = await contract.approveByWitness(onChainId);
  return tx.wait();
}

export async function getWillOnChain(onChainId) {
  const contract = await getContractReadOnly();
  const raw = await contract.getWill(onChainId);
  return {
    id: Number(raw.id),
    creator: raw.creator,
    witness: raw.witness,
    beneficiary: raw.beneficiary,
    ipfsCID: raw.ipfsCID,
    documentHash: raw.documentHash,
    status: WillStatus[Number(raw.status)],
    createdAt: Number(raw.createdAt),
  };
}

export async function canAccessOnChain(onChainId, address) {
  const contract = await getContractReadOnly();
  return contract.canAccess(onChainId, address);
}
