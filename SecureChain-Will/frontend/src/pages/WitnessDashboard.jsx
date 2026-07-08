import React, { useEffect, useState } from "react";
import { api, getApiErrorMessage } from "../context/WalletContext.jsx";
import { approveByWitnessOnChain } from "../utils/web3";
import WillCard from "../components/WillCard.jsx";

export default function WitnessDashboard() {
  const [wills, setWills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);

  function load() {
    setLoading(true);
    api
      .get("/myWills")
      .then(({ data }) => setWills(data.wills))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleApprove(will) {
    setBusyId(will._id);
    setError(null);
    try {
      if (will.onChainId !== null && will.onChainId !== undefined) {
        await approveByWitnessOnChain(will.onChainId);
      }
      await api.post(`/will/${will._id}/witness-approve`);
      load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="kicker">Witness dashboard</span>
          <h2 className="section-title" style={{ marginTop: 12 }}>Assigned Wills</h2>
        </div>
      </div>
      {loading && <p className="muted">Loading...</p>}
      {error && <p className="error-text">{error}</p>}
      {!loading && wills.length === 0 && (
        <div className="card">
          <p className="muted">No wills assigned to you yet.</p>
        </div>
      )}

      <div className="grid grid-2">
        {wills.map((w) => (
          <WillCard
            key={w._id}
            will={w}
            actions={
              w.status === "Created" && (
                <button
                  className="btn"
                  disabled={busyId === w._id}
                  onClick={() => handleApprove(w)}
                >
                  {busyId === w._id ? "Approving..." : "Approve"}
                </button>
              )
            }
          />
        ))}
      </div>
    </div>
  );
}
