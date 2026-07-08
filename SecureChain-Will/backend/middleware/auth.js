const jwt = require("jsonwebtoken");
const { requireEnv } = require("../config/env");

/// Verifies a JWT issued at login and attaches the decoded payload
/// ({ wallet, role, id }) to req.user.
function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: "Missing authentication token" });
  }

  const jwtSecret = requireEnv("JWT_SECRET");

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
}

module.exports = auth;
