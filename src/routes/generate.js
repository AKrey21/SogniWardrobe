// src/routes/generate.js
const express = require('express');
const router = express.Router();

const { GENDERS, STYLES, DEFAULT_BATCH } = require('../prompts/constants');
const { buildPositivePrompt, buildNegativePrompt } = require('../prompts/buildPrompt');
const { generateImages } = require('../sogni/client');

router.post('/', async (req, res) => {
  try {
    const {
      gender, style, itemText, batch,
      heightCm, weightKg, race, complexion
    } = req.body || {};

    const g = (gender || '').trim();
    const s = (style || '').trim();
    const item = (itemText || '').trim();
    const n = Math.max(1, Math.min(Number(batch || DEFAULT_BATCH), 6));

    if (!GENDERS.includes(g)) return res.status(400).json({ error: 'Invalid gender', allowed: GENDERS });
    if (!STYLES.includes(s))   return res.status(400).json({ error: 'Invalid style', allowed: STYLES });
    if (!item)                 return res.status(400).json({ error: 'itemText is required' });

    const positivePrompt = buildPositivePrompt({
      gender: g, style: s, itemText: item, heightCm, weightKg, race, complexion
    });

    const negativePrompt = buildNegativePrompt({
      style: s, itemText: item, heightCm, weightKg, race, complexion
    });

    const { images, params } = await generateImages({
      positivePrompt,
      negativePrompt,
      numberOfImages: n
    });

    if (!images || !images.length) {
      return res.status(422).json({
        error: 'No images generated (possibly blocked by safety filters). Try rephrasing or adjusting parameters.'
      });
    }

    res.json({
      images: images.slice(0, n),
      meta: {
        positivePrompt,
        negativePrompt,
        gender: g, style: s, itemText: item, batch: n,
        heightCm, weightKg, race, complexion,
        modelParams: params
      }
    });
  } catch (err) {
    console.error('[Generate] Error:', err);
    if (err?.payload?.errorCode === 107) {
      return res.status(401).json({ error: 'Auth failed for Sogni credentials (error 107).' });
    }
    if (String(err?.message || '').includes('Insufficient funds')) {
      return res.status(402).json({ error: 'Insufficient credits/funds on Sogni.' });
    }
    if (String(err?.message || '').includes('Sogni not connected')) {
      return res.status(503).json({ error: 'Sogni not connected yet. Try again.' });
    }
    res.status(500).json({ error: 'Server error while generating.' });
  }
});

module.exports = router;
