const express = require("express");
const cors = require("cors");

// import your routers from src/routes
const generateFromTextRouter  = require("../src/routes/generate");
const generateFromImageRouter = require("../src/routes/generateFromImage");
const analyzeItemsRouter      = require("../src/routes/analyzeItems");

const app = express();

// CORS + body parsing
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Preflight for any path
app.options("*", cors(), (_req, res) => res.sendStatus(204));

// Mount exactly like server.js
app.use("/api", generateFromTextRouter);   // -> POST /api/generate
app.use("/api", generateFromImageRouter);  // -> POST /api/generate-from-image
app.use("/api", analyzeItemsRouter);       // -> POST /api/analyze-items

module.exports = (req, res) => app(req, res);
