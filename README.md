Sogni Wardrobe (Web)

👕 Wardrobe Closet — save, organize, and compare generated outfits

Generate lookbook-style outfit images using the Sogni SDK.
Frontend lives in public/. Backend (Express API + prompts + Sogni client) lives in src/.

Features

Text-to-Lookbook generation via Sogni (no API key; logs in with username/password).

Style presets (easily extended): e.g., Casual, Streetwear, Y2K, Office, Techwear.

Garment focus: call out a key item (e.g., “Long baggy denim jorts”) and keep it centered.

Body/complexion aware phrasing: optional heightCm, weightKg, race, complexion.

Color-lock negative prompts to avoid white→ivory drift and similar.

Batch generation with gallery grid.

Click-to-select & Regenerate: re-roll only the images you select (keeps your current prompt).

Wardrobe UI: tile layout with highlight/selection and “closet” reveal animation.

Lookbook view: arrange generated looks on a separate page (simple drag/positioning).

Healthcheck endpoint (GET /heartbeat) for ops.

Roadmap: persistent user accounts/wardrobes, image-to-image, shareable links, CDN storage.

Built for NTU × Sogni Hackathon

This project was created for the NTU × Sogni Hackathon (2025) to showcase a fast, usable pipeline from fashion idea → generated looks → curated lookbook.
Deliverables: 5-min demo, pitch deck, public repo.

Add your links here when ready:

Demo video: TBD

Pitch deck: TBD

Quickstart
# 1) Install
npm install

# 2) Create your .env (see Environment below)

# 3) Run in dev (if you use nodemon)
npm run dev

# 4) Or run normally
npm start
# → http://localhost:3000 (unless PORT is set)

Requirements

Node.js 18+ (Node 20 LTS recommended)

Sogni account (logs in with username/password; no API key)

Outbound internet from server to Sogni

Project Structure
project-root/
├─ public/
│  ├─ index.html          # UI shell
│  ├─ app.js              # Frontend logic (form → /api/generate → render)
│  ├─ wardrobe.js         # Wardrobe UI interactions/animations (tiles, selection)
│  ├─ styles.css          # Optional CSS (in addition to Tailwind)
│  └─ images/             # Static assets
├─ src/
│  ├─ server.js           # Express server; serves /public; mounts routes
│  ├─ routes/
│  │  └─ generate.js      # POST /api/generate (prompt build + Sogni call)
│  ├─ prompts/
│  │  ├─ constants.js     # Style lists, base prompts, negative prompt pieces
│  │  ├─ helpers.js       # Body/complexion wording, garment spec builders
│  │  └─ buildPrompt.js   # Assembles positive/negative prompts
│  ├─ sogni/
│  │  └─ client.js        # Sogni SDK bootstrap + generate helper
│  ├─ services/           # (optional) shared services/utilities
│  └─ api/                # (optional) additional endpoints/modules
├─ .env
├─ package.json
└─ README.md

Environment

Create a .env in the project root:

# --- Sogni auth (required) ---
SOGNI_USERNAME=your_username
SOGNI_PASSWORD=your_password
APP_ID=your_app_id

# --- Default model params (overridable per request) ---
SOGNI_STEPS=12
SOGNI_WIDTH=768
SOGNI_HEIGHT=1152
SOGNI_BATCH=3

# --- Server ---
PORT=3000


Note: This app does not use SOGNI_API_KEY. Login is via username/password.

NPM Scripts

npm start – start server with Node (node src/server.js)

npm run dev – start with hot reload (if you added nodemon)

API
POST /api/generate

Request body (JSON)

{
  "gender": "Female",
  "style": "Y2K",
  "itemText": "baby tee",
  "batch": 3,
  "heightCm": 165,
  "weightKg": 55,
  "race": "Chinese",
  "complexion": "Light-medium"
}


Response (success)

{
  "images": [
    {"url": "https://.../image1.png", "id": "abc"},
    {"url": "https://.../image2.png", "id": "def"}
  ],
  "meta": {
    "positivePrompt": "...",
    "negativePrompt": "...",
    "modelParams": {
      "model": "flux1-schnell-fp8",
      "steps": 12,
      "guidance": 1.5,
      "width": 768,
      "height": 1152
    }
  }
}

Healthcheck

GET /heartbeat → { "ok": true }

Deployment Notes

Best on a persistent Node host (Fly.io, Railway, Render, VM).
Some serverless platforms can throttle WebSocket/long-lived connections used by Sogni.

Mirror your .env in hosting provider settings.

Troubleshooting

Error: Cannot find module 'dotenv'
npm i dotenv and ensure require('dotenv').config() is at the top of src/server.js.

Cannot find module './prompts/constants'
Ensure src/prompts/constants.js exists and import paths are correct.

Images not appearing
DevTools → Network → check POST /api/generate response.
If 4xx/5xx, verify .env credentials and request body.

WebSocket not connected on serverless
Use a persistent Node host or refactor to a pure-HTTP generation flow.

Contributing

Add styles in prompts/constants.js (STYLES, STYLE_PROMPTS).

Extend garment logic in prompts/helpers.js (garmentSpecification()).

Tune wording in prompts/buildPrompt.js without changing route logic.

© 2025 Sogni Wardrobe team. Built for the NTU × Sogni Hackathon.
