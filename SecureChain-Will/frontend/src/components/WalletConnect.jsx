import React from "react";
import { useWallet } from "../context/WalletContext.jsx";

const CHAIN_NAME = import.meta.env.VITE_CHAIN_NAME || "Sepolia";

function shorten(addr) {
  return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";
}

function formatBalance(balance) {
  if (balance === null || balance === undefined) return "checking...";

  const value = Number(balance);
  if (!Number.isFinite(value)) return "0 ETH";
  if (value === 0) return "0 ETH";
  if (value < 0.0001) return "<0.0001 ETH";
  return `${value.toFixed(4)} ETH`;
}

export default function WalletConnect() {
  const { address, balance, connect, connecting, error } = useWallet();
  const hasNoGas = address && balance !== null && Number(balance) === 0;

  return (
    <div className="wallet-connect">
      {address ? (
        <>
          <span className="wallet-pill">
            Connected: {shorten(address)}
          </span>
          <span className={`wallet-pill ${hasNoGas ? "wallet-pill-warning" : ""}`}>
            {CHAIN_NAME}: {formatBalance(balance)}
          </span>
          {hasNoGas && (
            <a
              className="wallet-faucet-link"
              href="https://cloud.google.com/application/web3/faucet/ethereum/sepolia"
              target="_blank"
              rel="noreferrer"
            >
              Get test ETH
            </a>
          )}
        </>
      ) : (
        <button className="btn" onClick={connect} disabled={connecting}>
          {connecting ? "Connecting..." : "Connect MetaMask"}
        </button>
      )}
      {error && <span className="wallet-error">{error}</span>}
    </div>
  );
}
