const jwt = require("jsonwebtoken");
const { ethers } = require("ethers");
const User = require("../models/User");
const { requireEnv } = require("../config/env");

const WALLET_REGEX = /^0x[a-fA-F0-9]{40}$/;

function signToken(user) {
  return jwt.sign(
    { id: user._id, wallet: user.wallet, role: user.role },
    requireEnv("JWT_SECRET"),
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

function devAuthEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.ENABLE_DEV_AUTH !== "false";
}

/// POST /api/register
/// Registers a new user tied to a MetaMask wallet address.
async function register(req, res, next) {
  try {
    const { name, email, wallet, role } = req.body;

    if (!name || !email || !wallet) {
      return res.status(400).json({ success: false, message: "name, email, and wallet are required" });
    }

    if (!WALLET_REGEX.test(wallet)) {
      return res.status(400).json({ success: false, message: "Invalid wallet address" });
    }

    const normalizedWallet = ethers.getAddress(wallet).toLowerCase();

    const existing = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { wallet: normalizedWallet }],
    });
    if (existing) {
      const sameEmail = existing.email === email.toLowerCase();
      const sameWallet = existing.wallet === normalizedWallet;
      const message = sameEmail && sameWallet
        ? "This email and wallet are already registered. Use sign in instead."
        : sameEmail
          ? "This email is already registered. Use another email or sign in."
          : "This wallet is already registered. Use sign in instead.";

      return res.status(409).json({ success: false, message });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      wallet: normalizedWallet,
      role: ["creator", "witness", "admin", "beneficiary"].includes(role) ? role : "creator",
    });

    const token = signToken(user);
    return res.status(201).json({ success: true, token, user });
  } catch (err) {
    next(err);
  }
}

/// POST /api/login
/// Prototype login: verifies a signed message proves ownership of the wallet,
/// then issues a JWT. `signature` is produced client-side via
/// `signer.signMessage(message)` in ethers.js.
async function login(req, res, next) {
  try {
    const { wallet, message, signature } = req.body;

    if (!wallet || !message || !signature) {
      return res.status(400).json({ success: false, message: "wallet, message, and signature are required" });
    }

    if (!WALLET_REGEX.test(wallet)) {
      return res.status(400).json({ success: false, message: "Invalid wallet address" });
    }

    const recovered = ethers.verifyMessage(message, signature);
    if (recovered.toLowerCase() !== wallet.toLowerCase()) {
      return res.status(401).json({ success: false, message: "Signature does not match wallet" });
    }

    const user = await User.findOne({ wallet: wallet.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: "Wallet not registered" });
    }

    const token = signToken(user);
    return res.json({ success: true, token, user });
  } catch (err) {
    next(err);
  }
}

/// POST /api/dev-login
/// Development-only helper for testing without a browser wallet extension.
async function devLogin(req, res, next) {
  try {
    if (!devAuthEnabled()) {
      return res.status(404).json({ success: false, message: "Route not found" });
    }

    const { name, email, wallet, role } = req.body;
    if (!wallet || !WALLET_REGEX.test(wallet)) {
      return res.status(400).json({ success: false, message: "Valid wallet is required" });
    }

    const normalizedWallet = ethers.getAddress(wallet).toLowerCase();
    const selectedRole = ["creator", "witness", "admin", "beneficiary"].includes(role) ? role : "creator";

    let user = await User.findOne({ wallet: normalizedWallet });
    if (!user) {
      user = await User.create({
        name: name || `Demo ${selectedRole}`,
        email: (email || `${normalizedWallet.slice(2, 10)}-${selectedRole}@demo.local`).toLowerCase(),
        wallet: normalizedWallet,
        role: selectedRole,
      });
    }

    const token = signToken(user);
    return res.json({ success: true, token, user });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, devLogin };
