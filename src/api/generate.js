const express = require("express");
const cors = require("cors");
const generateRouter = require("../src/routes/generate"); // router.post('/generate', ...)

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Preflight
app.options("*", cors(), (_req, res) => res.sendStatus(204));

// Normalize path for Vercel: strip a leading "/api" and map "/" -> "/generate"
app.use((req, _res, next) => {
  if (req.url.startsWith("/api")) req.url = req.url.slice(4) || "/";
  if (req.url === "/" || req.url === "") req.url = "/generate";
  next();
});

app.use("/", generateRouter); // router has '/generate'
module.exports = (req, res) => app(req, res);
