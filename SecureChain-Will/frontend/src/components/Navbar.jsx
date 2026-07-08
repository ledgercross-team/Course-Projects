import React from "react";
import { Link } from "react-router-dom";
import { useWallet } from "../context/WalletContext.jsx";
import WalletConnect from "./WalletConnect.jsx";

export default function Navbar() {
  const { user, logout } = useWallet();

  return (
    <header className="navbar">
      <Link to="/" className="brand">
        <span className="brand-mark">S</span>
        SecureChain Will
      </Link>

      <div className="nav-actions">
        {user && (
          <span className="user-pill">
            {user.name} <strong style={{ color: "var(--text)" }}>{user.role}</strong>
          </span>
        )}
        <WalletConnect />
        {user && (
          <button className="btn btn-secondary" onClick={logout}>
            Logout
          </button>
        )}
      </div>
    </header>
  );
}
