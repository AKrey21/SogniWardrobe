require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");

// Routers
const generateFromTextRouter  = require("./routes/generate");
const generateFromImageRouter = require("./routes/generateFromImage");
const analyzeItemsRouter      = require("./routes/analyzeItems");

const app  = express();
const PORT = process.env.PORT || 3000;

/* ----------------------- express setup -------------------------- */
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Global preflight for any /api/* path
app.options("/api/*", cors(), (req, res) => res.sendStatus(204));

// Serve static site (adjust if your public path differs)
app.use(express.static(path.join(__dirname, "../public")));

// Healthcheck
app.get("/heartbeat", (_req, res) => res.send("OK"));

// Mount API routers
app.use("/api", generateFromTextRouter);
app.use("/api", generateFromImageRouter);
app.use("/api", analyzeItemsRouter);

// Start local server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Web app ready on http://localhost:${PORT}`);
});
