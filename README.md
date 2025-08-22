# 👕 Sogni Wardrobe (Web)

> **Wardrobe Closet** — save, organize, and compare generated outfits.  
> Built for the **NTU × Sogni Hackathon (2025)**.

Generate lookbook‑style outfit images using the Sogni SDK.  
Frontend lives in `public/`. Backend (Express API + prompts + Sogni client) lives in `src/`.

---

## ✨ Features

- **Text‑to‑Lookbook generation** via Sogni (username/password — no API key).
- **Style presets** (extendable): Casual, Streetwear, Y2K, Office, Techwear, etc.
- **Garment focus**: keep a key item (e.g., “long baggy denim jorts”) centered in the fit.
- **Body/complexion aware phrasing**: optional `heightCm`, `weightKg`, `race`, `complexion`.
- **Color‑lock negatives** to avoid color drift (e.g., white → ivory).
- **Batch generation** with gallery grid.
- **Click‑to‑select & Regenerate**: re‑roll only the images you select.
- **Wardrobe UI**: tile layout with selection highlight and a “closet reveal” animation.
- **Ops**: `GET /heartbeat` healthcheck.

> **Roadmap**: persistent wardrobes, image‑to‑image, shareable links, CDN storage.

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

## 🗂️ Project Structure

```
project-root/
├─ public/
│  ├─ index.html
│  ├─ app.js
│  ├─ wardrobe.js
│  ├─ styles.css
│  └─ images/
├─ src/
│  ├─ server.js
│  ├─ routes/
│  │  └─ generate.js
│  ├─ prompts/
│  │  ├─ constants.js
│  │  ├─ helpers.js
│  │  └─ buildPrompt.js
│  ├─ sogni/
│  │  └─ client.js
│  ├─ services/
│  └─ api/
├─ .env
├─ package.json
└─ README.md
```

---

## 📄 What each file does

### Frontend — `public/`

- **`public/index.html`**
  - The HTML shell of the app (form fields, dropdowns, results grid).
  - Loads Tailwind (if used), `app.js`, `wardrobe.js`, and `styles.css`.
  - Served at `GET /` by Express.

- **`public/app.js`**
  - Handles user input (gender, style, garment, batch, optional height/weight/race/complexion).
  - Calls the backend: `POST /api/generate` with a JSON payload.
  - Renders returned images to the gallery and prints prompt metadata (optional).

- **`public/wardrobe.js`**
  - Manages **Wardrobe** UX: tile selection, highlight animation, and **click‑to‑regenerate** flow.
  - Provides any “closet reveal” animation after generation completes.

- **`public/styles.css`**
  - Custom styles layered over Tailwind (or plain CSS if you prefer).
  - Keep component‑specific rules minimal; prefer utility classes.

- **`public/images/`**
  - Static assets (icons, placeholders, backgrounds).

### Backend — `src/`

- **`src/server.js`**
  - Loads environment variables (`dotenv`).
  - Sets up Express (`express.json()`, static serving of `/public`).
  - Exposes `GET /heartbeat` for ops.
  - Mounts API routes (e.g., `POST /api/generate`).
  - Establishes the Sogni connection on startup (via `sogni/client.js`).

- **`src/routes/generate.js`**
  - Validates request body:
    - `gender` (e.g., Male | Female | Unisex)
    - `style` (e.g., Casual | Y2K | Techwear | …)
    - `itemText` (e.g., “baby tee”, “cargo pants”)
    - Optional: `heightCm`, `weightKg`, `race`, `complexion`, `batch`
  - Builds `positivePrompt`/`negativePrompt` using `prompts/buildPrompt.js`.
  - Calls Sogni to generate images; returns the image array + metadata.
  - Handles common Sogni/validation errors and returns user‑friendly messages.

- **`src/sogni/client.js`**
  - Creates a Sogni client using your credentials and endpoints.
  - Exposes helpers:
    - `connectSogni()` — connect once on server start.
    - `generateImages(opts)` — create a generation job and await images.

- **`src/prompts/constants.js`**
  - Lists for `GENDERS`, `STYLES`, `COMPLEXIONS`.
  - `RACE_LABELS` tuned for SG context.
  - `NEGATIVE_BASE` to avoid artifacts/bad scenes.
  - `STYLE_PROMPTS` with micro‑guidance per style.

- **`src/prompts/helpers.js`**
  - `normalizeRace()` → maps inputs to clean labels.
  - `ethnicFeaturesFor()` → brief, respectful descriptors.
  - `complexionDescriptor()` → consistent skin‑tone phrasing (Fitzpatrick I–VI hints).
  - `bmiDescriptor()` / `statureDescriptor()` → soft body/stature hints (optional).
  - `garmentSpecification()` → detail garment fit/structure when recognized.

- **`src/prompts/buildPrompt.js`**
  - `buildPositivePrompt()` → stitches body type, style, garment, framing, lighting.
  - `buildNegativePrompt()` → discourages mismatches, artifacts, cropping, wrong scenes.

- **`src/services/`** *(optional)*
  - For cross‑cutting utilities (logger, storage, validation) as the app grows.

- **`src/api/`** *(optional)*
  - For additional modules/endpoints (e.g., image‑to‑image, lookbook persistence).

### Root

- **`.env`**
  - Not committed. Holds credentials & defaults (see below).
- **`package.json`**
  - Dependencies and scripts (`start`, `dev`).
- **`README.md`**
  - This file 🙂

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

# --- Server ---
PORT=3000
```

> This app **does not** use `SOGNI_API_KEY`. Login is via username/password.

---

## 📡 API

### `POST /api/generate`

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

**Response (success)**
```json
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
      "height": 1152"
    }
  }
}
```

**Healthcheck**  
`GET /heartbeat` → `{ "ok": true }`

---

## 🧰 NPM Scripts

- `npm start` – start server (`node src/server.js`)
- `npm run dev` – start with hot reload (if you added `nodemon`)

---

## 🚀 Deployment Notes

- Best on a **persistent Node** host (Fly.io, Railway, Render, VM).  
  Some serverless platforms throttle WebSocket/long‑lived connections used by Sogni.
- Mirror all `.env` values in your hosting provider.


---

## 🙌 Hackathon Notes (NTU × Sogni)

- Built for **NTU × Sogni Hackathon (2025)** to showcase fashion idea → generated looks → curated lookbook.
- Deliverables: 5‑min demo, pitch deck, public repo.  
  _Placeholders:_
  - Demo video: `https://www.youtube.com/watch?v=ffiowr_zu98&feature=youtu.be`

---

© 2025 Sogni Wardrobe team.
