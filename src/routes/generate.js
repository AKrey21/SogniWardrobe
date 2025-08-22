const express = require('express');
const { GENDERS, STYLES, DEFAULT_BATCH, NEGATIVE_PROMPT, RACE_LABELS } = require('../prompts/constants');
const { garmentSpecification } = require('../prompts/helpers');
const { buildPrompt } = require('../prompts/buildPrompt');
const { getSogniClient } = require('../sogni/client');

const router = express.Router();

/* ---------------------- Enhanced generation API -------------------------- */
router.post('/generate', async (req, res) => {
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

    const sogni = await getSogniClient();
    if (!sogni) return res.status(503).json({ error: 'Sogni not connected yet. Try again.' });

    const prompt = buildPrompt({ gender: g, style: s, itemText: item, heightCm, weightKg, race, complexion });

    // Enhanced negative prompts for better accuracy
    const sceneNegatives = [
      'outdoor setting, street photography, city background, storefront, urban environment',
      'restaurant, cafe, office, bedroom, living room, any interior space',
      'other people, crowd, multiple subjects, background figures'
    ].join(', ');

    const croppingNegatives = [
      'NEVER crop the body, NEVER cut off any body parts, NEVER partial body shots',
      'cropped image, partial body, cut-off limbs, headshot, portrait, close-up',
      'upper body only, torso shot, bust shot, waist-up, head and shoulders only',
      'missing feet, missing shoes, cut-off legs, partial arms, cut-off head',
      'tight framing, zoomed in too close, subject filling entire frame',
      'portrait orientation with subject too large for frame, insufficient space around subject',
      'fashion portrait, beauty shot, detail shot, macro photography'
    ].join(', ');

    // Add BMI and consistency emphasis for weight accuracy
    const H = Number(heightCm) / 100;
    const W = Number(weightKg);
    const bmi = (H && W) ? W / (H * H) : 0;
    
    const weightEmphasis = (bmi >= 30) ? 
      'CRITICAL: This person is OBESE with BMI over 30 and must appear very heavy and overweight in ALL images. CONSISTENT heavy body type across all 3 generated images. ' :
      (bmi >= 25) ? 
      'IMPORTANT: This person is OVERWEIGHT with substantial body weight and must appear noticeably heavy in ALL images. CONSISTENT overweight appearance across all 3 generated images. ' : 
      (bmi >= 23) ? 'IMPORTANT: This person should appear average weight, not skinny, CONSISTENTLY across all images. ' : '';

    const anatomyNegatives = [
      'incorrect body proportions for specified weight and height',
      'disproportionate limbs, oversized head, tiny waist, barbie proportions, doll-like proportions',
      'inconsistent body type between multiple images, varying weight appearance across images'
    ];

    // Add weight-specific negatives based on BMI with consistency emphasis
    if (bmi >= 25) { // If overweight, strongly reject skinny appearances
      anatomyNegatives.push(
        'skinny body, thin frame, model-thin, underweight appearance, slim build, lean physique',
        'narrow waist, flat stomach, thin arms, skinny legs, angular face, sharp cheekbones',
        'fashion model body, runway model physique, extremely thin, anorexic appearance',
        'inconsistent weight across images, some images showing thin body when should be overweight'
      );
    } else if (bmi >= 23) { // If upper normal, reject very thin
      anatomyNegatives.push(
        'very skinny, extremely thin, underweight look, bony appearance, stick-thin limbs',
        'weight inconsistency between images'
      );
    }

    const anatomyNegativesStr = anatomyNegatives.join(', ');

    // Enhanced race and complexion specific negatives with consistency emphasis
    const ethnicNegatives = (() => {
      const selectedRace = (race || '').trim();
      const otherRaces = Object.keys(RACE_LABELS).filter(r => r !== selectedRace && r !== 'Other');
      
      let raceNegatives = '';
      if (otherRaces.length > 0) {
        const excludeLabels = otherRaces.map(r => RACE_LABELS[r]);
        raceNegatives = `NOT ${excludeLabels.join(' features, NOT ')} features, inconsistent ethnicity across images`;
      }
      
      let complexionNegatives = '';
      if (complexion === 'Medium' && (selectedRace === 'Malay' || selectedRace === 'Indian')) {
        complexionNegatives = 'light skin, pale skin, fair complexion, too light for medium complexion, washed out skin tone';
      } else if (complexion === 'Tan' || complexion === 'Deep') {
        complexionNegatives = 'light skin, pale skin, fair complexion, too light skin tone';
      } else if (complexion === 'Fair') {
        complexionNegatives = 'dark skin, tan skin, brown complexion, too dark skin tone';
      }
      
      const consistencyNegatives = 'different ethnicity between images, varying skin tones across images, inconsistent racial features';
      
      return [raceNegatives, complexionNegatives, consistencyNegatives].filter(Boolean).join(', ');
    })();

    const styleNegatives = (() => {
      const otherStyles = STYLES.filter(st => st !== s).slice(0, 5); // limit to avoid too long prompt
      return `not ${otherStyles.join(' style, not ')} style`;
    })();

    const garmentSpec = garmentSpecification(item, s);
    const garmentNegatives = (() => {
      const itemLower = item.toLowerCase();
      const negatives = ['distorted clothing, malformed garments, unrealistic fabric behavior'];
      
      if (itemLower.includes('corset')) {
        negatives.push('bra, bikini top, lingerie, underwear visible as outerwear');
      }
      if (itemLower.includes('crop') || itemLower.includes('baby tee')) {
        negatives.push('full-length tops, long untucked shirts');
      }
      if (itemLower.includes('jeans')) {
        negatives.push('fabric that looks like silk, satin, or non-denim material');
      }
      
      if (item.toLowerCase().includes("jorts") || item.toLowerCase().includes("shorts")) {
        negatives.push('full-length jeans, trousers, long pants');
      }
      
      return negatives.join(', ');
    })();

    // Combine all negatives
    const negativePrompt = [
      NEGATIVE_PROMPT,
      sceneNegatives,
      croppingNegatives,
      anatomyNegativesStr,
      ethnicNegatives,
      styleNegatives,
      garmentNegatives
    ].filter(Boolean).join(', ');

    const model  = process.env.SOGNI_MODEL_ID || process.env.SOGNI_MODEL || 'flux1-schnell-fp8';
    const steps  = Number(process.env.SOGNI_STEPS || 12); // Increased for better quality and prompt following
    const width  = Number(process.env.SOGNI_WIDTH || 768);
    const height = Number(process.env.SOGNI_HEIGHT || 1152); // Better ratio for full body
    const guidance = Number(process.env.SOGNI_GUIDANCE || 3.5); // Higher guidance for better prompt adherence

    console.log('Generated prompt:', prompt);
    console.log('Negative prompt:', negativePrompt);

    const project = await sogni.projects.create({
      tokenType:'spark',
      modelId: model,
      positivePrompt: prompt,
      negativePrompt,
      stylePrompt: '',
      steps,
      guidance, // Use variable guidance
      numberOfImages: n,
      scheduler:'Euler',
      timeStepSpacing:'Linear',
      sizePreset:'custom',
      width, height
    });

    const images = await project.waitForCompletion();

    if (!images || !images.length) {
      return res.status(422).json({ 
        error: 'No images generated (possibly blocked by safety filters). Try rephrasing or adjusting parameters.' 
      });
    }

    res.json({
      images: images.slice(0, n),
      meta: {
        prompt,
        negativePrompt,
        gender: g, style: s, itemText: item, batch: n,
        heightCm, weightKg, race, complexion,
        modelParams: { steps, guidance, width, height }
      }
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

module.exports = router;