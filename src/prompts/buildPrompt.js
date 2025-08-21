// src/prompts/buildPrompt.js

const constants = require('./constants');
const { STYLE_PROMPTS, NEGATIVE_PROMPT } = constants;
const {
  normalizeRace,
  complexionDescriptor,
  ethnicFeaturesFor,
  bmiDescriptor,
  statureDescriptor,
  garmentSpecification
} = require('./helpers');

// Style aliases
const STYLE_ALIASES = {
  'minimal': 'Minimalist',
  'minimalist': 'Minimalist',
  'smart casual': 'Business Casual',
  'business-casual': 'Business Casual',
  'biz casual': 'Business Casual',
  'dark academia': 'Dark Academia',
  'cottage core': 'Cottagecore',
  'boho': 'Bohemian',
  'street wear': 'Streetwear'
};

// Accessories (simple variety)
const ACCESSORIES = {
  Formal: ['minimal watch', 'sleek leather belt', 'pearl studs', 'black clutch', 'structured leather tote'],
  Casual: ['simple crossbody bag', 'clean white sneakers', 'baseball cap', 'thin hoop earrings'],
  'Business Casual': ['leather loafers', 'slim belt', 'structured tote', 'subtle stud earrings'],
  Minimalist: ['single delicate necklace', 'plain leather belt', 'small stud earrings', 'sleek watch'],
  Cottagecore: ['woven basket bag', 'straw hat', 'lace-trim socks', 'ribbon hair tie'],
  Streetwear: ['baseball cap', 'crossbody bag', 'chunky chain necklace', 'beanie'],
  'Dark Academia': ['leather satchel', 'round eyeglasses', 'wristwatch', 'wool scarf'],
  Bohemian: ['layered necklaces', 'wide-brim hat', 'beaded bracelets', 'leather sandals']
};

// ---- Colour lock (prevents white→ivory drift, etc.) ----
const COLOR_ALIASES = {
  white: { hex: '#FFFFFF', forbids: ['off-white','ivory','cream','beige','ecru','eggshell','light grey','silver'] },
  black: { hex: '#000000', forbids: ['charcoal','graphite','navy'] },
  red:   { hex: '#FF0000', forbids: ['maroon','burgundy','crimson'] },
  blue:  { hex: '#2F6FFF', forbids: ['navy','teal','turquoise'] },
  green: { hex: '#2DBE60', forbids: ['olive','khaki','teal'] },
  beige: { hex: '#D9C8A1', forbids: ['ivory','cream','off-white'] }
};
function detectColor(text='') {
  const t = text.toLowerCase();
  for (const name of Object.keys(COLOR_ALIASES)) {
    if (t.includes(name)) return { name, ...COLOR_ALIASES[name] };
  }
  return null;
}

// ---- Helpers ----
function normalizeStyle(input) {
  if (!input) return 'Casual';
  const key = String(input).trim();
  const low = key.toLowerCase();
  return STYLE_ALIASES[low] || key;
}
function pickAccessory(style) {
  const list = ACCESSORIES[style] || ['coordinated accessories'];
  return list[Math.floor(Math.random() * list.length)];
}
function getStyleLine(style) {
  return STYLE_PROMPTS[style] || style;
}

