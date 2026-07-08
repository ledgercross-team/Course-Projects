require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const willRoutes = require("./routes/willRoutes");

const app = express();

// ---------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------
app.use(cors());
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/local-ipfs", express.static(path.join(__dirname, "local-ipfs")));

// ---------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------
app.get("/", (req, res) => {
  res.json({
    name: "SecureChain Will API",
    status: "ok",
    version: "1.0.0",
  });
});

app.use("/api", authRoutes);
app.use("/api", willRoutes);

// ---------------------------------------------------------------------
// 404 handler
// ---------------------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ---------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err.name === "MulterError") {
    const message = err.code === "LIMIT_FILE_SIZE" ? "Uploaded file exceeds the configured size limit" : err.message;
    return res.status(400).json({ success: false, message });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

// ---------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------
const PORT = process.env.PORT || 5000;

function listen(port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      console.log(`SecureChain Will API running on port ${port}`);
      resolve(server);
    });

    server.once("error", reject);
  });
}

async function start() {
  try {
    await connectDB();
    await listen(PORT);
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = { app, start };
