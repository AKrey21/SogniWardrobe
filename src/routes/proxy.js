const express = require("express");
const http = require("http");
const https = require("https");

const router = express.Router();

/** Simple redirect-following stream fetch (no extra deps). */
function fetchFollow(url, headers = {}, maxHops = 5) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const client = u.protocol === "https:" ? https : http;

    const req = client.get(
      url,
      {
        headers: {
          // Some CDNs/hosts require these:
          "User-Agent": "SogniLookbookProxy/1.0",
          Accept: "image/*,*/*;q=0.8",
          Referer: headers.Referer || "",
          Origin: headers.Origin || "",
        },
      },
      (res) => {
        const code = res.statusCode || 0;
        // Handle redirects (301/302/303/307/308)
        if (
          [301, 302, 303, 307, 308].includes(code) &&
          res.headers.location &&
          maxHops > 0
        ) {
          // Resolve relative redirects
          const nextUrl = new URL(res.headers.location, url).toString();
          // Drain current response before following
          res.resume();
          fetchFollow(nextUrl, headers, maxHops - 1)
            .then(resolve)
            .catch(reject);
          return;
        }
        resolve(res);
      }
    );

    req.setTimeout(15000, () => {
      req.destroy(new Error("Upstream timeout"));
    });

    req.on("error", reject);
  });
}

router.get("/proxy", async (req, res) => {
  const raw = req.query.url;
  if (!raw) return res.status(400).send("Missing url");

  let u;
  try {
    u = new URL(raw);
  } catch {
    return res.status(400).send("Invalid url");
  }

  if (!/^https?:$/.test(u.protocol)) {
    return res.status(400).send("Unsupported protocol");
  }

  try {
    const upstream = await fetchFollow(u.toString(), {
      Referer: req.headers.referer,
      Origin: req.headers.origin,
    });

    const code = upstream.statusCode || 500;
    if (code >= 400) {
      res.status(code);
      upstream.resume(); // drain to free the socket
      return res.end();
    }

    const ct = upstream.headers["content-type"] || "application/octet-stream";
    const len = upstream.headers["content-length"];

    // (Optional hardening) only allow images:
    // if (!/^image\//i.test(ct)) { upstream.resume(); return res.status(415).send("Unsupported media type"); }

    res.setHeader("Content-Type", ct);
    if (len) res.setHeader("Content-Length", len);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

    // Critical for html2canvas/html2pdf in some envs (belt & suspenders)
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

    // If client disconnects, stop piping
    const onClose = () => upstream.destroy();
    res.once("close", onClose);

    upstream.pipe(res).on("finish", () => {
      res.off("close", onClose);
    });
  } catch (err) {
    console.error("Proxy error:", err && err.message ? err.message : err);
    res.status(502).send("Fetch failed");
  }
});

module.exports = router;