// ---- Main ----
function buildPrompt({
  gender,
  style,
  itemText,
  heightCm,
  weightKg,
  race,
  complexion
}) {
  const styleKey = normalizeStyle(style);
  const raceLabel = normalizeRace(race);
  const ethnicityLine = ethnicFeaturesFor(raceLabel, complexion);
  const complexionLine = complexionDescriptor(complexion, race);
  const buildLine = bmiDescriptor(heightCm, weightKg, gender);
  const statureLine = statureDescriptor(heightCm, gender);
  const styleLine = getStyleLine(styleKey);
  const accessory = pickAccessory(styleKey);
  const mainItem = garmentSpecification(itemText, styleKey) || String(itemText || '').trim() || 'key garment item';

  // Colour detection & guards
  const color = detectColor(itemText);
  const paletteOverride = color
    ? 'If any palette suggestion conflicts with the specified garment colour, keep the garment colour exact and adjust other pieces instead.'
    : '';
  const colorLock = color
    ? `Exact garment colour: ${color.name.toUpperCase()} (${color.hex}) ONLY; not ${color.forbids.join(', ')}. ` +
      `Neutral white balance; no warm/yellow/blue tint. ((exact ${color.name} colour:1.5))`
    : '';
  const negativeColor = color
    ? `, ${color.forbids.join(', ')}, colour cast (yellow/blue), heavy grading, tinted highlights, grey or silver instead of ${color.name}`
    : '';

  // 1) Role & scene — WHITE cyclorama
  const roleAndScene = [
    'Act as a professional fashion photographer directing a photoshoot.',
    'Produce an ultra-realistic, full-body fashion lookbook photograph.',
    'Scene: professional indoor studio, seamless white cyclorama background (#FFFFFF), floor also pure white; no visible edges/seams.',
    'There is exactly ONE human model in frame; background is empty/featureless. Absolutely no other people, mannequins, reflections, or body parts anywhere.'
  ].join(' ');

  // 2) Model description
  const modelDescription = [
    `Model: a ${String(gender || 'Unisex').toLowerCase()} person of ${raceLabel} heritage.`,
    ethnicityLine ? `Facial features: ${ethnicityLine}.` : '',
    complexionLine ? `Complexion: ${complexionLine}.` : '',
    statureLine ? `Stature: ${statureLine}.` : '',
    buildLine ? `Build: ${buildLine}.` : '',
    'Hair: clean, neat hairstyle that suits the outfit; no extreme or unnatural colors.',
    'Pose & expression: standing upright, relaxed, confident, neutral expression; arms naturally at sides; shoulders open.'
  ].filter(Boolean).join(' ');

  // 3) Outfit & styling
  const outfit = [
    `Overall aesthetic: ${styleKey}. ${styleLine} ${paletteOverride}`,
    `Main focus (must be perfectly rendered): (${mainItem}:1.4).`,
    `Complementary pieces should fit the ${styleKey} aesthetic.`,
    `Accessories: styled with ${accessory}.`,
    colorLock
  ].filter(Boolean).join(' ');

  // Single-subject hard enforcer
  const singleSubject = [
    '(one person:1.9) (single subject:1.9) (solo model:1.8) (no other people:1.8) (no duplicates:1.8) (no extra limbs:1.6)'
  ].join(' ');

  // 4) Framing enforcer — FULL-BODY / HEAD-TO-TOE
  const framing = [
    singleSubject,
    '(full-body:1.7) (full length:1.5) (head-to-toe in frame:1.5) (entire body visible:1.5)',
    'Shot size: full-length / long shot; subject standing, both shoes fully visible.',
    'Vertical orientation only: 3:4 or 9:16.',
    'Subject height in frame: ~85–92% of total frame height.',
    'Leave ~3–5% headroom and ~3–5% footroom.',
    'No cropping of head, feet, arms, hands, or legs.'
  ].join(' ');

  // 5) Technical — tuned to white cyc without blowing whites
  const technical = [
    'Camera: full-frame body with 50mm prime at ~f/4 for full-body sharpness.',
    'Lighting: even white background wash to pure white; soft key at 45°, gentle fill, subtle rim for edge contrast.',
    'Exposure discipline: preserve garment detail; background can be pure white but do NOT clip garment highlights.',
    'White balance: D65 (~5600K), neutral profile; no colour grading.'
  ].join(' ');

  // 6) Negatives (strong anti-crop / anti-closeup + extra bodies)
  const avoid = [
    'Avoid:',
    NEGATIVE_PROMPT,
    negativeColor,
    ', close-up, macro, tight portrait, headshot, bust shot, medium close-up, medium shot, knee-up, waist-up,',
    'two people, second person, multiple subjects, clone, twin, reflection of another person,',
    'extra arms, extra legs, extra torso, extra head, disembodied limbs, floating clothes, mannequin legs,',
    'cropped head, cropped feet, cropped hands, limbs cut off, selfie angle, seated, sitting, crouching, kneeling,',
    'landscape orientation, square crop, Dutch angle, extreme bokeh that erases shoes,',
    'off-white/grey/gradient background, colour cast, blown highlights, clipped whites.'
  ].join(' ');

  // Final
  return [roleAndScene, modelDescription, outfit, framing, technical, avoid].join(' ');
}

module.exports = { buildPrompt };
