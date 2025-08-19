require('dotenv').config();
const path = require('path');
const express = require('express');
const { SogniClient } = require('@sogni-ai/sogni-client');

const app = express();
const PORT = process.env.PORT || 3000;

/* --------------------------- constants --------------------------- */
const GENDERS = ['Male', 'Female', 'Unisex'];
const STYLES = [
  'Formal','Casual','Smart Casual','Business Casual','Streetwear','Preppy',
  'Minimal','Vintage','Workwear','Techwear','Grunge','Skater','Bohemian',
  'Festival','Y2K','Cottagecore','Dark Academia','Gorpcore'
];

const RACE_LABELS = {
  Chinese:  'Singaporean Chinese',
  Malay:    'Singaporean Malay',
  Indian:   'Singaporean Indian',
  Eurasian: 'Singaporean Eurasian',
  Other:    'Singapore resident'
};

const COMPLEXIONS = ['Fair','Light-medium','Medium','Tan','Deep'];

const DEFAULT_BATCH = Number(process.env.SOGNI_BATCH || 3);

const NEGATIVE_PROMPT =
  'bad anatomy, deformed, extra limbs, watermark, text, logo, low quality, jpeg artifacts, disfigured, blurry, ' +
  'multiple people, group, duplicate person, mannequin, doll, statue, toy, sketch, cartoon, CGI, ' +
  'unrealistic slimming, barbie body, extreme long legs, exaggerated proportions, ' +
  'incorrect garment fit, wrong fabric texture, mismatched skin tone, wrong ethnicity';

/* --------------------- Enhanced style micro-prompts ----------------------- */
const STYLE_PROMPTS = {
  Formal:
    'modern formalwear: tailored blazer or suit jacket, crisp blouse/shirt, slim trousers or pencil skirt, polished heels or leather oxfords, neat belt, minimal jewelry, sleek hairstyle, neutral or dark palette (black, navy, grey, ivory) with clean lines',

  Casual:
    'everyday modern casual: soft cotton tee or blouse, slim or straight-leg jeans/chinos, sneakers or sandals, lightweight cardigan or overshirt, crossbody bag, neutral and denim-friendly palette, relaxed but neat look',

  'Smart Casual':
    'stylish smart-casual: unstructured blazer or cardigan, knit polo or tucked shirt, chinos or slim dark denim, loafers or clean sneakers, coordinated belt and shoes, muted tones (navy, beige, grey, olive), sharp but approachable',

  'Business Casual':
    'professional business-casual: blouse or button-up shirt tucked in, tailored slacks or knee/midi skirt, loafers or block heels, light knit or blazer layer, subtle jewelry, neutral palette (black, white, beige, navy), ironed and office-appropriate',

  Streetwear:
    'urban streetwear: oversized hoodie or graphic tee, wide-leg cargo or denim, chunky sneakers, baseball cap or beanie, chain necklace, crossbody or mini backpack, monochrome or dark base with one pop colour (red, neon, pastel)',

  Preppy:
    'contemporary preppy: polo or striped knit, pleated skirt or chinos, loafers or boat shoes, layered cardigan or blazer, clean collar, simple jewelry, navy/cream/forest/burgundy palette, collegiate polish',

  Minimal:
    'sleek minimalism: simple clean silhouettes, no visible logos, tailored edges, monochrome or neutral tones (white, beige, black, grey), premium fabrics (cotton, wool, silk blends), single accessory, modern cuts and proportions',

  Vintage:
    'modern vintage-inspired: high-rise straight denim or A-line midi dress, muted earthy palette (brown, mustard, teal, cream), retro sunglasses or belt, authentic fabrics (denim, corduroy, cotton), nostalgic without being costume-like',

  Workwear:
    'modern workwear style: utility jacket or denim chore coat, heavyweight cotton or duck canvas, carpenter or cargo pants, rugged boots or sneakers, functional pockets, earthy palette (khaki, olive, navy, tan), durable textured fabrics',

  Techwear:
    'functional techwear: waterproof shell jacket, matte nylon, modular straps, articulated cargo pants, zipper or velcro details, trail/tech sneakers, hood or cap, all-black/charcoal/olive palette, futuristic and practical silhouette',

  Grunge:
    '90s grunge revival: plaid flannel over band tee, ripped straight-leg jeans, combat boots, layered chain jewelry, dark palette (black, grey, brick, forest green), messy layered textures, natural makeup or minimal polish',

  Skater:
    'skate style: oversized tee or hoodie, baggy jeans or shorts, skate shoes (Vans, Converse), cap or beanie, visible socks, casual accessories (chain, wristband), graphic accents, relaxed urban palette',

  Bohemian:
    'modern boho chic: flowy maxi dress or blouse with puff sleeves, floral or ethnic prints, layered necklaces, soft earthy palette (sand, terracotta, sage, blush), natural fabrics (cotton, linen), woven or leather accessories',

  Festival:
    'festival fashion: bold playful textures (fringe, sequins, mesh), cropped tops or bralette layering, shorts or mini skirts, statement sunglasses, belt bag or harness, metallic or neon accents, boots or comfortable sneakers, colorful makeup vibe',

  Y2K:
    'authentic early-2000s Y2K: low-rise bootcut jeans or micro mini skirt, baby tee/ribbed tank/corset top, velour tracksuit or denim-on-denim, platform sneakers or kitten heels, butterfly/rhinestone details, tinted sunglasses, glossy lips, pastel pink/lilac/sky or metallic accents; not high-waisted, not skinny jeans',

  Cottagecore:
    'romantic cottagecore: puff-sleeve blouse or prairie dress, lace or eyelet trims, shirred bodice, midi/maxi skirt, natural fabrics (cotton, linen), woven basket bag, mary janes or ballet flats, cream/sage/blush palette, soft countryside vibe',

  'Dark Academia':
    'classic dark academia: wool blazer or trench coat, turtleneck or collared shirt, plaid skirt or pleated trousers, oxford shoes or loafers, leather satchel, rich earthy palette (espresso, camel, grey, forest), scholarly layered look',

  Gorpcore:
    'outdoor gorpcore: puffer jacket or fleece, ripstop cargo or trail pants, technical shell, trail runners or hiking boots, cap or beanie, clip belt or carabiner accessory, natural performance palette (forest, stone, sand, olive), functional layered fabrics'
};


