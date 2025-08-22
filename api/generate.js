const express = require("express");
const cors = require("cors");
const generateRouter = require("../src/routes/generate"); // has router.post('/generate', ...)

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Preflight
app.options("*", cors(), (_req, res) => res.sendStatus(204));

// IMPORTANT: when this function file is /api/generate, the internal URL is "/"
// So rewrite "/" → "/generate" so your router matches.
app.use((req, _res, next) => {
  if (req.url === "/" || req.url === "") req.url = "/generate";
  next();
});

app.use("/", generateRouter); // router has '/generate'

module.exports = (req, res) => app(req, res);
