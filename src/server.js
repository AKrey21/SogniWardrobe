// server.js (Corrected Version)

require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");

// --- UPDATED: Corrected file paths ---
// The paths are now relative to the current file's location inside 'src'
const generateFromTextRouter = require("./routes/generate");
const generateFromImageRouter = require("./routes/generateFromImage");

const app = express();
const PORT = process.env.PORT || 3000;

/* ----------------------- express setup -------------------------- */
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// This path needs to go up one level to find the 'public' folder
app.use(express.static(path.join(__dirname, "../public")));

// Healthcheck
app.get("/heartbeat", (_req, res) => res.send("OK"));

// --- Mount BOTH API routers ---
app.use("/api", generateFromTextRouter);
app.use("/api", generateFromImageRouter);

/* -------------------------- bootstrap --------------------------- */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Web app ready on http://localhost:${PORT}`);
});
