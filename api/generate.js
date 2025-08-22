const express = require("express");
const cors = require("cors");

let generateRouter;
try {
  generateRouter = require("../src/routes/generate"); // must exist & module.exports = router
} catch (e) {
  console.error("FAILED to load ../src/routes/generate:", e);
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.options("*", cors(), (_req, res) => res.sendStatus(204));

// normalize path: strip leading /api (Vercel) and map "/" → "/generate"
app.use((req, _res, next) => {
  if (req.url.startsWith("/api")) req.url = req.url.slice(4) || "/";
  if (req.url === "/" || req.url === "") req.url = "/generate";
  next();
});

if (!generateRouter || typeof generateRouter !== "function") {
  app.use((_req, res) => res.status(500).json({ error: "generate router failed to load. Check path/case/module.exports." }));
} else {
  app.use("/", generateRouter);
}

module.exports = (req, res) => app(req, res);
