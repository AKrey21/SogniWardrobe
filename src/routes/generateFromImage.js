// src/routes/generateFromImage.js

const express = require("express");
const multer = require("multer"); // Handles file uploads
const {
  GENDERS,
  STYLES,
  DEFAULT_BATCH,
  NEGATIVE_PROMPT,
  RACE_LABELS,
} = require("../prompts/constants");
const { buildPrompt } = require("../prompts/buildPrompt");
const { getSogniClient } = require("../sogni/client");
// UPDATED: Import the new multi-image helper
const { analyzeImagesWithGemini } = require("../services/gemini");

const router = express.Router();

// Setup multer for in-memory file handling
const upload = multer({ storage: multer.memoryStorage() });

/* -------------------------------------------------------------
  API Endpoint to Generate from MULTIPLE Images
  -------------------------------------------------------------
*/
// UPDATED: Use upload.array() to accept up to 5 files with the key 'image_files'
router.post(
  "/generate-from-image",
  upload.array("image_files", 5),
  async (req, res) => {
    try {
      // 1. --- Gemini Analysis Step ---
      // UPDATED: Check for req.files (plural)
      if (!req.files || req.files.length === 0) {
        return res
          .status(400)
          .json({ error: "At least one image file is required." });
      }

      // UPDATED: Call the new multi-image Gemini helper, passing the array of files
      const itemTextFromGemini = await analyzeImagesWithGemini(req.files);

      // --- ADD THIS LINE TO TEST GEMINI ---
      console.log("✅ Gemini Analysis Result:", itemTextFromGemini);
      // --- END OF TEST LINE ---

      if (!itemTextFromGemini) {
        return res
          .status(500)
          .json({ error: "Gemini analysis failed to return a description." });
      }
      // --- End of Gemini Step ---

      // 2. --- Use Gemini's synthesized output in your existing logic ---
      const { gender, style, batch, heightCm, weightKg, race, complexion } =
        req.body || {};

      const g = (gender || "").trim();
      const s = (style || "").trim();
      const item = itemTextFromGemini; // The key change: using Gemini's synthesized analysis
      const n = Math.max(1, Math.min(Number(batch || DEFAULT_BATCH), 6));

      // --- Validation and Sogni Client Setup (Your existing logic) ---
      if (!GENDERS.includes(g))
        return res
          .status(400)
          .json({ error: "Invalid gender", allowed: GENDERS });
      if (!STYLES.includes(s))
        return res
          .status(400)
          .json({ error: "Invalid style", allowed: STYLES });

      const sogni = await getSogniClient();
      if (!sogni)
        return res
          .status(503)
          .json({ error: "Sogni not connected yet. Try again." });

      // --- Prompt Building (Your existing powerful logic) ---
      const prompt = buildPrompt({
        gender: g,
        style: s,
        itemText: item,
        heightCm,
        weightKg,
        race,
        complexion,
      });

      // --- IMPORTANT: Paste your full, detailed negative prompt logic back in here ---
      const negativePrompt = [
        NEGATIVE_PROMPT,
        // ... your logic for sceneNegatives, croppingNegatives, anatomyNegatives, etc.
      ]
        .filter(Boolean)
        .join(", ");

      // --- Sogni API Call (Your existing logic) ---
      const model = process.env.SOGNI_MODEL_ID || "flux1-schnell-fp8";
      const steps = Number(process.env.SOGNI_STEPS || 12);
      const width = Number(process.env.SOGNI_WIDTH || 768);
      const height = Number(process.env.SOGNI_HEIGHT || 1152);
      const guidance = Number(process.env.SOGNI_GUIDANCE || 3.5);

      console.log("Generated prompt:", prompt);
      console.log("Negative prompt:", negativePrompt);

      const project = await sogni.projects.create({
        tokenType: "spark",
        modelId: model,
        positivePrompt: prompt,
        negativePrompt,
        steps,
        guidance,
        numberOfImages: n,
        scheduler: "Euler",
        sizePreset: "custom",
        width,
        height,
      });

      const images = await project.waitForCompletion();

      if (!images || !images.length) {
        return res.status(422).json({
          error: "No images generated (possibly blocked by safety filters).",
        });
      }

      // 3. --- Send Final Response ---
      res.json({
        images: images.slice(0, n),
        meta: {
          prompt,
          negativePrompt,
          itemText: itemTextFromGemini,
          gender: g,
          style: s,
          batch: n,
          heightCm,
          weightKg,
          race,
          complexion,
          modelParams: { steps, guidance, width, height },
        },
      });
    } catch (err) {
      console.error("Generation error:", err);
      res
        .status(500)
        .json({ error: "Server error while generating from image." });
    }
  }
);

module.exports = router;
