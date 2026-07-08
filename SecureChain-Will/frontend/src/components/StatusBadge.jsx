import React from "react";

const STYLES = {
  Created: { bg: "#eef2f7", color: "#475569", label: "Created" },
  WitnessApproved: { bg: "#e8f1ff", color: "#1d4ed8", label: "Witness Approved" },
  Verified: { bg: "#fff7ed", color: "#b45309", label: "Verified" },
  Released: { bg: "#ecfdf5", color: "#15803d", label: "Released" },
  Rejected: { bg: "#fef2f2", color: "#dc2626", label: "Rejected" },
};

export default function StatusBadge({ status }) {
  const style = STYLES[status] || STYLES.Created;
  return (
    <span
      className="status-badge"
      style={{ background: style.bg, color: style.color }}
    >
      <span className="status-dot" />
      {style.label}
    </span>
  );
}
