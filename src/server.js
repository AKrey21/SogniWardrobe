// src/server.js
require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");

// Routers
const generateFromTextRouter = require("./routes/generate");
const generateFromImageRouter = require("./routes/generateFromImage");
const analyzeItemsRouter = require("./routes/analyzeItems");

// NEW: image proxy router
const proxyRouter = require("./routes/proxy");

const app = express();
const PORT = process.env.PORT || 3000;

/* ----------------------- express setup -------------------------- */
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Serve static assets from /public (one level up from /src)
app.use(express.static(path.join(__dirname, "../public")));

// Healthcheck
app.get("/heartbeat", (_req, res) => res.send("OK"));

/* ------------------------- API routes --------------------------- */
app.use("/api", generateFromTextRouter);
app.use("/api", generateFromImageRouter);
app.use("/api", analyzeItemsRouter);

// NEW: mount the image proxy at /api/proxy
app.use("/api", proxyRouter);

/* -------------------------- bootstrap --------------------------- */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Web app ready on http://localhost:${PORT}`);
  console.log(`Lookbook at http://localhost:${PORT}/lookbook/`);
});
