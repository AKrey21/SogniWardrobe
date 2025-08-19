# Sogni Wardrobe — Web App

A tiny web app that generates lookbook-style outfit images using the Sogni SDK.  
Frontend (your site) lives in `public/`. Backend (API + prompts + Sogni client) lives in `src/`.

---

## ✨ Features
- Simple **frontend** (`public/index.html` + `public/app.js`) to collect user inputs and show results
- Clean **backend split**:
  - `/api/generate` endpoint (Express)
  - Prompt-building isolated under `src/prompts/`
  - Sogni SDK connection & image generation in `src/sogni/`
- Healthcheck: `GET /heartbeat`

---

## 🗂️ Project Structure

```
project-root/
├─ public/
│  ├─ index.html          # The main page of your site (serves the UI)
│  └─ app.js              # Frontend JS: handles form, calls /api/generate, renders images
├─ src/
│  ├─ server.js           # Express server entrypoint; serves /public and mounts API routes
│  ├─ routes/
│  │  └─ generate.js      # POST /api/generate — validates input, builds prompts, calls Sogni
│  ├─ sogni/
│  │  └─ client.js        # Sogni SDK bootstrapping & image generation helper
│  └─ prompts/
│     ├─ constants.js     # Enums/lists (styles, genders…) + base negative prompt, style prompts
│     ├─ helpers.js       # Small functions (race/complexion text, BMI/stature descriptors, garment specs)
│     └─ buildPrompt.js   # Builds positive/negative prompts from request data
├─ .env                   # Environment variables (not committed)
├─ package.json           # NPM scripts & deps (start/dev)
└─ package-lock.json
```

> If you still have legacy files (like `webServer.js`), they can be deleted once the split is working.

---

## 📄 What each file does

### Frontend (`public/`)
- **`public/index.html`**
  - The HTML shell of the app (form inputs, dropdowns, results area).
  - Loads `public/app.js` and any CSS assets you add.
  - Served at `GET /` by Express.

- **`public/app.js`**
  - Listens to your form submit / button clicks.
  - Gathers inputs (gender, style, garment item, height/weight, race, complexion, batch size).
  - Calls the backend: `fetch('/api/generate', { method: 'POST', body: JSON.stringify({...}) })`.
  - Renders generated images and displays the prompts/metadata if you choose.

### Backend (`src/`)
- **`src/server.js`**
  - Loads environment variables (`dotenv`).
  - Sets up Express, JSON parsing, and serves static files from `public/`.
  - Exposes `GET /heartbeat` and mounts the generate route at `POST /api/generate`.
  - Connects to Sogni on startup (via `connectSogni()` from `sogni/client.js`).

- **`src/routes/generate.js`**
  - Validates request body:
    - `gender` (Male | Female | Unisex)
    - `style` (Formal | Casual | Techwear | …)
    - `itemText` (e.g., "baby tee", "cargo pants")
    - optional: `heightCm`, `weightKg`, `race`, `complexion`, `batch`
  - Builds `positivePrompt` and `negativePrompt` using `prompts/buildPrompt.js`.
  - Calls Sogni to generate images and returns the image array + metadata.
  - Handles common Sogni/validation errors and returns user-friendly messages.

- **`src/sogni/client.js`**
  - Creates a Sogni client instance using your endpoints + credentials.
  - Exposes:
    - `connectSogni()` — called once on server start.
    - `generateImages({...})` — creates a generation project and waits for images.

- **`src/prompts/constants.js`**
  - Lists for `GENDERS`, `STYLES`, `COMPLEXIONS`.
  - `RACE_LABELS` adapted for Singapore context.
  - `NEGATIVE_BASE` (base safety/quality negatives to avoid artifacts).
  - `STYLE_PROMPTS` (micro-guidance per style).

- **`src/prompts/helpers.js`**
  - `normalizeRace()` → maps input to a concise label.
  - `ethnicFeaturesFor()` → brief, respectful descriptors.
  - `complexionDescriptor()` → consistent skin-tone phrasing (Fitzpatrick I–VI hints).
  - `bmiDescriptor()` / `statureDescriptor()` → soft body/stature hints (optional).
  - `garmentSpecification()` → detail garment fit/structure if the item is recognized.

- **`src/prompts/buildPrompt.js`**
  - `buildPositivePrompt()` → stitches together body type, style, garment, lighting, framing.
  - `buildNegativePrompt()` → discourages wrong scenes, cropped limbs, mismatched styles, etc.

---

## 🔧 Getting Started

### 1) Install dependencies
```bash
npm install
```

### 2) Create `.env`
Create a `.env` at the project root with your values:
```
APP_ID=your_app_id
SOGNI_USERNAME=your_username
SOGNI_PASSWORD=your_password
SOGNI_STEPS=12
SOGNI_WIDTH=768
SOGNI_HEIGHT=1152
SOGNI_BATCH=3
```

### 3) Run
- Development (auto-reload):
```bash
npm run dev
```
- Production-style:
```bash
npm start
```

Open http://localhost:${PORT}  (defaults to 3000).

---

## 🧪 API — `POST /api/generate`

**Body (JSON):**
```json
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
```

**Success response:**
```json
{
  "images": [
    {"url": "...", "id": "..."},
    {"url": "...", "id": "..."}
  ],
  "meta": {
    "positivePrompt": "…",
    "negativePrompt": "…",
    "gender": "Female",
    "style": "Y2K",
    "itemText": "baby tee",
    "batch": 3,
    "heightCm": 165,
    "weightKg": 55,
    "race": "Chinese",
    "complexion": "Light-medium",
    "modelParams": { "model": "flux1-schnell-fp8", "steps": 12, "guidance": 1.5, "width": 768, "height": 1152 }
  }
}
```

**Common errors:**
- `400` — invalid input (e.g., style string not in allowed list)
- `401` — Sogni auth error
- `402` — Insufficient Sogni credits
- `422` — Sogni generated no images (try adjusting prompts)
- `503` — Sogni not connected (server startup/connection issue)
- `500` — Unhandled server error

---

## 🧩 Troubleshooting

- **`Error: Cannot find module './sogni/client'`**
  - Ensure `src/sogni/client.js` exists and the import path in `src/server.js` is `require('./sogni/client')`.

- **Images not appearing on the page**
  - Open DevTools → Network → check `POST /api/generate`.
  - If it returns errors, see “Common errors” above.

- **CORS issues**
  - The frontend is served by the same Express app (same origin), so CORS is not needed. If you serve the frontend elsewhere, add CORS middleware to `src/server.js` and allow your origin.

- **Vercel/Serverless**
  - This app maintains a long-lived connection to Sogni. Prefer a persistent Node host (Render, Fly.io, Railway, Heroku, a VM, etc.).

---

## 📦 NPM Scripts

- `npm run dev` — start server with nodemon (hot reload)
- `npm start` — start server with Node

---

## 📜 Notes

- You can tweak the tone/strength of prompts inside `src/prompts/` without touching route logic.
- New garment types? Add entries to `garmentSpecification()` in `helpers.js`.
- New styles? Add to `STYLES` and `STYLE_PROMPTS` in `constants.js`.

---

Happy building!
