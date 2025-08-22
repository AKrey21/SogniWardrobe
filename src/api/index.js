// api/index.js
const express = require("express");

// Import all routers from src/routes
const generateRouter = require("../src/routes/generate");
const analyzeRouter = require("../src/routes/analyzeItems");
const generateFromImageRouter = require("../src/routes/generateFromImage");

const app = express();
app.use(express.json({ limit: "1mb" }));

// Mount them under /api
app.use("/api", generateRouter);
app.use("/api", analyzeRouter);
app.use("/api", generateFromImageRouter);

// Hand off to Express (so Vercel can invoke it)
module.exports = (req, res) => app(req, res);
