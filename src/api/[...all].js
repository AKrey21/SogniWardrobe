// api/[...all].js
const express = require("express");
const cors = require("cors");

const generateFromTextRouter  = require("../src/routes/generate");
const generateFromImageRouter = require("../src/routes/generateFromImage");
const analyzeItemsRouter      = require("../src/routes/analyzeItems");

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Preflight for any path
app.options("*", cors(), (_req, res) => res.sendStatus(204));

// IMPORTANT: mount at "/" so /generate, /generate-from-image, /analyze-items
// match regardless of how Vercel forwards the path to this catch-all.
app.use("/", generateFromTextRouter);      // defines POST /generate 
app.use("/", generateFromImageRouter);     // defines POST /generate-from-image 
app.use("/", analyzeItemsRouter);          // defines POST /analyze-items 

module.exports = (req, res) => app(req, res);
