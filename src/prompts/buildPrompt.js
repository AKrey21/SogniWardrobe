const { STYLE_PROMPTS } = require('./constants');
const { normalizeRace, complexionDescriptor, ethnicFeaturesFor, bmiDescriptor, statureDescriptor, garmentSpecification } = require('./helpers');

/* --------------------- Enhanced prompt construction ---------------------- */
function buildPrompt({
  gender, style, itemText, heightCm, weightKg, race, complexion
}) {
  const raceLabel = normalizeRace(race);
  const ethnicityLine = ethnicFeaturesFor(raceLabel, complexion);
  const complexionLine = complexionDescriptor(complexion, race);
  const buildLine = bmiDescriptor(heightCm, weightKg, gender);
  const statureLine = statureDescriptor(heightCm, gender);
  const styleLine = STYLE_PROMPTS[style] || style;

  // Enhanced framing with more specific requirements
  const framing =
    'MANDATORY: Full-body fashion lookbook shot — complete head-to-toe visibility, all clothing items fully visible including shoes. ' +
    'Professional fashion photography: 85mm lens, subject positioned 4-5 meters from camera, vertical 3:4 composition ratio. ' +
    'Model standing straight with confident posture, facing camera, arms naturally positioned.';

  const lighting =
    'Professional studio lighting setup: seamless white cyclorama background (#FFFFFF), soft key light from 45-degree angle, ' +
    'fill light to eliminate harsh shadows, gentle rim lighting for depth, color temperature 5500K for natural skin tones.';

  const qualityAndRealism =
    'Ultra-high resolution fashion photography: tack-sharp focus, accurate fabric textures and draping, ' +
    'realistic garment fit based on specified body proportions, natural skin texture and tone accuracy.';

  // Build the comprehensive prompt
  const promptParts = [
    `Professional fashion lookbook photograph of a ${String(gender || 'Unisex').toLowerCase()} model showcasing ${style} style clothing.`,
    
    // Physical characteristics - most important for accuracy
    buildLine ? `Body type and build: ${buildLine}.` : '',
    statureLine ? `Height and stature: ${statureLine}.` : '',
    
    // Ethnic and complexion details - critical for accuracy
    `Ethnicity and heritage: ${raceLabel}. ${ethnicityLine}.`,
    complexionLine ? `Skin tone specification: ${complexionLine}.` : '',
    
    // Style and clothing
    `Fashion aesthetic: ${style} styling. ${styleLine}.`,
    `Key garment focus: "${itemText}" as the central piece of the outfit, styled appropriately for ${style} aesthetic.`,
    
    // Technical requirements
    framing,
    lighting,
    qualityAndRealism
  ];

  return promptParts.filter(Boolean).join(' ');
}

module.exports = { buildPrompt };