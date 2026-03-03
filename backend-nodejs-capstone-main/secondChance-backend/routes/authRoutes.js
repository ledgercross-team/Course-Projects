const express = require("express");
const router = express.Router();
const connectToDatabase = require("../models/db");

// Helper: accept multiple possible field names from frontend
function normalizeCreds(body = {}) {
  const {
    username,
    userName,
    user,
    email,
    userId,
    userid,
    password,
    pwd,
    pass,
    firstName,
    firstname,
    lastName,
    lastname,
  } = body;

  const u = (username || userName || user || userId || userid || email || "").trim();
  const p = (password || pwd || pass || "").trim();
  const fn = (firstName || firstname || "").trim();
  const ln = (lastName || lastname || "").trim();

  return { u, p, fn, ln };
}

function noCache(res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  noCache(res);
  try {
    const db = await connectToDatabase();
    const users = db.collection("users");

    const { u, p, fn, ln } = normalizeCreds(req.body);

    if (!u || !p) {
      return res.status(400).json({
        success: false,
        status: "error",
        message: "username and password are required",
      });
    }

    const existing = await users.findOne({ username: u });
    if (existing) {
      return res.status(409).json({
        success: false,
        status: "error",
        message: "User already exists",
      });
    }

    await users.insertOne({
      username: u,
      password: p, // simple for lab
      firstName: fn,
      lastName: ln,
      createdAt: new Date(),
    });

    return res.status(201).json({
      authtoken: "demo-token",
      userName: fn ? `${fn} ${ln || ""}`.trim() : u,
      userEmail: u,
    });

  } catch (e) {
    console.error(e);
    return res.status(500).json({
      success: false,
      status: "error",
      message: "Registration failed",
    });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  noCache(res);
  try {
    const db = await connectToDatabase();
    const users = db.collection("users");

    const { u, p } = normalizeCreds(req.body);

    if (!u || !p) {
      return res.status(400).json({
        success: false,
        status: "error",
        message: "username and password are required",
      });
    }

    const userDoc = await users.findOne({ username: u });
    if (!userDoc || userDoc.password !== p) {
      return res.status(401).json({
        success: false,
        status: "error",
        message: "Invalid credentials",
      });
    }

    return res.status(200).json({
      authtoken: "demo-token",
      userName: userDoc.firstName ? `${userDoc.firstName} ${userDoc.lastName || ""}`.trim() : u,
      userEmail: u,
    });

  } catch (e) {
    console.error(e);
    return res.status(500).json({
      success: false,
      status: "error",
      message: "Login failed",
    });
  }
});

module.exports = router;

