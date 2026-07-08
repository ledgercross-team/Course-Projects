const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

const Will = require("../models/Will");
const { encryptFile } = require("../services/encryptionService");
const { computeFileHash } = require("../services/hashService");
const { uploadToIPFS, gatewayUrlFor } = require("../services/ipfsService");
const blockchain = require("../services/blockchainService");

const WALLET_REGEX = /^0x[a-fA-F0-9]{40}$/;
const CHAIN_STATUS = {
  Created: 0,
  WitnessApproved: 1,
  Verified: 2,
  Released: 3,
  Rejected: 4,
};

function normalizeWallet(wallet) {
  return ethers.getAddress(wallet).toLowerCase();
}

function parseOnChainId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw Object.assign(new Error("A valid onChainId is required"), { status: 400 });
  }
  return id;
}

function assertChainWillMatchesMongo(chainWill, mongoWill) {
  const mismatches = [];

  if (normalizeWallet(chainWill.creator) !== mongoWill.creatorWallet) mismatches.push("creator");
  if (normalizeWallet(chainWill.witness) !== mongoWill.witnessWallet) mismatches.push("witness");
  if (normalizeWallet(chainWill.beneficiary) !== mongoWill.beneficiaryWallet) mismatches.push("beneficiary");
  if (chainWill.ipfsCID !== mongoWill.cid) mismatches.push("cid");
  if (chainWill.documentHash !== mongoWill.hash) mismatches.push("hash");

  if (mismatches.length) {
    throw Object.assign(
      new Error(`On-chain will does not match backend record: ${mismatches.join(", ")}`),
      { status: 409 }
    );
  }
}

async function getVerifiedChainWill(onChainId, mongoWill) {
  const chainWill = await blockchain.getWillOnChain(onChainId);
  assertChainWillMatchesMongo(chainWill, mongoWill);
  return chainWill;
}

/// POST /api/uploadWill
/// Encrypts the uploaded file, pins it to IPFS, hashes it, and stores
/// metadata in MongoDB. Returns the CID + hash so the frontend can call
/// createWill() on the smart contract.
async function uploadWill(req, res, next) {
  const uploadedFile = req.file;
  let encryptedPath;
  try {
    if (!uploadedFile) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const { witnessWallet, beneficiaryWallet } = req.body;
    const creatorWallet = req.user.wallet;

    if (!witnessWallet || !beneficiaryWallet) {
      return res.status(400).json({ success: false, message: "witnessWallet and beneficiaryWallet are required" });
    }
    if (![witnessWallet, beneficiaryWallet].every((w) => WALLET_REGEX.test(w))) {
      return res.status(400).json({ success: false, message: "Invalid wallet address" });
    }

    encryptedPath = `${uploadedFile.path}.enc`;
    await encryptFile(uploadedFile.path, encryptedPath);

    const hash = await computeFileHash(encryptedPath);
    const cid = await uploadToIPFS(encryptedPath, path.basename(encryptedPath));

    // Clean up local copies now that the encrypted file is pinned on IPFS.
    fs.unlink(uploadedFile.path, () => {});
    fs.unlink(encryptedPath, () => {});

    const will = await Will.create({
      creatorWallet: normalizeWallet(creatorWallet),
      witnessWallet: normalizeWallet(witnessWallet),
      beneficiaryWallet: normalizeWallet(beneficiaryWallet),
      cid,
      hash,
      originalFileName: uploadedFile.originalname,
      mimeType: uploadedFile.mimetype,
      status: "Created",
    });

    return res.status(201).json({
      success: true,
      will,
      cid,
      hash,
      gatewayUrl: gatewayUrlFor(cid),
      message: "Encrypted document pinned to IPFS. Call createWill() on-chain with this CID and hash.",
    });
  } catch (err) {
    if (uploadedFile) fs.unlink(uploadedFile.path, () => {});
    if (encryptedPath) fs.unlink(encryptedPath, () => {});
    next(err);
  }
}

/// POST /api/uploadWill/:id/onchain
/// Called by the frontend after createWill() confirms on-chain, so the
/// backend record can be linked to its on-chain id.
async function attachOnChainId(req, res, next) {
  try {
    const { id } = req.params;
    const onChainId = parseOnChainId(req.body.onChainId);

    const will = await Will.findById(id);
    if (!will) {
      return res.status(404).json({ success: false, message: "Will not found" });
    }
    if (will.creatorWallet !== req.user.wallet.toLowerCase()) {
      return res.status(403).json({ success: false, message: "Only the creator can link this will on-chain" });
    }
    if (will.onChainId !== null && will.onChainId !== onChainId) {
      return res.status(409).json({ success: false, message: "Will is already linked to a different on-chain id" });
    }

    const chainWill = await getVerifiedChainWill(onChainId, will);
    if (Number(chainWill.status) !== CHAIN_STATUS.Created) {
      return res.status(409).json({ success: false, message: "On-chain will is not in Created status" });
    }

    will.onChainId = onChainId;
    await will.save();

    return res.json({ success: true, will });
  } catch (err) {
    next(err);
  }
}

