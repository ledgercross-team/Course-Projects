import React from "react";
import { NavLink } from "react-router-dom";
import { useWallet } from "../context/WalletContext.jsx";

const LINKS_BY_ROLE = {
  creator: [
    { to: "/creator", label: "My Wills" },
    { to: "/upload", label: "Upload Will" },
  ],
  witness: [{ to: "/witness", label: "Assigned Wills" }],
  admin: [{ to: "/admin", label: "Admin Panel" }],
  beneficiary: [{ to: "/beneficiary", label: "Released Wills" }],
};

export default function Sidebar() {
  const { user } = useWallet();
  if (!user) return null;

  const links = LINKS_BY_ROLE[user.role] || [];

  return (
    <aside className="sidebar">
      <div className="sidebar-title">Workspace</div>
      <nav className="side-nav">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => `side-link${isActive ? " active" : ""}`}
          >
            <span className="side-dot" />
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
