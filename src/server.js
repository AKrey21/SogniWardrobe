// src/server.js
require("dotenv").config();
const path = require("path");
const { Readable } = require("stream");
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

/* ----------------------- core middleware ----------------------- */
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/* ----------------------- static frontend ----------------------- */
// Serve everything from /public at the web root (/, /app.js, /lookbook.js, etc.)
const publicDir = path.resolve(__dirname, "../public");
app.use(express.static(publicDir)); // express official way to serve static files. :contentReference[oaicite:0]{index=0}

// If you ever need a manual fallback:
// app.get("/", (_req, res) => res.sendFile(path.join(publicDir, "index.html")));

/* -------------------------- healthcheck ------------------------ */
app.get("/heartbeat", (_req, res) => res.send("OK"));

/* --------------------------- API routes ------------------------ */
// These three stay as-is if you already have them:
try {
  app.use("/api", require("./routes/generate"));
  app.use("/api", require("./routes/generateFromImage"));
  app.use("/api", require("./routes/analyzeItems"));
} catch (e) {
  if (e.code !== "MODULE_NOT_FOUND") throw e;
  console.warn("[warn] Some generate/analyze routes missing; skipping.");
}

/* --------------------------- image proxy ----------------------- */
// Lookbook loads images via /api/proxy?url=... to avoid CORS issues in html2pdf.
// Uses native fetch (Node 18+), or add `node-fetch` if you’re on older Node. :contentReference[oaicite:1]{index=1}
app.get("/api/proxy", async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.status(400).send("Missing url");

    const upstream = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!upstream.ok) {
      return res.status(upstream.status).send("Upstream error");
    }

    res.setHeader(
      "Content-Type",
      upstream.headers.get("content-type") || "application/octet-stream"
    );
    res.setHeader("Cache-Control", "public, max-age=86400");

    // undici fetch returns a Web ReadableStream in Node 18+; convert if needed
    if (upstream.body && typeof upstream.body.getReader === "function") {
      return Readable.fromWeb(upstream.body).pipe(res);
    }
    return upstream.body ? upstream.body.pipe(res) : res.end();
  } catch (err) {
    console.error("[proxy] error:", err);
    res.status(502).send("Proxy failed");
  }
});

/* ---------------------------- boot ----------------------------- */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Web app ready:  http://localhost:${PORT}`);
  console.log(`   Static root:    ${publicDir}`);
  console.log(`   Heartbeat:      http://localhost:${PORT}/heartbeat`);
  console.log(`   Image proxy:    http://localhost:${PORT}/api/proxy?url=<encoded>`);
});
