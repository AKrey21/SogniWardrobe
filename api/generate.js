const express = require("express");
const cors = require("cors");
const router = require("../src/routes/generate"); // router.post('/generate', ...)

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Mount at /api so /api/generate hits router's '/generate'
app.use("/api", router);

// Optional log
app.use((req, _res, next) => { console.log("[/api/generate] hit:", req.method, req.url); next(); });

module.exports = (req, res) => app(req, res);
