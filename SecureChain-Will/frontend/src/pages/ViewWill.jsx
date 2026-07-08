import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, getApiErrorMessage } from "../context/WalletContext.jsx";
import StatusBadge from "../components/StatusBadge.jsx";

export default function ViewWill() {
  const { id } = useParams();
  const [will, setWill] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/will/${id}`)
      .then(({ data }) => setWill(data.will))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="muted">Loading...</p>;
  if (error) return <p className="error-text">{error}</p>;
  if (!will) return null;

  return (
    <div className="card detail-card">
      <div className="will-card-top">
        <h2 style={{ margin: 0 }}>Will #{will.onChainId ?? "pending"}</h2>
        <StatusBadge status={will.status} />
      </div>

      <div className="detail-grid">
        <div className="detail-row"><strong>Creator</strong> {will.creatorWallet}</div>
        <div className="detail-row"><strong>Witness</strong> {will.witnessWallet}</div>
        <div className="detail-row"><strong>Beneficiary</strong> {will.beneficiaryWallet}</div>
        <div className="detail-row"><strong>IPFS CID</strong> {will.cid}</div>
        <div className="detail-row"><strong>Document Hash</strong> {will.hash}</div>
        <div className="detail-row"><strong>Created</strong> {new Date(will.createdAt).toLocaleString()}</div>
      </div>

      {will.gatewayUrl ? (
        <a className="btn" style={{ marginTop: 20 }} href={will.gatewayUrl} target="_blank" rel="noreferrer">
          Download Encrypted Document
        </a>
      ) : (
        <p className="muted" style={{ marginTop: 20 }}>
          Document access is not available until this will is released.
        </p>
      )}

      {will.gatewayUrl && (
        <p className="muted" style={{ marginTop: 8 }}>
          Note: the downloaded file is AES-encrypted. Decryption happens via
          the backend's key-holder for authorized parties in this prototype.
        </p>
      )}
    </div>
  );
}
