// src/prompts/helpers.js
const { RACE_LABELS } = require('./constants');

function normalizeRace(race) {
  if (!race) return 'Singapore resident';
  const key = String(race).trim();
  return RACE_LABELS[key] || 'Singapore resident';
}

function ethnicFeaturesFor(label) {
  const features = {
    'Singaporean Chinese': 'East Asian facial features appropriate to Chinese heritage, dark hair, natural proportions',
    'Singaporean Malay': 'Southeast Asian Malay facial features, natural hair texture, warm undertones',
    'Singaporean Indian': 'South Asian Indian facial features, natural hair texture, warm/olive undertones',
    'Singaporean Eurasian': 'Mixed Asian-European features reflecting both heritages, natural hair texture',
    'Singapore resident': 'Southeast Asian features appropriate for Singapore’s multicultural context'
  };
  return features[label] || features['Singapore resident'];
}

function complexionDescriptor(complexion) {
  if (!complexion) return '';
  const map = {
    'Fair': 'fair skin (Fitzpatrick I–II)',
    'Light-medium': 'light–medium skin (Fitzpatrick II–III)',
    'Medium': 'medium brown skin (Fitzpatrick III–IV)',
    'Tan': 'tan brown skin (Fitzpatrick IV–V)',
    'Deep': 'deep dark brown skin (Fitzpatrick V–VI)'
  };
  const base = map[complexion];
  return base ? `${base}, natural undertones and realistic lighting` : '';
}

function bmiDescriptor(heightCm, weightKg, gender) {
  const H = Number(heightCm) / 100;
  const W = Number(weightKg);
  if (!H || !W || H <= 0 || W <= 0) return '';
  const bmi = W / (H * H);
  if (!isFinite(bmi)) return '';

  if (bmi < 18.5) return 'slim build';
  if (bmi < 23) return 'lean/average build';
  if (bmi < 27.5) return 'fuller build with soft midsection';
  if (bmi < 32.5) return 'plus-size build';
  return 'heavier build';
}

function statureDescriptor(heightCm, gender) {
  const H = Number(heightCm);
  if (!H || H <= 0) return '';
  if (gender === 'Female') {
    if (H <= 152) return 'petite stature';
    if (H <= 162) return 'average female height';
    if (H <= 170) return 'tall feminine proportions';
    return 'very tall feminine proportions';
  } else if (gender === 'Male') {
    if (H <= 162) return 'shorter masculine stature';
    if (H <= 172) return 'average male height';
    if (H <= 180) return 'tall masculine proportions';
    return 'very tall masculine proportions';
  }
  if (H <= 157) return 'petite stature';
  if (H <= 167) return 'average height';
  if (H <= 175) return 'tall proportions';
  return 'very tall proportions';
}

function garmentSpecification(itemText, style) {
  const item = (itemText || '').toLowerCase().trim();
  const specs = {
    'baby tee': 'short cropped t‑shirt above natural waist, fitted (not skin‑tight)',
    'crop top': 'short top ending above natural waist, shows midriff',
    'oversized tee': 'boxy loose fit, sleeves near elbows, length past waist',
    'hoodie': 'hooded sweatshirt with front pocket, relaxed fit',
    'oversized hoodie': 'intentionally baggy, hip‑length or below',
    'crewneck sweatshirt': 'long‑sleeve pullover with crew neckline',
    'blazer': 'structured tailored jacket with lapels',
    'jeans': 'denim pants with pockets and belt loops',
    'baggy jeans': 'loose relaxed denim, wider legs',
    'jorts': 'denim shorts above the knee, casual fit',
    'cargo pants': 'loose straight‑leg with thigh cargo pockets',
    'chinos': 'straight‑fit cotton trousers',
    'sweatpants': 'relaxed pants with elastic waist/cuffs',
    'bermuda shorts': 'straight cut ending just above knee',
    'pleated tennis skirt': 'short high‑waisted, uniform pleats',
    'mini skirt': 'short skirt ending mid‑thigh',
    'dress': 'one‑piece garment, length/fit per style',
    'corset': 'structured top with boning, covers torso (not lingerie)',
    'tube top': 'strapless fitted top, cropped above waist',
    'cardigan': 'knitted button‑up outer/top layer',
    'polo shirt': 'short‑sleeve collared knit top',
    'button-up shirt': 'collared shirt with button front',
    'bomber jacket': 'waist-length jacket, ribbed cuffs/hem',
    'denim jacket': 'structured denim outerwear',
    'varsity jacket': 'contrast sleeves, ribbed cuffs',
    'windbreaker': 'lightweight zip jacket, hooded'
  };
  for (const [key, spec] of Object.entries(specs)) {
    if (item.includes(key)) return spec;
  }
  return `"${itemText}" styled appropriately for ${style}`;
}

module.exports = {
  normalizeRace,
  ethnicFeaturesFor,
  complexionDescriptor,
  bmiDescriptor,
  statureDescriptor,
  garmentSpecification
};
