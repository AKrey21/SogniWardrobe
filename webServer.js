// webServer.js
require('dotenv').config();
const path = require('path');
const express = require('express');
const { SogniClient } = require('@sogni-ai/sogni-client');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- constants ----------
const GENDERS = ['Male', 'Female', 'Unisex'];
const STYLES  = ['Streetwear','Casual','Smart Casual','Business Formal','Minimalist','Athleisure','Vintage','Techwear'];
const DEFAULT_BATCH = Number(process.env.SOGNI_BATCH || 3);
const NEGATIVE_PROMPT = 'bad anatomy, deformed, extra limbs, watermark, text, low quality, jpeg artifacts, disfigured, blurry';

function buildPrompt(gender, style, itemText){
  return [
    `Create a fashion lookbook image, full body ${gender.toLowerCase()} model.`,
    `Overall aesthetic: ${style}.`,
    `Centerpiece item: ${itemText}.`,
    `One outfit per image. Clean studio or editorial background.`,
    `High quality, sharp details, color-balanced, no text, no watermarks.`
  ].join(' ');
}

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static UI
app.use(express.static(path.join(__dirname, 'public')));

// Healthcheck
app.get('/heartbeat', (_req, res) => res.send('OK'));

// Sogni connection (single shared client)
let sogni = null;
async function connectSogni() {
  const instance = await SogniClient.createInstance({
    appId: process.env.APP_ID,
    restEndpoint: process.env.REST_ENDPOINT,
    socketEndpoint: process.env.SOCKET_ENDPOINT,
  });

  instance.apiClient.on('connected', () => console.log('Connected to Sogni API'));
  instance.apiClient.on('disconnected', ({ code, reason }) => {
    console.error('Disconnected from Sogni API', code, reason);
  });

  await instance.account.login(process.env.SOGNI_USERNAME, process.env.SOGNI_PASSWORD);
  return instance;
}

// API: generate images
app.post('/api/generate', async (req, res) => {
  try {
    const { gender, style, itemText, batch } = req.body || {};
    const g = (gender || '').trim();
    const s = (style || '').trim();
    const item = (itemText || '').trim();
    const n = Math.max(1, Math.min(Number(batch || DEFAULT_BATCH), 6)); // cap at 6

    if (!GENDERS.includes(g)) return res.status(400).json({ error: 'Invalid gender', allowed: GENDERS });
    if (!STYLES.includes(s)) return res.status(400).json({ error: 'Invalid style', allowed: STYLES });
    if (!item) return res.status(400).json({ error: 'itemText is required' });

    if (!sogni) return res.status(503).json({ error: 'Sogni not connected yet. Try again.' });

    const prompt = buildPrompt(g, s, item);
    const model  = process.env.SOGNI_MODEL_ID || 'flux1-schnell-fp8';
    const steps  = Number(process.env.SOGNI_STEPS || 4);
    const width  = Number(process.env.SOGNI_WIDTH || 640);
    const height = Number(process.env.SOGNI_HEIGHT || 896);

    const images = [];
    for (let attempt=1; attempt<=2 && images.length<n; attempt++) {
      const project = await sogni.projects.create({
        tokenType:'spark',
        modelId:model,
        positivePrompt: prompt,
        negativePrompt: NEGATIVE_PROMPT,
        stylePrompt: '',
        steps, guidance:1,
        numberOfImages: n - images.length,
        scheduler:'Euler', timeStepSpacing:'Linear',
        sizePreset:'custom', width, height,
      });
      const got = await project.waitForCompletion();
      if (got && got.length) images.push(...got);
    }

    if (!images.length) {
      return res.status(422).json({ error: 'No images generated (possibly blocked by safety filters). Try rephrasing.' });
    }

    res.json({
      images: images.slice(0, n),
      meta: { prompt, gender: g, style: s, itemText: item, batch: n }
    });
  } catch (err) {
    console.error('Generation error:', err);
    if (err?.payload?.errorCode === 107) {
      return res.status(401).json({ error: 'Auth failed for Sogni credentials (error 107).' });
    }
    if (String(err?.message || '').includes('Insufficient funds')) {
      return res.status(402).json({ error: 'Insufficient credits/funds on Sogni.' });
    }
    res.status(500).json({ error: 'Server error while generating.' });
  }
});

// Bootstrap
(async () => {
  try {
    sogni = await connectSogni();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Web app ready on http://localhost:${PORT}`);
    });
  } catch (e) {
    console.error('Failed to init Sogni client:', e);
    process.exit(1);
  }
})();
