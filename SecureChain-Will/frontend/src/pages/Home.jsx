import React from "react";
import { Link } from "react-router-dom";
import { useWallet } from "../context/WalletContext.jsx";

const ROLE_ACTIONS = {
  creator: {
    label: "Upload a will",
    to: "/upload",
    note: "Create encrypted records and register them on-chain.",
  },
  witness: {
    label: "Review assigned wills",
    to: "/witness",
    note: "Approve or reject wills assigned to your wallet.",
  },
  admin: {
    label: "Open admin dashboard",
    to: "/admin",
    note: "Verify conditions and release approved wills.",
  },
  beneficiary: {
    label: "View released wills",
    to: "/beneficiary",
    note: "Access wills released to your beneficiary wallet.",
  },
};

export default function Home() {
  const { user } = useWallet();
  const action = ROLE_ACTIONS[user?.role] || {
    label: "Get started",
    to: "/login",
    note: "Connect MetaMask and choose your role to continue.",
  };

  return (
    <div className="home-dashboard">
      <section className="home-summary">
        <div>
          <span className="kicker">Secure estate workflow</span>
          <h1 className="page-title">SecureChain Will</h1>
          <p className="lede">
            Manage encrypted will records with witness approval, admin release,
            and blockchain-backed status tracking.
          </p>
        </div>

        <div className="action-panel">
          <span className="action-label">Current task</span>
          <h2>{action.label}</h2>
          <p>{action.note}</p>
          <Link className="btn" to={action.to}>
            Continue
          </Link>
        </div>
      </section>

      <section className="overview-grid">
        <div className="card workflow-card">
          <div className="card-heading">
            <span className="kicker">Process</span>
            <h2>Will release flow</h2>
          </div>

          <div className="workflow-list">
            <div className="workflow-step">
              <span>1</span>
              <div>
                <strong>Creator uploads</strong>
                <p>Document is encrypted and its hash is registered on-chain.</p>
              </div>
            </div>
            <div className="workflow-step">
              <span>2</span>
              <div>
                <strong>Witness approves</strong>
                <p>The assigned witness confirms or rejects the submitted will.</p>
              </div>
            </div>
            <div className="workflow-step">
              <span>3</span>
              <div>
                <strong>Admin releases</strong>
                <p>After verification, the admin releases access to the beneficiary.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card system-card">
          <div className="card-heading">
            <span className="kicker">System</span>
            <h2>Security layers</h2>
          </div>

          <div className="status-list">
            <div><strong>AES</strong><span>Encrypted document storage</span></div>
            <div><strong>IPFS</strong><span>Content-addressed file reference</span></div>
            <div><strong>Smart contract</strong><span>Participant and status checks</span></div>
          </div>
        </div>
      </section>

      <section className="notice-strip">
        <strong>Prototype notice</strong>
        <span>
          This capstone project demonstrates a workflow and is not a substitute
          for a legally binding will or estate planning process.
        </span>
      </section>
    </div>
  );
}