/* ------------------------- Enhanced helpers ------------------------------- */
function normalizeRace(race) {
  if (!race) return 'Singapore resident';
  const key = String(race).trim();
  return RACE_LABELS[key] || 'Singapore resident';
}

function complexionDescriptor(complexion, race) {
  // MUCH more aggressive complexion descriptions with multiple reinforcing terms
  const raceKey = String(race || '').trim();
  
  const complexionMap = {
    'Fair': {
      base: 'very fair pale skin, Fitzpatrick Type I-II, light complexion',
      Chinese: 'pale porcelain skin with cool yellow undertones typical of fair East Asian complexion',
      Malay: 'fair skin with warm golden undertones, lighter Malay complexion but still Southeast Asian',
      Indian: 'fair Indian skin with warm golden olive undertones, lighter South Asian complexion',
      Eurasian: 'fair mixed complexion with balanced cool-warm undertones',
      Other: 'fair pale skin with neutral undertones'
    },
    'Light-medium': {
      base: 'light-medium skin tone, Fitzpatrick Type III, moderate complexion',
      Chinese: 'light-medium skin with warm yellow undertones typical of East Asian medium complexion',
      Malay: 'warm golden light-medium skin typical of lighter Malay complexion, distinctly Southeast Asian',
      Indian: 'light-medium brown Indian skin with rich golden undertones, South Asian complexion',
      Eurasian: 'light-medium mixed complexion with golden undertones',
      Other: 'light-medium skin with warm neutral undertones'
    },
    'Medium': {
      base: 'MEDIUM BROWN SKIN TONE, Fitzpatrick Type IV, distinctly brown complexion',
      Chinese: 'medium golden-brown skin, deeper East Asian complexion with warm undertones',
      Malay: 'MEDIUM BROWN MALAY SKIN with rich golden undertones, typical Southeast Asian Malay complexion, DEFINITELY NOT LIGHT',
      Indian: 'MEDIUM BROWN INDIAN SKIN with warm golden olive undertones, classic South Asian medium complexion, DEFINITELY BROWN',
      Eurasian: 'medium brown mixed complexion with rich warm undertones',
      Other: 'medium brown skin with warm golden undertones'
    },
    'Tan': {
      base: 'TAN BROWN SKIN, Fitzpatrick Type IV-V, distinctly tanned brown complexion',
      Chinese: 'tan golden-brown skin, deeper East Asian complexion',
      Malay: 'TAN BROWN MALAY SKIN with deep golden warm undertones, darker Southeast Asian complexion, DISTINCTLY BROWN NOT LIGHT',
      Indian: 'TAN BROWN INDIAN SKIN with deep golden warm undertones, darker South Asian complexion, CLEARLY BROWN',
      Eurasian: 'tan brown mixed complexion with deep warm undertones',
      Other: 'tan brown skin with deep warm undertones'
    },
    'Deep': {
      base: 'DEEP DARK BROWN SKIN, Fitzpatrick Type V-VI, very dark complexion',
      Chinese: 'deep brown skin with golden undertones, darkest East Asian complexion',
      Malay: 'DEEP DARK BROWN MALAY SKIN with rich warm undertones, very dark Southeast Asian complexion, VERY DARK NOT LIGHT',
      Indian: 'DEEP DARK BROWN INDIAN SKIN with rich warm undertones, very dark South Asian complexion, VERY DARK BROWN',
      Eurasian: 'deep dark brown mixed complexion with rich warm undertones',
      Other: 'deep dark brown skin with rich warm undertones'
    }
  };

  const complexionData = complexionMap[complexion];
  if (!complexionData) return '';

  const raceSpecific = complexionData[raceKey] || complexionData.Other;
  return `${complexionData.base}, ${raceSpecific}`;
}

