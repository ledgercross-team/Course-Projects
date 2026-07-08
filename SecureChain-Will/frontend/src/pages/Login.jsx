import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet, api, getApiErrorMessage } from "../context/WalletContext.jsx";
import { getSigner, getWalletErrorMessage } from "../utils/web3";

function shorten(addr) {
  return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";
}

export default function Login() {
  const { address, connect, connecting, setSession } = useWallet();
  const navigate = useNavigate();

  const [mode, setMode] = useState("login"); // login | register
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("creator");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function ensureConnected({ selectAccount = false } = {}) {
    if (address && !selectAccount) return address;
    return connect({ forceAccountSelection: selectAccount });
  }

  async function handleChooseWallet() {
    setError(null);
    setLoading(true);
    try {
      await ensureConnected({ selectAccount: true });
    } catch (err) {
      setError(getWalletErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin() {
    setError(null);
    setLoading(true);
    try {
      const wallet = await ensureConnected({ selectAccount: true });
      const signer = await getSigner();

      const message = `Sign in to SecureChain Will\nWallet: ${wallet}\nTimestamp: ${Date.now()}`;
      const signature = await signer.signMessage(message);

      const { data } = await api.post("/login", { wallet, message, signature });
      setSession(data.token, data.user);
      navigate(`/${data.user.role}`);
    } catch (err) {
      setError(err.isAxiosError ? getApiErrorMessage(err) : getWalletErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    setError(null);
    setLoading(true);
    try {
      const wallet = await ensureConnected({ selectAccount: true });
      const { data } = await api.post("/register", { name, email, wallet, role });
      setSession(data.token, data.user);
      navigate(`/${data.user.role}`);
    } catch (err) {
      setError(err.isAxiosError ? getApiErrorMessage(err) : getWalletErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="page-header">
        <div>
          <span className="kicker">Wallet access</span>
          <h2 className="section-title" style={{ marginTop: 12 }}>
            {mode === "login" ? "Log in" : "Register"}
          </h2>
        </div>
      </div>

      <div className="card mode-switch">
        <button
          className={`btn ${mode === "login" ? "" : "btn-secondary"}`}
          onClick={() => setMode("login")}
        >
          I already have an account
        </button>
        <button
          className={`btn ${mode === "register" ? "" : "btn-secondary"}`}
          onClick={() => setMode("register")}
        >
          New here - register
        </button>
      </div>

      <div className="card">
        {mode === "register" && (
          <>
            <div className="form-group">
              <label>Full name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="creator">Creator</option>
                <option value="witness">Witness</option>
                <option value="admin">Admin</option>
                <option value="beneficiary">Beneficiary</option>
              </select>
            </div>
          </>
        )}

        {address && (
          <div className="connected-wallet-note">
            <span>
              Wallet ready: <strong>{shorten(address)}</strong>
            </span>
            <button
              type="button"
              className="inline-link-button"
              onClick={handleChooseWallet}
              disabled={loading || connecting}
            >
              Choose MetaMask account
            </button>
          </div>
        )}

        {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}

        <button
          className="btn"
          style={{ width: "100%" }}
          disabled={loading || connecting}
          onClick={mode === "login" ? handleLogin : handleRegister}
        >
          {loading || connecting ? "Working..." : mode === "login" ? "Connect & Sign In" : "Connect & Register"}
        </button>
      </div>
    </div>
  );
}
