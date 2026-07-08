import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, getApiErrorMessage } from "../context/WalletContext.jsx";
import WillCard from "../components/WillCard.jsx";

export default function CreatorDashboard() {
  const [wills, setWills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get("/myWills")
      .then(({ data }) => setWills(data.wills))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="kicker">Creator dashboard</span>
          <h2 className="section-title" style={{ marginTop: 12 }}>My Wills</h2>
        </div>
        <Link className="btn" to="/upload">
          + Upload New Will
        </Link>
      </div>

      {loading && <p className="muted">Loading...</p>}
      {error && <p className="error-text">{error}</p>}
      {!loading && wills.length === 0 && (
        <div className="card">
          <p className="muted">You haven't created any wills yet.</p>
        </div>
      )}

      <div className="grid grid-2">
        {wills.map((w) => (
          <WillCard key={w._id} will={w} />
        ))}
      </div>
    </div>
  );
}