function ethnicFeaturesFor(label, complexion) {
  // Much more specific ethnic features with strong reinforcement
  const features = {
    'Singaporean Chinese': 'EAST ASIAN CHINESE FACIAL FEATURES: distinctly Chinese appearance, almond-shaped eyes with epicanthic fold, straight dark black hair, defined cheekbones, smaller nose bridge, angular jawline, UNMISTAKABLY CHINESE ETHNICITY',
    'Singaporean Malay': 'SOUTHEAST ASIAN MALAY FACIAL FEATURES: distinctly Malay appearance, warm expressive brown eyes, wavy to curly dark hair, fuller lips, rounded facial structure, broader nose with rounded tip, softer jawline, UNMISTAKABLY MALAY ETHNICITY',
    'Singaporean Indian': 'SOUTH ASIAN INDIAN FACIAL FEATURES: distinctly Indian appearance, large expressive dark eyes, thick straight to wavy dark hair, pronounced cheekbones, defined nose bridge, strong jawline, UNMISTAKABLY INDIAN ETHNICITY',
    'Singaporean Eurasian': 'MIXED EURASIAN FACIAL FEATURES: combination of European and Asian characteristics showing both heritages, varied eye shapes mixing Asian and European traits, mixed hair texture, intermediate facial structure, CLEARLY MIXED EURASIAN APPEARANCE',
    'Singapore resident': 'Southeast Asian features appropriate for Singapore multicultural context'
  };

  return features[label] || features['Singapore resident'];
}

