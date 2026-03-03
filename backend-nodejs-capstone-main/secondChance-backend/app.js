require("dotenv").config();
const express = require("express");
const cors = require("cors");
const pinoHttp = require("pino-http");
const path = require("path");
const logger = require("./logger");

const connectToDatabase = require("./models/db");
const secondChanceItemsRoutes = require("./routes/secondChanceItemsRoutes");
const searchRoutes = require("./routes/searchRoutes");
const authRoutes = require("./routes/authRoutes");

const app = express();
app.use(cors());
app.use(express.json());
app.use(pinoHttp({ logger }));

// ✅ Serve static files (images)
app.use("/images", express.static(path.join(__dirname, "public", "images")));

app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));
app.use("/public", express.static(path.join(__dirname, "public")));

const port = process.env.PORT || 3060;

// Connect to MongoDB one time at startup
connectToDatabase()
  .then(() => logger.info("Connected to DB"))
  .catch((e) => console.error("Failed to connect to DB", e));

// ✅ Routes (order matters)
app.use("/api/secondchance", secondChanceItemsRoutes);
app.use("/api/secondchance/search", searchRoutes);
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("Inside the server");
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send("Internal Server Error");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

