// src/routes/generateFromImage.js
const express = require("express");
const router = express.Router();

const DEFAULT_URL = "https://api.sogni.ai/v1/generate-from-image"; // change if different

router.post("/generate-from-image", async (req, res) => {
  try {
    const apiKey = process.env.SOGNI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "SOGNI_API_KEY missing in environment" });
    }

    const url = process.env.SOGNI_GENERATE_FROM_IMAGE_URL || DEFAULT_URL;

    const payload = { ...(req.body || {}), stream: false };

    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const contentType = r.headers.get("content-type") || "application/json";
    const text = await r.text();
    res.status(r.status).type(contentType).send(text);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

module.exports = router;
