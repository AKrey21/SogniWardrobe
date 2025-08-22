# 👕 Sogni Wardrobe (Web)

> **Wardrobe Closet** — save, organize, and compare generated outfits.  
> Built for the **NTU × Sogni Hackathon (2025)**.

Generate lookbook-style outfit images using the Sogni SDK.  
Frontend lives in `public/`. Backend (Express API + prompts + Sogni client) lives in `src/`.

---

## ✨ Features

- **Text-to-Lookbook generation** via Sogni (username/password — no API key).
- **Image-to-Image**: generate new looks from a reference image.
- **Garment focus**: call out a key item (e.g., “long baggy denim jorts”).
- **Body/complexion aware phrasing**: optional `heightCm`, `weightKg`, `race`, `complexion`.
- **Color-lock negatives** to avoid color drift (e.g., white → ivory).
- **Batch generation** with gallery grid.
- **Click-to-select & Regenerate**: re-roll only the images you select.
- **Wardrobe UI**: tile layout with selection highlight and a “closet reveal” animation.
- **(Optional) Outfit analysis** (Gemini): extract items/labels from an image.
- **Ops**: `GET /heartbeat` healthcheck.

> **Roadmap**: persistent wardrobes, shareable links, CDN storage.

---

## 🏁 Quickstart

```bash
# 1) Install deps
npm install

# 2) Configure environment (see below)

# 3) Run (dev or prod)
npm run dev   # if you use nodemon
# or
npm start     # node src/server.js

# App: http://localhost:3000  (unless PORT is set)
```

### Requirements
- Node.js **18+** (Node **20 LTS** recommended)
- Sogni account (logs in with **username/password**)
- Outbound internet from server to Sogni

---

## 🗂️ Project Structure (Actual)

```
project-root/
├─ public/
│  ├─ images/
│  │  └─ Sogni.png
│  ├─ app.js
│  ├─ index.html
│  ├─ styles.css
│  └─ wardrobe.js
├─ src/
│  ├─ api/
│  │  └─ index.js
│  ├─ index.js
│  ├─ prompts/
│  │  ├─ buildPrompt.js
│  │  ├─ constants.js
│  │  └─ helpers.js
│  ├─ routes/
│  │  ├─ analyzeltems.js        # (note the filename as-is)
│  │  ├─ generate.js
│  │  └─ generateFromImage.js
│  ├─ services/
│  │  └─ gemini.js
│  ├─ sogni/
│  │  └─ client.js
│  └─ server.js
├─ .env
├─ package.json
└─ README.md
```

> If you see the `analyzeltems.js` filename odd: it’s spelled that way in the repo and referenced accordingly. Keep the same spelling in imports.

---

## 📄 What each file does

### Frontend — `public/`

- **`public/index.html`** — HTML shell of the app (form/select fields, results grid). Loads Tailwind (if used), `app.js`, `wardrobe.js`, and `styles.css`.
- **`public/app.js`** — Handles user inputs; POSTs to backend endpoints; renders the returned images and meta. Also wires up click‑to‑select and regenerate flows.
- **`public/wardrobe.js`** — Wardrobe UX: tile selection states, highlight animation, and any “closet reveal” once a generation completes.
- **`public/styles.css`** — Custom styles layered over Tailwind (or plain CSS).
- **`public/images/Sogni.png`** — Branding/placeholder asset used by the UI.

### Backend — `src/`

- **`src/server.js`** — Express bootstrap:
  - Loads env (`dotenv`), serves static `/public`, sets JSON middleware.
  - Mounts routes for `/api/generate`, `/api/generate-from-image`, `/api/analyze-items` (see below).
  - Exposes `GET /heartbeat` for ops.
  - Initializes the Sogni client on startup.

- **`src/sogni/client.js`** — Sogni SDK bootstrap and helpers:
  - `connectSogni()` — login/init using `SOGNI_USERNAME` / `SOGNI_PASSWORD` / `APP_ID`.
  - `generateImages(options)` — creates generation jobs and returns images.

- **`src/prompts/constants.js`** — Prompt constants:
  - Lists for `GENDERS`, `STYLES`, `COMPLEXIONS`, plus `STYLE_PROMPTS`.
  - `NEGATIVE_BASE` to discourage artifacts/wrong scenes/cropping.
  - Color‑lock and other small prompt pieces.

- **`src/prompts/helpers.js`** — Prompt helpers:
  - `normalizeRace()`, `ethnicFeaturesFor()`, `complexionDescriptor()`,
    `bmiDescriptor()`, `statureDescriptor()`, `garmentSpecification()`.

