const express = require("express");
const cors = require("cors");

let router;
try {
  router = require("../src/routes/analyzeItems");
} catch (e) {
  console.error("FAILED to load ../src/routes/analyzeItems:", e);
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.options("*", cors(), (_req, res) => res.sendStatus(204));

app.use((req, _res, next) => {
  if (req.url.startsWith("/api")) req.url = req.url.slice(4) || "/";
  if (req.url === "/" || req.url === "") req.url = "/analyze-items";
  next();
});

if (!router || typeof router !== "function") {
  app.use((_req, res) => res.status(500).json({ error: "analyze-items router failed to load. Check path/case/module.exports." }));
} else {
  app.use("/", router);
}

module.exports = (req, res) => app(req, res);
