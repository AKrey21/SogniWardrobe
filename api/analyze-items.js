const express = require("express");
const cors = require("cors");
const router = require("../src/routes/analyzeItems"); // router.post('/analyze-items', ...)

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Mount at /api so /api/analyze-items hits router's path
app.use("/api", router);

app.use((req, _res, next) => { console.log("[/api/analyze-items] hit:", req.method, req.url); next(); });

module.exports = (req, res) => app(req, res);