function bmiDescriptor(heightCm, weightKg, gender) {
  const H = Number(heightCm) / 100;
  const W = Number(weightKg);
  if (!H || !W || H <= 0 || W <= 0) return '';
  
  const bmi = W / (H * H);
  if (!isFinite(bmi)) return '';

  // EXTREMELY aggressive descriptions with multiple reinforcing terms
  const isAsianFemale = gender === 'Female';
  const isAsianMale = gender === 'Male';

  if (bmi < 18.5) {
    return 'VERY UNDERWEIGHT EXTREMELY SKINNY BUILD: stick-thin bony frame, visible ribs, gaunt hollow cheeks, skeletal limbs, severely underweight appearance';
  } else if (bmi < 21.0) {
    if (isAsianFemale) {
      return 'SLIM PETITE BUILD: naturally thin small frame, narrow waist, slender arms and legs, delicate bone structure, minimal curves';
    } else if (isAsianMale) {
      return 'LEAN THIN BUILD: naturally skinny frame, visible muscle definition, narrow shoulders, slim limbs';
    } else {
      return 'NATURALLY SLIM BUILD: thin lightweight frame, lean proportions throughout';
    }
  } else if (bmi < 25.0) {
    if (isAsianFemale) {
      return 'HEALTHY AVERAGE WEIGHT BUILD: moderate feminine curves, normal bust size, average waist circumference, proportional arms and thighs, typical body fat distribution';
    } else if (isAsianMale) {
      return 'AVERAGE NORMAL BUILD: moderate muscle mass, normal body fat percentage, standard masculine proportions, average arm and leg thickness';
    } else {
      return 'NORMAL WEIGHT BUILD: average body mass, standard proportions, healthy weight appearance';
    }
  } else if (bmi < 27.5) {
    if (isAsianFemale) {
      return 'OVERWEIGHT CHUBBY BUILD: thick rounded waist, large bust, wide hips, plump arms, thick thighs, soft belly, full round face, chubby cheeks, heavy body mass, VISIBLY OVERWEIGHT, NOT THIN AT ALL';
    } else if (isAsianMale) {
      return 'OVERWEIGHT STOCKY BUILD: beer gut belly, thick waist circumference, broad chest, chunky arms, thick legs, round face, substantial body mass, VISIBLY OVERWEIGHT, NOT THIN AT ALL';
    } else {
      return 'OVERWEIGHT HEAVY BUILD: thick torso, chubby limbs, rounded belly, full face, substantial body weight, VISIBLY OVERWEIGHT, NOT SKINNY';
    }
  } else if (bmi < 32.5) {
    if (isAsianFemale) {
      return 'OBESE PLUS-SIZE HEAVY BUILD: very large bust, very wide hips, big protruding belly, fat thick arms, very thick thighs, double chin, puffy round face, obese body mass, EXTREMELY OVERWEIGHT, OPPOSITE OF SKINNY';
    } else if (isAsianMale) {
      return 'OBESE HEAVY SET BUILD: large protruding beer belly, very thick waist, fat chest, very chunky arms, thick heavy legs, round puffy face, obese body mass, EXTREMELY OVERWEIGHT, OPPOSITE OF THIN';
    } else {
      return 'OBESE HEAVY BUILD: large protruding belly, very fat limbs, heavy thick torso, round puffy face, obese body mass, EXTREMELY OVERWEIGHT, ABSOLUTELY NOT SKINNY';
    }
  } else {
    return 'SEVERELY OBESE EXTREMELY HEAVY BUILD: massively large body throughout, huge protruding belly, extremely fat arms and legs, multiple chin rolls, very round puffy face, severely obese body mass, MAXIMUM WEIGHT OPPOSITE OF ANY THINNESS';
  }
}

function statureDescriptor(heightCm, gender) {
  const H = Number(heightCm);
  if (!H || H <= 0) return '';
  
  // Singapore-specific height ranges
  if (gender === 'Female') {
    if (H <= 152) return 'petite feminine stature: shorter proportional limbs, smaller overall frame, delicate bone structure';
    if (H <= 162) return 'average Asian feminine height: proportional limb-to-torso ratio, balanced frame size';
    if (H <= 170) return 'tall feminine stature: longer legs and arms, elegant elongated proportions, larger frame';
    return 'very tall feminine stature: notably long limbs, statuesque proportions, commanding presence';
  } else if (gender === 'Male') {
    if (H <= 162) return 'shorter masculine stature: compact proportional build, smaller frame size, shorter limb length';
    if (H <= 172) return 'average Asian masculine height: balanced proportions, standard limb-to-torso ratio';
    if (H <= 180) return 'tall masculine stature: longer limbs, broader shoulders, imposing frame';
    return 'very tall masculine stature: notably long limbs, large frame, commanding physical presence';
  } else {
    if (H <= 157) return 'petite stature: shorter limbs, smaller frame, compact proportions';
    if (H <= 167) return 'average height: balanced proportional build, standard limb length';
    if (H <= 175) return 'tall stature: longer limbs, larger frame, elongated proportions';
    return 'very tall stature: notably long limbs, large overall frame';
  }
}

