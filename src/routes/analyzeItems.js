// src/routes/analyzeItems.js
const express = require("express");
const multer = require("multer");
const { identifyItemsInImages } = require("../services/gemini");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/* ---------- Preflight for /api/analyze-items ---------- */
router.options("/analyze-items", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.status(204).end();
});

/* ---------- Per-user/IP in-flight guard ---------- */
const inflight = new Map();
const keyFromReq = (req) =>
  (req.headers["x-user-id"] || req.headers["x-forwarded-for"] || req.ip || "global").toString();

/* Analyze images and return list of items */
router.post("/analyze-items", upload.array("image_files", 5), async (req, res) => {
  const key = keyFromReq(req);
  if (inflight.has(key)) {
    res.setHeader("Retry-After", "5");
    return res.status(429).json({ error: "Another analysis is still running. Please wait and try again." });
  }
  inflight.set(key, true);

  try {
    if (!req.files || !req.files.length) {
      return res.status(400).json({ error: "At least one image file is required." });
    }

    const identifiedItems = await identifyItemsInImages(req.files);
    if (!identifiedItems || !identifiedItems.length) {
      return res.status(500).json({ error: "AI could not identify any items in the images." });
    }

    res.json({ items: identifiedItems });
  } catch (err) {
    console.error("ANALYZE_ITEMS_ERROR", { message: err?.message, stack: err?.stack });
    res.status(500).json({ error: "Server error while analyzing items." });
  } finally {
    inflight.delete(key);
  }
});

module.exports = router;
