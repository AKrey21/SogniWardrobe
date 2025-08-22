// src/routes/analyzeItems.js

const express = require("express");
const multer = require("multer");
const { identifyItemsInImages } = require("../services/gemini");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/* -------------------------------------------------------------
  API Endpoint to ONLY analyze images and return a list of items
  -------------------------------------------------------------
*/
router.post(
  "/analyze-items",
  upload.array("image_files", 5),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res
          .status(400)
          .json({ error: "At least one image file is required." });
      }

      // Call our new, specialized Gemini function
      const identifiedItems = await identifyItemsInImages(req.files);

      if (!identifiedItems || identifiedItems.length === 0) {
        return res
          .status(500)
          .json({ error: "AI could not identify any items in the images." });
      }

      // Success! Send the list of items back to the frontend.
      res.json({ items: identifiedItems });
    } catch (err) {
      console.error("Analysis error:", err);
      res.status(500).json({ error: "Server error while analyzing items." });
    }
  }
);

module.exports = router;
