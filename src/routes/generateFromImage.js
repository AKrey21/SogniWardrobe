// src/routes/generateFromImage.js
const express = require("express");
const multer = require("multer");
const { GENDERS, STYLES, DEFAULT_BATCH, NEGATIVE_PROMPT } = require("../prompts/constants");
const { buildPrompt } = require("../prompts/buildPrompt");
const { getSogniClient } = require("../sogni/client");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/* ---------- Preflight for /api/generate-from-image ---------- */
router.options("/generate-from-image", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.status(204).end();
});

router.post("/generate-from-image", upload.array("image_files", 5), async (req, res) => {
  try {
    const {
      gender, style, batch,
      heightCm, weightKg, race, complexion,
      itemText, deselectedItems
    } = req.body || {};

    if (!req.files || !req.files.length) return res.status(400).json({ error: "Image files are required for generation." });
    if (!itemText)                    return res.status(400).json({ error: "A list of selected items (itemText) is required." });

    const g = (gender || "").trim();
    const s = (style  || "").trim();
    const item = itemText;
    const n = Math.max(1, Math.min(Number(batch || DEFAULT_BATCH), 6));

    if (!GENDERS.includes(g)) return res.status(400).json({ error: "Invalid gender", allowed: GENDERS });
    if (!STYLES.includes(s))  return res.status(400).json({ error: "Invalid style",  allowed: STYLES  });

    const sogni = await getSogniClient();
    if (!sogni) return res.status(503).json({ error: "Sogni not connected yet. Try again." });

    const prompt = buildPrompt({ gender: g, style: s, itemText: item, heightCm, weightKg, race, complexion });

    // Build negative prompt pieces
    const negativePromptParts = [NEGATIVE_PROMPT];

    // Include user-deselected items as hard negatives
    if (deselectedItems) {
      const deselectedPrompt = `NOT ${String(deselectedItems).replace(/,\s*/g, ", NOT ")}`;
      negativePromptParts.push(deselectedPrompt);
    }

    const negativePrompt = negativePromptParts.filter(Boolean).join(", ");

    const model    = process.env.SOGNI_MODEL_ID || "flux1-schnell-fp8";
    const steps    = Number(process.env.SOGNI_STEPS    || 12);
    const width    = Number(process.env.SOGNI_WIDTH    || 768);
    const height   = Number(process.env.SOGNI_HEIGHT   || 1152);
    const guidance = Number(process.env.SOGNI_GUIDANCE || 3.5);

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
      width, height
    });

    const images = await project.waitForCompletion();
    if (!images || !images.length) return res.status(422).json({ error: "No images generated." });

    res.json({
      images: images.slice(0, n),
      meta: { prompt, negativePrompt, itemText: item, gender: g, style: s, batch: n, heightCm, weightKg, race, complexion, modelParams: { steps, guidance, width, height } }
    });
  } catch (err) {
    console.error("Generation error:", err);
    res.status(500).json({ error: "Server error while generating from image." });
  }
});

module.exports = router;
