const express = require("express");
const router = express.Router();
const connectToDatabase = require("../models/db");

const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure images directory exists
const imagesDir = path.join(__dirname, "..", "images");
if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

// Multer upload middleware
const upload = multer({ dest: imagesDir });

/**
 * GET /api/secondchance/items
 */
router.get("/items", async (req, res) => {
  try {
    const db = await connectToDatabase();            // ✅ Evidence C
    const collection = db.collection("secondChanceItems");
    const items = await collection.find({}).toArray();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch items" });
  }
});

/**
 * GET /api/secondchance/items/:id
 */
router.get("/items/:id", async (req, res) => {
  try {
    const db = await connectToDatabase();            // ✅ Evidence C
    const collection = db.collection("secondChanceItems");
    const item = await collection.findOne({ id: req.params.id });

    if (!item) return res.status(404).json({ message: "Item not found" });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch item" });
  }
});

/**
 * POST /api/secondchance/items  (with file upload)
 */
router.post("/items", upload.single("image"), async (req, res) => {
  try {
    const db = await connectToDatabase();            // ✅ Evidence C
    const collection = db.collection("secondChanceItems");

    const newItem = { ...req.body };

    // Get last ID and increment
    const last = await collection.find({}).sort({ id: -1 }).limit(1).toArray();
    const newId = last.length ? String(parseInt(last[0].id, 10) + 1) : "1";

    newItem.id = newId;
    newItem.date_added = Math.floor(Date.now() / 1000);

    // Save uploaded image reference
    if (req.file) {
      newItem.image = `/images/${req.file.filename}`;
    }

    await collection.insertOne(newItem);
    res.status(201).json({ message: "Item added", id: newId });
  } catch (err) {
    res.status(500).json({ error: "Failed to add item" });
  }
});

/**
 * PUT /api/secondchance/items/:id
 */
router.put("/items/:id", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const collection = db.collection("secondChanceItems");

    const existing = await collection.findOne({ id: req.params.id });
    if (!existing) return res.status(404).json({ message: "Item not found" });

    const ageDays = Number(req.body.age_days);
    const update = {
      category: req.body.category,
      condition: req.body.condition,
      age_days: ageDays,
      description: req.body.description,
      age_years: Number.isFinite(ageDays) ? Number((ageDays / 365).toFixed(1)) : existing.age_years,
      updatedAt: Math.floor(Date.now() / 1000),
    };

    await collection.updateOne({ id: req.params.id }, { $set: update });
    res.json({ message: "Item updated" });
  } catch (err) {
    res.status(500).json({ error: "Failed to update item" });
  }
});

/**
 * DELETE /api/secondchance/items/:id
 */
router.delete("/items/:id", async (req, res) => {
  try {
    const db = await connectToDatabase();            // ✅ Evidence C
    const collection = db.collection("secondChanceItems");

    const existing = await collection.findOne({ id: req.params.id });
    if (!existing) return res.status(404).json({ message: "Item not found" });

    await collection.deleteOne({ id: req.params.id });
    res.json({ message: "Item deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete item" });
  }
});

module.exports = router;

