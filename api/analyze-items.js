const express = require("express");
const cors = require("cors");
const router = require("../src/routes/analyzeItems"); // router.post('/analyze-items', ...)

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.options("*", cors(), (_req, res) => res.sendStatus(204));

// Rewrite "/" → "/analyze-items"
app.use((req, _res, next) => {
  if (req.url === "/" || req.url === "") req.url = "/analyze-items";
  next();
});

app.use("/", router);

module.exports = (req, res) => app(req, res);
