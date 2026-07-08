import React from "react";
import { Navigate } from "react-router-dom";
import { useWallet } from "../context/WalletContext.jsx";

/// Wraps a page and only renders it if the logged-in user has one of the
/// allowed roles. Otherwise redirects to /login.
export default function RoleGuard({ roles, children }) {
  const { user } = useWallet();
  const token = localStorage.getItem("scw_token");

  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="card">
        <h3>Access denied</h3>
        <p className="muted">
          Your role ({user.role}) does not have permission to view this page.
        </p>
      </div>
    );
  }

  return children;
}
