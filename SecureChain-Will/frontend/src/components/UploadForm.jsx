import React, { useState } from "react";
import { api, getApiErrorMessage } from "../context/WalletContext.jsx";
import { createWillOnChain } from "../utils/web3";

const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_SIZE_MB = 20;
const WALLET_REGEX = /^0x[a-fA-F0-9]{40}$/;
const DEMO_WITNESS_WALLET = import.meta.env.VITE_DEMO_WITNESS_WALLET || "";
const DEMO_BENEFICIARY_WALLET = import.meta.env.VITE_DEMO_BENEFICIARY_WALLET || "";

export default function UploadForm({ onSuccess }) {
  const [file, setFile] = useState(null);
  const [witnessWallet, setWitnessWallet] = useState("");
  const [beneficiaryWallet, setBeneficiaryWallet] = useState("");
  const [step, setStep] = useState("idle"); // idle | uploading | onchain | done
  const [error, setError] = useState(null);

  function handleFileChange(e) {
    const f = e.target.files[0];
    setError(null);
    if (!f) return;

    if (!ACCEPTED_TYPES.includes(f.type)) {
      setError("Only PDF, JPG, and PNG files are supported.");
      return;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File exceeds the ${MAX_SIZE_MB}MB limit.`);
      return;
    }
    setFile(f);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    const normalizedWitnessWallet = witnessWallet.trim();
    const normalizedBeneficiaryWallet = beneficiaryWallet.trim();

    if (!file || !normalizedWitnessWallet || !normalizedBeneficiaryWallet) {
      setError("File, witness wallet, and beneficiary wallet are all required.");
      return;
    }
    if (![normalizedWitnessWallet, normalizedBeneficiaryWallet].every((wallet) => WALLET_REGEX.test(wallet))) {
      setError("Witness and beneficiary must be valid 0x wallet addresses.");
      return;
    }
    if (normalizedWitnessWallet.toLowerCase() === normalizedBeneficiaryWallet.toLowerCase()) {
      setError("Witness and beneficiary must be two different wallets.");
      return;
    }

    try {
      setStep("uploading");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("witnessWallet", normalizedWitnessWallet);
      formData.append("beneficiaryWallet", normalizedBeneficiaryWallet);

      const { data } = await api.post("/uploadWill", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setStep("onchain");
      const { onChainId, txHash } = await createWillOnChain({
        witness: normalizedWitnessWallet,
        beneficiary: normalizedBeneficiaryWallet,
        cid: data.cid,
        hash: data.hash,
      });

      if (onChainId !== null) {
        await api.post(`/uploadWill/${data.will._id}/onchain`, { onChainId });
      }

      setStep("done");
      onSuccess?.({ ...data.will, onChainId, txHash });
    } catch (err) {
      setError(getApiErrorMessage(err));
      setStep("idle");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 480 }}>
      <div className="form-group">
        <label>Will document (PDF, JPG, or PNG - max 20MB)</label>
        <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} />
      </div>

      <div className="form-group">
        <label>Witness wallet address</label>
        {DEMO_WITNESS_WALLET && (
          <button
            className="btn btn-secondary helper-btn"
            type="button"
            onClick={() => setWitnessWallet(DEMO_WITNESS_WALLET)}
          >
            Use demo witness
          </button>
        )}
        <input
          placeholder="0x..."
          value={witnessWallet}
          onChange={(e) => setWitnessWallet(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label>Beneficiary wallet address</label>
        {DEMO_BENEFICIARY_WALLET && (
          <button
            className="btn btn-secondary helper-btn"
            type="button"
            onClick={() => setBeneficiaryWallet(DEMO_BENEFICIARY_WALLET)}
          >
            Use demo beneficiary
          </button>
        )}
        <input
          placeholder="0x..."
          value={beneficiaryWallet}
          onChange={(e) => setBeneficiaryWallet(e.target.value)}
        />
      </div>

      {(DEMO_WITNESS_WALLET || DEMO_BENEFICIARY_WALLET) && (
        <p className="form-help">
          For your demo, click both demo buttons. Later, register and log in with
          those MetaMask accounts as witness and beneficiary.
        </p>
      )}

      {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}

      <button className="btn" type="submit" disabled={step !== "idle" && step !== "done"}>
        {step === "uploading" && "Encrypting & uploading to IPFS..."}
        {step === "onchain" && "Confirming on-chain..."}
        {(step === "idle" || step === "done") && "Submit Will"}
      </button>
    </form>
  );
}
