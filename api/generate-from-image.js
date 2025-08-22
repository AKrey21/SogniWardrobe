const express = require("express");
const cors = require("cors");
const router = require("../src/routes/generateFromImage"); // router.post('/generate-from-image', ...)

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Mount at /api so /api/generate-from-image hits router's path
app.use("/api", router);

app.use((req, _res, next) => { console.log("[/api/generate-from-image] hit:", req.method, req.url); next(); });

module.exports = (req, res) => app(req, res);
