// api/index.js
const express = require("express");
const cors = require("cors");

// Import routers from src
const generateRouter         = require("../src/routes/generate");
const analyzeRouter          = require("../src/routes/analyzeItems");
const generateFromImageRouter= require("../src/routes/generateFromImage");

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Global preflight for serverless
app.options("/api/*", cors(), (req, res) => res.sendStatus(204));

// Mount API routers
app.use("/api", generateRouter);
app.use("/api", analyzeRouter);
app.use("/api", generateFromImageRouter);

// Export for Vercel
module.exports = (req, res) => app(req, res);
