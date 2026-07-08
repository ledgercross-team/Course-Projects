import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { connectWallet, getWalletBalance, getWalletErrorMessage, hasMetaMask } from "../utils/web3";
import api, { getApiErrorMessage } from "../api/axios";

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [address, setAddress] = useState(null);
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem("scw_token");
    if (!token) return null;
    const stored = localStorage.getItem("scw_user");
    return stored ? JSON.parse(stored) : null;
  });
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [balance, setBalance] = useState(null);
  const connectPromiseRef = useRef(null);

  const refreshBalance = useCallback(async (walletAddress = address) => {
    if (!walletAddress || !hasMetaMask()) {
      setBalance(null);
      return null;
    }

    try {
      const nextBalance = await getWalletBalance(walletAddress);
      setBalance(nextBalance);
      return nextBalance;
    } catch {
      setBalance(null);
      return null;
    }
  }, [address]);

  useEffect(() => {
    if (!hasMetaMask()) return;
    const handleAccountsChanged = (accounts) => {
      const nextAddress = accounts[0] || null;
      setAddress(nextAddress);
      refreshBalance(nextAddress);
    };
    const handleChainChanged = () => {
      refreshBalance();
    };

    window.ethereum.on?.("accountsChanged", handleAccountsChanged);
    window.ethereum.on?.("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener?.("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener?.("chainChanged", handleChainChanged);
    };
  }, [refreshBalance]);

  useEffect(() => {
    function handleSessionExpired() {
      setUser(null);
    }

    window.addEventListener("scw:session-expired", handleSessionExpired);
    return () => window.removeEventListener("scw:session-expired", handleSessionExpired);
  }, []);

  const connect = useCallback(async (options = {}) => {
    if (connectPromiseRef.current) {
      return connectPromiseRef.current;
    }

    setConnecting(true);
    setError(null);

    connectPromiseRef.current = (async () => {
      const { address: addr } = await connectWallet(options);
      setAddress(addr);
      refreshBalance(addr);
      return addr;
    })();

    try {
      return await connectPromiseRef.current;
    } catch (err) {
      setError(getWalletErrorMessage(err));
      throw err;
    } finally {
      connectPromiseRef.current = null;
      setConnecting(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("scw_token");
    localStorage.removeItem("scw_user");
    setUser(null);
  }, []);

  const setSession = useCallback((token, userData) => {
    localStorage.setItem("scw_token", token);
    localStorage.setItem("scw_user", JSON.stringify(userData));
    setUser(userData);
  }, []);

  const value = {
    address,
    user,
    balance,
    connecting,
    error,
    connect,
    refreshBalance,
    logout,
    setSession,
    isAuthenticated: Boolean(user),
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within a WalletProvider");
  return ctx;
}

// re-export for convenience so pages can hit the API without importing twice
export { api, getApiErrorMessage };
