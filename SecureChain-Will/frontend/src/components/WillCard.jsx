import React from "react";
import { Link } from "react-router-dom";
import StatusBadge from "./StatusBadge.jsx";

function shorten(addr) {
  return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "-";
}

export default function WillCard({ will, actions }) {
  return (
    <div className="card will-card">
      <div className="will-card-top">
        <strong className="will-id">Will #{will.onChainId ?? "pending"}</strong>
        <StatusBadge status={will.status} />
      </div>

      <div className="will-meta">
        <div className="meta-row"><span>Creator</span><span>{shorten(will.creatorWallet)}</span></div>
        <div className="meta-row"><span>Witness</span><span>{shorten(will.witnessWallet)}</span></div>
        <div className="meta-row"><span>Beneficiary</span><span>{shorten(will.beneficiaryWallet)}</span></div>
        <div className="meta-row"><span>CID</span><span>{will.cid?.slice(0, 18)}...</span></div>
        <div className="meta-row"><span>Created</span><span>{new Date(will.createdAt).toLocaleDateString()}</span></div>
      </div>

      <div className="card-actions">
        <Link className="btn btn-secondary" to={`/will/${will._id}`}>
          View
        </Link>
        {actions}
      </div>
    </div>
  );
}
