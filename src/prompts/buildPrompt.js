// src/prompts/buildPrompt.js
const { NEGATIVE_BASE, STYLE_PROMPTS, STYLES } = require('./constants');
const {
  normalizeRace,
  ethnicFeaturesFor,
  complexionDescriptor,
  bmiDescriptor,
  statureDescriptor,
  garmentSpecification
} = require('./helpers');

function buildPositivePrompt({ gender, style, itemText, heightCm, weightKg, race, complexion }) {
  const raceLabel = normalizeRace(race);
  const ethnicityLine = ethnicFeaturesFor(raceLabel);
  const complexionLine = complexionDescriptor(complexion);
  const buildLine = bmiDescriptor(heightCm, weightKg, gender);
  const statureLine = statureDescriptor(heightCm, gender);
  const styleLine = STYLE_PROMPTS[style] || style;

  const framing =
    'Full‑body lookbook shot, head‑to‑toe visible including shoes. Vertical 3:4 composition. Neutral seamless background.';
  const lighting =
    'Soft studio lighting (key + fill), gentle rim light, ~5500K neutral colour temperature.';
  const quality =
    'High‑res fashion photography, sharp focus, accurate fabric texture and drape, realistic fit per body type.';

  const garmentSpec = garmentSpecification(itemText, style);

  return [
    `Professional fashion photo of a ${String(gender || 'Unisex').toLowerCase()} model in ${style} style.`,
    buildLine ? `Body type: ${buildLine}.` : '',
    statureLine ? `Stature: ${statureLine}.` : '',
    `Ethnicity: ${raceLabel}. ${ethnicityLine}.`,
    complexionLine ? `Skin tone: ${complexionLine}.` : '',
    `Aesthetic: ${styleLine}.`,
    `Key garment: "${itemText}" — ${garmentSpec}.`,
    framing,
    lighting,
    quality
  ].filter(Boolean).join(' ');
}

function buildNegativePrompt({ style, itemText, heightCm, weightKg }) {
  const H = Number(heightCm) / 100;
  const W = Number(weightKg);
  const bmi = (H && W) ? (W / (H * H)) : undefined;

  const sceneNegatives = [
    'outdoor street/cafe/office/bedroom/living room settings',
    'partial body, headshot, close‑up, cropped limbs'
  ].join(', ');

  const anatomyNegatives = [];
  if (bmi !== undefined) {
    if (bmi >= 27.5) {
      anatomyNegatives.push('thin/underweight look, runway‑thin proportions');
    } else if (bmi < 18.5) {
      anatomyNegatives.push('bulky/heavy build');
    }
  }
  anatomyNegatives.push('disproportionate limbs, doll‑like proportions');

  const otherStyles = STYLES.filter(st => st !== style).slice(0, 6);
  const styleNegatives = otherStyles.length ? `not ${otherStyles.join(' style, not ')} style` : '';

  const item = (itemText || '').toLowerCase();
  const garmentNegatives = [];
  if (item.includes('corset')) garmentNegatives.push('lingerie/bra/bikini implied');
  if (item.includes('crop') || item.includes('baby tee')) garmentNegatives.push('full‑length untucked shirts');
  if (item.includes('jeans')) garmentNegatives.push('silk/satin looking denim');
  if (item.includes('jorts') || item.includes('shorts')) garmentNegatives.push('full‑length trousers/pants');

  const ethnicityNegatives = 'inconsistent ethnicity or varying skin tone across images';

  return [
    NEGATIVE_BASE,
    sceneNegatives,
    anatomyNegatives.join(', '),
    styleNegatives,
    garmentNegatives.join(', '),
    ethnicityNegatives
  ].filter(Boolean).join(', ');
}

module.exports = { buildPositivePrompt, buildNegativePrompt };