/// GET /api/will/:id
/// Returns will metadata if the requester is the creator, witness, admin,
/// or (once released) the beneficiary.
async function getWillById(req, res, next) {
  try {
    const will = await Will.findById(req.params.id);
    if (!will) {
      return res.status(404).json({ success: false, message: "Will not found" });
    }

    const requester = req.user.wallet.toLowerCase();
    const isParticipant = [will.creatorWallet, will.witnessWallet].includes(requester);
    const isBeneficiaryAfterRelease = will.beneficiaryWallet === requester && will.status === "Released";
    const isAdmin = req.user.role === "admin";

    if (!isParticipant && !isBeneficiaryAfterRelease && !isAdmin) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const payload = will.toObject();
    if (will.status === "Released" || isParticipant || isAdmin) {
      payload.gatewayUrl = gatewayUrlFor(will.cid);
    }

    return res.json({ success: true, will: payload });
  } catch (err) {
    next(err);
  }
}

/// GET /api/myWills
/// Returns all wills relevant to the logged-in wallet, scoped by role.
async function myWills(req, res, next) {
  try {
    const wallet = req.user.wallet.toLowerCase();
    const role = req.user.role;

    let query;
    if (role === "creator") query = { creatorWallet: wallet };
    else if (role === "witness") query = { witnessWallet: wallet };
    else if (role === "beneficiary") query = { beneficiaryWallet: wallet, status: "Released" };
    else if (role === "admin") query = {}; // admins see everything
    else query = { $or: [{ creatorWallet: wallet }, { witnessWallet: wallet }, { beneficiaryWallet: wallet }] };

    const wills = await Will.find(query).sort({ createdAt: -1 });
    return res.json({ success: true, count: wills.length, wills });
  } catch (err) {
    next(err);
  }
}

/// POST /api/verify  (admin only)
/// Marks death/condition verified, both in MongoDB and on-chain.
async function verify(req, res, next) {
  try {
    const { willId } = req.body;

    const will = await Will.findById(willId);
    if (!will) {
      return res.status(404).json({ success: false, message: "Will not found" });
    }
    if (will.status !== "WitnessApproved") {
      return res.status(400).json({ success: false, message: "Will must be witness-approved before verification" });
    }

    const onChainId = parseOnChainId(will.onChainId);
    const chainWill = await getVerifiedChainWill(onChainId, will);
    if (Number(chainWill.status) !== CHAIN_STATUS.WitnessApproved) {
      return res.status(409).json({ success: false, message: "On-chain will must be witness-approved first" });
    }

    await blockchain.verifyDeathOnChain(onChainId);

    will.status = "Verified";
    await will.save();

    return res.json({ success: true, will, message: "Death/condition verified" });
  } catch (err) {
    next(err);
  }
}

/// POST /api/release  (admin only)
/// Releases the will to the beneficiary, both in MongoDB and on-chain.
async function release(req, res, next) {
  try {
    const { willId } = req.body;

    const will = await Will.findById(willId);
    if (!will) {
      return res.status(404).json({ success: false, message: "Will not found" });
    }
    if (will.status !== "Verified") {
      return res.status(400).json({ success: false, message: "Will must be verified before release" });
    }

    const onChainId = parseOnChainId(will.onChainId);
    const chainWill = await getVerifiedChainWill(onChainId, will);
    if (Number(chainWill.status) !== CHAIN_STATUS.Verified) {
      return res.status(409).json({ success: false, message: "On-chain will must be verified first" });
    }

    await blockchain.releaseWillOnChain(onChainId);

    will.status = "Released";
    await will.save();

    return res.json({ success: true, will, message: "Will released to beneficiary" });
  } catch (err) {
    next(err);
  }
}

/// POST /api/will/:id/witness-approve  (witness only)
/// Mirrors the on-chain approveByWitness() action in MongoDB, so the UI can
/// reflect status even before the chain event is indexed.
async function witnessApprove(req, res, next) {
  try {
    const will = await Will.findById(req.params.id);
    if (!will) {
      return res.status(404).json({ success: false, message: "Will not found" });
    }
    if (will.witnessWallet !== req.user.wallet.toLowerCase()) {
      return res.status(403).json({ success: false, message: "Only the assigned witness can approve this will" });
    }
    if (will.status !== "Created") {
      return res.status(400).json({ success: false, message: "Will is not in a state that can be approved" });
    }
    const onChainId = parseOnChainId(will.onChainId);
    const chainWill = await getVerifiedChainWill(onChainId, will);
    if (Number(chainWill.status) !== CHAIN_STATUS.WitnessApproved) {
      return res.status(409).json({
        success: false,
        message: "Approve the will on-chain before updating backend status",
      });
    }

    will.status = "WitnessApproved";
    await will.save();

    return res.json({ success: true, will });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  uploadWill,
  attachOnChainId,
  getWillById,
  myWills,
  verify,
  release,
  witnessApprove,
};