function garmentSpecification(itemText, style) {
  const item = (itemText || '').toLowerCase().trim();
  
  // Detailed garment specifications to prevent distortion
  const garmentSpecs = {
    // Unisex Basics
    'baby tee': 'short cropped t-shirt that ends above the natural waistline, fitted but not skin-tight',
    'crop top': 'short top that ends above the natural waistline, showing midriff',
    'oversized tee': 't-shirt with boxy, loose fit, sleeves extending near elbows, length past waist',
    'shirt': 'button-up or pullover top with proper torso coverage, casual or formal depending on fabric',
    'blouse': 'feminine top with proper fit and coverage, often with light fabric or detailing',
    'hoodie': 'hooded sweatshirt with front pocket, relaxed fit',
    'oversized hoodie': 'hooded sweatshirt intentionally large and baggy, falls below hips, casual streetwear style',
    'crewneck sweatshirt': 'long-sleeve pullover sweatshirt with crew neckline, casual fit',
    'sweater': 'knitted pullover top with long sleeves, fitted or relaxed',
    'jacket': 'outerwear layer, may be denim, bomber, or casual fabric, proper length and fit',
    'blazer': 'structured tailored jacket with lapels, buttons, and proper fit',

    // Bottoms
    'jeans': 'denim pants with proper fit, belt loops, pockets, and appropriate length',
    'baggy jeans': 'denim pants with loose relaxed fit, wider at legs with generous amount of fabric at the legs, casual streetwear style',
    'jorts': 'denim shorts ABOVE the knee, casual fit, may be loose or slightly baggy, with visible stitching and hem or frayed edges',
    'cargo pants': 'loose straight-leg pants with multiple utility pockets on thighs and sides, casual streetwear style',
    'parachute pants': 'lightweight baggy pants with drawstring waist and adjustable ankle hems, balloon-like silhouette',
    'chinos': 'casual straight-fit trousers, cotton fabric, cleaner than jeans but not formal',
    'track pants': 'athletic pants with elastic waistband, relaxed fit, sometimes with side stripes',
    'sweatpants': 'casual relaxed pants with elastic waist and cuffs, fleece or cotton fabric',
    'shorts': 'knee-length or above-knee casual bottoms, made of cotton or polyester',
    'bermuda shorts': 'loose straight-cut shorts that end just above the knee, casual menswear staple',
    'pleated tennis skirt': 'short high-waisted skirt with uniform pleats, sporty and feminine style',
    'mini skirt': 'short skirt ending mid-thigh, various fits and fabrics',

    // Dresses & One-Pieces
    'dress': 'one-piece garment with proper length and fit for the specified style',
    'slip dress': 'sleek fitted dress with thin straps, often satin or silk, minimalistic style',
    'bodycon dress': 'tight-fitting dress that hugs the body, short or midi length',
    'sundress': 'lightweight casual dress, often sleeveless with flowy skirt, above-knee length',
    'maxi dress': 'long dress that extends to ankles, flowy silhouette',

    // Trendy Female Tops
    'corset': 'fitted structured corset top with boning, lace-up back or front, covers torso from bust to waist, NOT a bra or bikini top',
    'tube top': 'strapless fitted top that wraps around torso, cropped above waist, NOT a bra',
    'cami top': 'sleeveless fitted top with thin spaghetti straps, cropped or waist length',
    'halter top': 'sleeveless top with straps tied behind the neck, leaves shoulders bare',
    'cardigan': 'knitted button-up sweater worn as a top layer, cropped or regular length',
    'puffer jacket (cropped)': 'quilted padded jacket ending above the waist, bulky silhouette, outerwear',

    // Male / Unisex Fits
    'polo shirt': 'short-sleeve collared shirt with buttoned neckline, casual-smart fit',
    'graphic tee': 't-shirt with printed graphic design or logo, relaxed or regular fit',
    'button-up shirt': 'collared shirt with buttons down front, casual or formal style',
    'flannel shirt': 'button-up long sleeve shirt made of plaid patterned fabric, worn layered',
    'bomber jacket': 'waist-length jacket with elastic cuffs and hem, zip-up front, casual streetwear',
    'denim jacket': 'structured denim outerwear, hip-length, button closure',
    'varsity jacket': 'jacket with contrasting sleeves and ribbed cuffs, sporty streetwear style',
    'windbreaker': 'lightweight zip-up jacket with hood, water-resistant fabric',
    'jersey': 'sports-inspired top, oversized fit, often with numbers or team logos',

    // Footwear
    'sneakers': 'casual athletic-style shoes with lace-up design, versatile everyday wear',
    'platform sneakers': 'sneakers with thick elevated soles, trendy and casual footwear',
    'slip-ons': 'flat casual shoes without laces, canvas or leather material',
    'sandals': 'open footwear with straps across the foot, casual warm-weather wear',
    'boots': 'ankle or mid-calf footwear, sturdy with laces or zippers',

    // Accessories
    'cap': 'baseball cap with curved brim, casual streetwear accessory',
    'beanie': 'knitted close-fitting hat, casual and cozy style',
    'tote bag': 'large rectangular shoulder bag, made of canvas or fabric',
    'backpack': 'casual functional bag with shoulder straps, youth streetwear staple'
  };
  
  // Find matching garment specification
  for (const [key, spec] of Object.entries(garmentSpecs)) {
    if (item.includes(key)) {
      return spec;
    }
  }
  
  return `"${itemText}" garment worn appropriately for ${style} styling with proper fit and realistic appearance`;
}

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