- **`src/prompts/buildPrompt.js`** — Assembles the final `positivePrompt` and `negativePrompt` using constants + helpers and the request body.

- **`src/routes/generate.js`** — **POST `/api/generate`**
  - Validates input (`gender`, `style`, `itemText`, optional body metrics).
  - Builds prompts and calls Sogni for **text‑to‑image** generation.
  - Responds with `{ images: [...], meta: {...} }`.

- **`src/routes/generateFromImage.js`** — **POST `/api/generate-from-image`**
  - For **image‑to‑image** generation. Accepts a reference image (URL or base64) plus optional style/garment fields, then calls Sogni and returns images.

- **`src/routes/analyzeltems.js`** — **POST `/api/analyze-items`**
  - (Filename kept as‑is.) Accepts an outfit image (URL or base64) and returns extracted garment labels/attributes using the Gemini service.
  - Requires `services/gemini.js` and (optionally) `GEMINI_API_KEY` in `.env` (see below).

- **`src/services/gemini.js`** — Small wrapper for Gemini (or similar) to label/describe clothing seen in an image. Central place to swap providers if needed.

- **`src/api/index.js`** — Convenience module to register/compose additional API routers (kept small; for future expansion).

- **`src/index.js`** — Light entry/utility module (e.g., shared exports or dev helpers).

### Root

- **`.env`** — Not committed. Holds credentials & defaults (next section).
- **`package.json`** — Dependencies and scripts (`start`, `dev`).
- **`README.md`** — You’re reading it 🙂

---

## 🔐 Environment

Create a `.env` in the project root:

```bash
# --- Sogni auth (required) ---
SOGNI_USERNAME=your_username
SOGNI_PASSWORD=your_password
APP_ID=your_app_id

# --- Default model params (overridable per request) ---
SOGNI_STEPS=12
SOGNI_WIDTH=768
SOGNI_HEIGHT=1152
SOGNI_BATCH=3

# --- (Optional) Analysis service ---
# Required only if you call /api/analyze-items
GEMINI_API_KEY=your_gemini_key

# --- Server ---
PORT=3000
```

> This app **does not** use `SOGNI_API_KEY`. Login is via username/password.

---

## 📡 API

### 1) `POST /api/generate` — Text → Images

**Request body (JSON)**
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

**Response**
```json
{
  "images": [ {"url": "https://.../1.png", "id": "abc"} ],
  "meta": { "positivePrompt": "...", "negativePrompt": "...", "modelParams": { "width": 768, "height": 1152, "steps": 12, "guidance": 1.5 } }
}
```

---

### 2) `POST /api/generate-from-image` — Image → Images

**Request body (JSON)**
```json
{
  "imageUrl": "https://example.com/reference.jpg",
  "style": "Streetwear",
  "itemText": "baggy denim jorts",
  "batch": 3
}
```
> You can alternatively send `imageBase64` if you prefer. The endpoint returns the same response shape as `/api/generate` with a new `images` array.

---

### 3) `POST /api/analyze-items` — Outfit Labeling (Optional)

**Request body (JSON)**
```json
{
  "imageUrl": "https://example.com/outfit.jpg"
}
```
**Response**
```json
{
  "items": [
    {"label":"oversized tee","color":"white","confidence":0.92},
    {"label":"denim jorts","color":"indigo","confidence":0.88},
    {"label":"sneakers","color":"white","confidence":0.90}
  ]
}
```
> Requires `GEMINI_API_KEY`. If missing, the route may be disabled or return a 501 with a helpful message.

---

### Healthcheck

`GET /heartbeat` → `{ "ok": true }`

---

## 🧰 NPM Scripts

- `npm start` – start server (`node src/server.js`)
- `npm run dev` – start with hot reload (if you added `nodemon`)

---

## 🚀 Deployment Notes

- Best on a **persistent Node** host (Fly.io, Railway, Render, VM).  
  Some serverless platforms throttle WebSocket/long-lived connections used by Sogni.
- Mirror all `.env` values in your hosting provider.

---

## 🙌 Hackathon Notes (NTU × Sogni)

- Built for **NTU × Sogni Hackathon (2025)** to showcase fashion idea → generated looks → curated lookbook.
- Deliverables: 5‑min demo, pitch deck, public repo.  
  _Placeholders:_
  - Demo video: `https://www.youtube.com/watch?v=ffiowr_zu98`
  - Pitch deck: `TBD`

---

© 2025 Vibe Coders team.
