const mongoose = require("mongoose");

const WillSchema = new mongoose.Schema(
  {
    onChainId: {
      type: Number,
      default: null, // populated once createWill() is confirmed on-chain
    },
    creatorWallet: {
      type: String,
      required: true,
      lowercase: true,
    },
    beneficiaryWallet: {
      type: String,
      required: true,
      lowercase: true,
    },
    witnessWallet: {
      type: String,
      required: true,
      lowercase: true,
    },
    cid: {
      type: String,
      required: true,
    },
    hash: {
      type: String,
      required: true,
    },
    originalFileName: {
      type: String,
    },
    mimeType: {
      type: String,
    },
    status: {
      type: String,
      enum: ["Created", "WitnessApproved", "Verified", "Released", "Rejected"],
      default: "Created",
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

module.exports = mongoose.model("Will", WillSchema);
