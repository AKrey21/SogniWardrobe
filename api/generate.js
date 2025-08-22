// src/routes/generate.js
const express = require("express");
const router = express.Router();

const DEFAULT_URL = "https://api.sogni.ai/v1/generate"; // change if your endpoint differs

router.post("/generate", async (req, res) => {
  try {
    const apiKey = process.env.SOGNI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "SOGNI_API_KEY missing in environment" });
    }

    const url = process.env.SOGNI_GENERATE_URL || DEFAULT_URL;

    // Ensure we don't try to stream inside a serverless function
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
    const text = await r.text(); // pass through exact response (json/error)

    // Forward upstream status + body as-is
    res.status(r.status).type(contentType).send(text);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

module.exports = router;
