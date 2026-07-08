import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import UploadForm from "../components/UploadForm.jsx";

export default function UploadWill() {
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="kicker">Secure upload</span>
          <h2 className="section-title" style={{ marginTop: 12 }}>Upload Will</h2>
          <p className="lede">
            Your document will be encrypted through the backend AES workflow,
            pinned to IPFS, and its hash plus CID registered on-chain.
          </p>
        </div>
      </div>

      <UploadForm onSuccess={setSuccess} />

      {success && (
        <div className="card" style={{ marginTop: 20, maxWidth: 520 }}>
          <strong>Will submitted successfully</strong>
          <p className="muted">
            On-chain ID: {success.onChainId ?? "pending confirmation"}
            <br />
            Tx hash: {success.txHash?.slice(0, 20)}...
          </p>
          <button className="btn" onClick={() => navigate("/creator")}>
            Go to My Wills
          </button>
        </div>
      )}
    </div>
  );
}
