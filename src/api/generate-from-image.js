const express = require("express");
const cors = require("cors");
const router = require("../src/routes/generateFromImage"); // router.post('/generate-from-image', ...)

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.options("*", cors(), (_req, res) => res.sendStatus(204));

// Rewrite "/" → "/generate-from-image"
app.use((req, _res, next) => {
  if (req.url === "/" || req.url === "") req.url = "/generate-from-image";
  next();
});

app.use("/", router);

module.exports = (req, res) => app(req, res);