/* ----------------------- express setup -------------------------- */
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Healthcheck
app.get('/heartbeat', (_req, res) => res.send('OK'));

/* ----------------- Sogni connection (singleton) ----------------- */
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

/* ---------------------- Enhanced generation API -------------------------- */
app.post('/api/generate', async (req, res) => {
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
    if (!sogni)                return res.status(503).json({ error: 'Sogni not connected yet. Try again.' });

    const prompt = buildPrompt({ gender: g, style: s, itemText: item, heightCm, weightKg, race, complexion });

    // Enhanced negative prompts for better accuracy
    const sceneNegatives = [
      'outdoor setting, street photography, city background, storefront, urban environment',
      'restaurant, cafe, office, bedroom, living room, any interior space',
      'other people, crowd, multiple subjects, background figures'
    ].join(', ');

    const croppingNegatives = [
      'cropped image, partial body, cut-off limbs, headshot, portrait, close-up',
      'upper body only, torso shot, bust shot, waist-up, head and shoulders',
      'missing feet, missing shoes, cut-off legs, partial arms'
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
        negativePrompt += ", full-length jeans, trousers, long pants";
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
    const steps  = Number(process.env.SOGNI_STEPS || 12); // Increased for better quality
    const width  = Number(process.env.SOGNI_WIDTH || 768);
    const height = Number(process.env.SOGNI_HEIGHT || 1152); // Better ratio for full body

    console.log('Generated prompt:', prompt);
    console.log('Negative prompt:', negativePrompt);

    const project = await sogni.projects.create({
      tokenType:'spark',
      modelId: model,
      positivePrompt: prompt,
      negativePrompt,
      stylePrompt: '',
      steps,
      guidance: 1.5, // Slightly higher for better prompt following
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
        modelParams: { steps, guidance: 1.5, width, height }
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

/* -------------------------- bootstrap --------------------------- */
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