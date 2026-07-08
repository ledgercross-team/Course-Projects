import React, { useEffect, useState } from "react";
import { api, getApiErrorMessage } from "../context/WalletContext.jsx";
import WillCard from "../components/WillCard.jsx";

export default function AdminDashboard() {
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

  async function handleVerify(will) {
    setBusyId(will._id);
    setError(null);
    try {
      await api.post("/verify", { willId: will._id, onChainId: will.onChainId });
      load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function handleRelease(will) {
    setBusyId(will._id);
    setError(null);
    try {
      await api.post("/release", { willId: will._id, onChainId: will.onChainId });
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
          <span className="kicker">Admin operations</span>
          <h2 className="section-title" style={{ marginTop: 12 }}>Admin Panel</h2>
          <p className="lede">
            Verify death or condition records and release wills to their
            beneficiaries.
          </p>
        </div>
      </div>

      {loading && <p className="muted">Loading...</p>}
      {error && <p className="error-text">{error}</p>}

      <div className="grid grid-2">
        {wills.map((w) => (
          <WillCard
            key={w._id}
            will={w}
            actions={
              <>
                {w.status === "WitnessApproved" && (
                  <button className="btn" disabled={busyId === w._id} onClick={() => handleVerify(w)}>
                    {busyId === w._id ? "Verifying..." : "Verify Death"}
                  </button>
                )}
                {w.status === "Verified" && (
                  <button className="btn" disabled={busyId === w._id} onClick={() => handleRelease(w)}>
                    {busyId === w._id ? "Releasing..." : "Release Will"}
                  </button>
                )}
              </>
            }
          />
        ))}
      </div>
    </div>
  );
}
