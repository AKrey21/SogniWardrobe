# Sogni Wardrobe — Telegram Bot

Generate outfit lookbook images from short prompts in Telegram using the **Sogni** SDK.

- Pick **Gender** → pick **Style** → type an **Item** (e.g. “baby tee”)
- Bot returns a small album of images, plus quick actions to **Regenerate**, **Change Style**, or **Restart**
- Includes a simple `GET /heartbeat` (Express) for uptime pings

> **Heads‑up:** keep your `.env` **out of version control** and rotate any secrets that were ever shared.

---

## Features

- Telegram flow with inline keyboards (gender/style) and text input for the item
- Sends images as a single **media group** (album)
- Shortcuts: `!imagine <item>` and `!repeat`
- Minimal express server with `/heartbeat`
- Uses `@sogni-ai/sogni-client` for image generation

---

## Requirements

- **Node.js 18+**
- A **Telegram bot token**
- Sogni credentials (see Configuration)

---

## Quick start

```bash
# 1) Install deps
npm install

# 2) Create your .env (see .env example below)
cp .env.example .env
# then fill in your values

# 3) Run
npm run dev   # with nodemon (auto-reload)
# or
npm start     # plain node
```

> Production tip: use `npm ci --only=production` on servers for deterministic, slim installs.

---

## Configuration

Create a `.env` in the project root. Example:

```ini
# Telegram
TELEGRAM_BOT_TOKEN=123456789:YOUR_TELEGRAM_BOT_TOKEN

# Sogni (example vars — align with how you provision credentials)
APP_ID=your-sogni-app-or-project-id
SOGNI_USERNAME=your-sogni-username
SOGNI_PASSWORD=your-sogni-password

# (Optional) Tuning knobs — defaults shown reflect the current code
# Model used by Sogni
SOGNI_MODEL_ID=flux1-schnell-fp8

# Sampler steps (quality vs. speed/cost)
SOGNI_STEPS=6

# Image size (width x height)
SOGNI_WIDTH=768
SOGNI_HEIGHT=1024

# Images per prompt (if your code uses this env;
# otherwise edit DEFAULT_BATCH in telegramBot.js)
# SOGNI_BATCH=3
```

> **Note:** In the current codebase, the batch size is defined as `DEFAULT_BATCH` in `telegramBot.js`. You can either change that constant (recommended to **3** for lower usage) or update the code to read `SOGNI_BATCH` from the environment.

---

## Scripts

- `npm run dev` — start with **nodemon**
- `npm start` — start with **node**

Express exposes `GET /heartbeat` for uptime checks.

---

## Usage (Telegram)

1. **/start** — choose **Gender** then **Style**  
2. Type the **Item**, e.g. `baby tee`, `linen blazer`, `pleated skirt`
3. Receive an album of outfit images with action buttons:
   - 🔁 **Regenerate**
   - 🎛 **Change Style**
   - 🔄 **Restart**

**Shortcuts**
- `!imagine <item>` — quick generate using your last chosen gender/style
- `!repeat` — rerun your last item

---

## Reduce token / image usage (light mode)

If you want lighter defaults, tweak these values:

- **Batch**: `DEFAULT_BATCH = 3` (or set `SOGNI_BATCH=3` if your code supports it)
- **Steps**: `SOGNI_STEPS=4`
- **Size**: `SOGNI_WIDTH=640`, `SOGNI_HEIGHT=896`

These cut cost/time significantly with minimal visual impact.

---

## Project structure

```
.
├─ index.js           # Sogni client bootstrap + Express heartbeat + start Telegram bot
├─ telegramBot.js     # Bot logic, keyboards, generation + sending albums
├─ package.json
├─ .env               # Secrets (DO NOT COMMIT)
└─ .gitignore
```

---

## Dependencies

Only the following are required by the current code:

- `@sogni-ai/sogni-client`
- `node-telegram-bot-api`
- `express`
- `dotenv`
- (dev) `nodemon`

If you have extras like `axios`, `discord.js`, `jimp`, `replace-color`, or `sharp` but you’re not using them, you can remove them:

```bash
npm remove axios discord.js jimp replace-color sharp
npm install
npm prune
npm dedupe
```

Commit the updated `package.json` and `package-lock.json` afterwards.

---

## Troubleshooting

- **“Project not found” / “WebSocket not connected”**  
  Ensure Sogni credentials are valid and your `APP_ID` exists. If the client crashes on init errors, let your process manager (e.g. PM2) restart it.

- **“Insufficient funds”**  
  Top up your Sogni balance or reduce usage (batch/size/steps).

- **Bot not responding in group threads**  
  Make sure the bot has permission and you’re replying inside the correct **topic** (message thread).

- **Images don’t appear**  
  Some prompts may hit safety filters. Try neutral rewording and simpler items.

---

## Security

- Never commit `.env`
- Rotate tokens/passwords if they were shared or leaked
- Store secrets in your hosting provider’s secret manager in production

---

## License

Proprietary — for your team’s internal use. Add a license if you plan to open‑source.
