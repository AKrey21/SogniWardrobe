// src/prompts/helpers.js

const constants = require("./constants"); // UPDATED: Import the whole module to break the circular dependency.

/* ------------------------- Enhanced helpers ------------------------------- */

// --- Helper for Model's Pose and Expression ---

function poseAndExpressionFor(style) {
  const poses = {
    Formal:
      "standing straight in a classic, confident pose, looking directly at the camera with a neutral, professional expression.",

    "Smart Casual":
      "standing in a relaxed but poised stance, one hand in pocket, with a slight, confident smile.",

    "Business Casual":
      "standing with a professional yet approachable posture, arms gently at sides, with a calm and focused expression.",

    Streetwear:
      "in a dynamic, natural walking motion pose, captured mid-stride, looking slightly off-camera with a cool, confident attitude.",

    Vintage:
      "in a classic, slightly stylized pose reminiscent of old photographs, with a thoughtful, nostalgic expression.",

    Minimal:
      "standing in a simple, clean pose with perfect posture, exuding a calm and serene mood.",

    Techwear:
      "in a functional, athletic stance, interacting with a jacket zipper or pocket, with a focused, determined expression.",

    Bohemian:
      "in a free-spirited, relaxed pose, perhaps with a gentle sway or movement, with a soft, dreamy expression.",

    Festival:
      "in an energetic and joyful pose, arms slightly raised or moving, with a happy, expressive face.",

    // Default for any other style

    default:
      "standing in a confident, neutral pose, facing the camera directly.",
  };

  return poses[style] || poses.default;
}

// --- Helper for Hair Style ---

function hairStyleFor(gender, race) {
  const styles = {
    Male: {
      Chinese: "short, clean-cut black hair, modern neat hairstyle.",

      Malay: "short, thick, wavy dark brown hair, neatly styled.",

      Indian: "short, dense black hair with a slight wave, classic style.",

      Eurasian: "short brown hair with some texture, stylishly messy.",

      Other: "short, neat dark hair.",
    },

    Female: {
      Chinese: "long, straight, silky black hair, styled elegantly.",

      Malay: "long, wavy, voluminous dark brown hair, styled naturally.",

      Indian: "long, thick, lustrous black hair with a gentle wave.",

      Eurasian: "long, light brown hair with soft waves and texture.",

      Other: "long, dark, well-kept hair.",
    },

    Unisex: {
      default: "modern, androgynous hairstyle, medium length, dark color.",
    },
  };

  return (styles[gender] && styles[gender][race]) || styles.Unisex.default;
}

function normalizeRace(race) {
  if (!race) return "Singapore resident";

  const key = String(race).trim();

  // UPDATED: Access the property on the imported module object.

  return constants.RACE_LABELS[key] || "Singapore resident";
}

function complexionDescriptor(complexion, race) {
  // Your existing, excellent complexion logic remains unchanged.

  const raceKey = String(race || "").trim();

  const complexionMap = {
    Fair: {
      base: "very fair pale skin, Fitzpatrick Type I-II, light complexion",

      Chinese:
        "pale porcelain skin with cool yellow undertones typical of fair East Asian complexion",

      Malay:
        "fair skin with warm golden undertones, lighter Malay complexion but still Southeast Asian",

      Indian:
        "fair Indian skin with warm golden olive undertones, lighter South Asian complexion",

      Eurasian: "fair mixed complexion with balanced cool-warm undertones",

      Other: "fair pale skin with neutral undertones",
    },

    "Light-medium": {
      base: "light-medium skin tone, Fitzpatrick Type III, moderate complexion",

      Chinese:
        "light-medium skin with warm yellow undertones typical of East Asian medium complexion",

      Malay:
        "warm golden light-medium skin typical of lighter Malay complexion, distinctly Southeast Asian",

      Indian:
        "light-medium brown Indian skin with rich golden undertones, South Asian complexion",

      Eurasian: "light-medium mixed complexion with golden undertones",

      Other: "light-medium skin with warm neutral undertones",
    },

    Medium: {
      base: "MEDIUM BROWN SKIN TONE, Fitzpatrick Type IV, distinctly brown complexion",

      Chinese:
        "medium golden-brown skin, deeper East Asian complexion with warm undertones",

      Malay:
        "MEDIUM BROWN MALAY SKIN with rich golden undertones, typical Southeast Asian Malay complexion, DEFINITELY NOT LIGHT",

      Indian:
        "MEDIUM BROWN INDIAN SKIN with warm golden olive undertones, classic South Asian medium complexion, DEFINITELY BROWN",

      Eurasian: "medium brown mixed complexion with rich warm undertones",

      Other: "medium brown skin with warm golden undertones",
    },

    Tan: {
      base: "TAN BROWN SKIN, Fitzpatrick Type IV-V, distinctly tanned brown complexion",

      Chinese: "tan golden-brown skin, deeper East Asian complexion",

      Malay:
        "TAN BROWN MALAY SKIN with deep golden warm undertones, darker Southeast Asian complexion, DISTINCTLY BROWN NOT LIGHT",

      Indian:
        "TAN BROWN INDIAN SKIN with deep golden warm undertones, darker South Asian complexion, CLEARLY BROWN",

      Eurasian: "tan brown mixed complexion with deep warm undertones",

      Other: "tan brown skin with deep warm undertones",
    },

    Deep: {
      base: "DEEP DARK BROWN SKIN, Fitzpatrick Type V-VI, very dark complexion",

      Chinese:
        "deep brown skin with golden undertones, darkest East Asian complexion",

      Malay:
        "DEEP DARK BROWN MALAY SKIN with rich warm undertones, very dark Southeast Asian complexion, VERY DARK NOT LIGHT",

      Indian:
        "DEEP DARK BROWN INDIAN SKIN with rich warm undertones, very dark South Asian complexion, VERY DARK BROWN",

      Eurasian: "deep dark brown mixed complexion with rich warm undertones",

      Other: "deep dark brown skin with rich warm undertones",
    },
  };

  const complexionData = complexionMap[complexion];

  if (!complexionData) return "";

  const raceSpecific = complexionData[raceKey] || complexionData.Other;

  return `${complexionData.base}, ${raceSpecific}`;
}

function ethnicFeaturesFor(label, complexion) {
  // Your existing, excellent ethnic features logic remains unchanged.

  const features = {
    "Singaporean Chinese":
      "EAST ASIAN CHINESE FACIAL FEATURES: distinctly Chinese appearance, almond-shaped eyes with epicanthic fold, defined cheekbones, smaller nose bridge, angular jawline, UNMISTAKABLY CHINESE ETHNICITY",

    "Singaporean Malay":
      "SOUTHEAST ASIAN MALAY FACIAL FEATURES: distinctly Malay appearance, warm expressive brown eyes, fuller lips, rounded facial structure, broader nose with rounded tip, softer jawline, UNMISTAKABLY MALAY ETHNICITY",

    "Singaporean Indian":
      "SOUTH ASIAN INDIAN FACIAL FEATURES: distinctly Indian appearance, large expressive dark eyes, thick dark hair, pronounced cheekbones, defined nose bridge, strong jawline, UNMISTAKABLY INDIAN ETHNICITY",

    "Singaporean Eurasian":
      "MIXED EURASIAN FACIAL FEATURES: combination of European and Asian characteristics showing both heritages, varied eye shapes mixing Asian and European traits, intermediate facial structure, CLEARLY MIXED EURASIAN APPEARANCE",

    "Singapore resident":
      "Southeast Asian features appropriate for Singapore multicultural context",
  };

  return features[label] || features["Singapore resident"];
}

function bmiDescriptor(heightCm, weightKg, gender) {
  // Your existing, excellent BMI logic remains unchanged.

  const H = Number(heightCm) / 100;

  const W = Number(weightKg);

  if (!H || !W || H <= 0 || W <= 0) return "";

  const bmi = W / (H * H);

  if (!isFinite(bmi)) return "";

  const isAsianFemale = gender === "Female";

  const isAsianMale = gender === "Male";

  if (bmi < 18.5) {
    return "VERY UNDERWEIGHT EXTREMELY SKINNY BUILD: stick-thin bony frame, visible ribs, gaunt hollow cheeks, skeletal limbs, severely underweight appearance";
  } else if (bmi < 21.0) {
    if (isAsianFemale) {
      return "SLIM PETITE BUILD: naturally thin small frame, narrow waist, slender arms and legs, delicate bone structure, minimal curves";
    } else if (isAsianMale) {
      return "LEAN THIN BUILD: naturally skinny frame, visible muscle definition, narrow shoulders, slim limbs";
    } else {
      return "NATURALLY SLIM BUILD: thin lightweight frame, lean proportions throughout";
    }
  } else if (bmi < 25.0) {
    if (isAsianFemale) {
      return "HEALTHY AVERAGE WEIGHT BUILD: moderate feminine curves, normal bust size, average waist circumference, proportional arms and thighs, typical body fat distribution";
    } else if (isAsianMale) {
      return "AVERAGE NORMAL BUILD: moderate muscle mass, normal body fat percentage, standard masculine proportions, average arm and leg thickness";
    } else {
      return "NORMAL WEIGHT BUILD: average body mass, standard proportions, healthy weight appearance";
    }
  } else if (bmi < 27.5) {
    if (isAsianFemale) {
      return "OVERWEIGHT CHUBBY BUILD: thick rounded waist, large bust, wide hips, plump arms, thick thighs, soft belly, full round face, chubby cheeks, heavy body mass, VISIBLY OVERWEIGHT, NOT THIN AT ALL";
    } else if (isAsianMale) {
      return "OVERWEIGHT STOCKY BUILD: beer gut belly, thick waist circumference, broad chest, chunky arms, thick legs, round face, substantial body mass, VISIBLY OVERWEIGHT, NOT THIN AT ALL";
    } else {
      return "OVERWEIGHT HEAVY BUILD: thick torso, chubby limbs, rounded belly, full face, substantial body weight, VISIBLY OVERWEIGHT, NOT SKINNY";
    }
  } else if (bmi < 32.5) {
    if (isAsianFemale) {
      return "OBESE PLUS-SIZE HEAVY BUILD: very large bust, very wide hips, big protruding belly, fat thick arms, very thick thighs, double chin, puffy round face, obese body mass, EXTREMELY OVERWEIGHT, OPPOSITE OF SKINNY";
    } else if (isAsianMale) {
      return "OBESE HEAVY SET BUILD: large protruding beer belly, very thick waist, fat chest, very chunky arms, thick heavy legs, round puffy face, obese body mass, EXTREMELY OVERWEIGHT, OPPOSITE OF THIN";
    } else {
      return "OBESE HEAVY BUILD: large protruding belly, very fat limbs, heavy thick torso, round puffy face, obese body mass, EXTREMELY OVERWEIGHT, ABSOLUTELY NOT SKINNY";
    }
  } else {
    return "SEVERELY OBESE EXTREMELY HEAVY BUILD: massively large body throughout, huge protruding belly, extremely fat arms and legs, multiple chin rolls, very round puffy face, severely obese body mass, MAXIMUM WEIGHT OPPOSITE OF ANY THINNESS";
  }
}

function statureDescriptor(heightCm, gender) {
  // Your existing, excellent stature logic remains unchanged.

  const H = Number(heightCm);

  if (!H || H <= 0) return "";

  if (gender === "Female") {
    if (H <= 152)
      return "petite feminine stature: shorter proportional limbs, smaller overall frame, delicate bone structure";

    if (H <= 162)
      return "average Asian feminine height: proportional limb-to-torso ratio, balanced frame size";

    if (H <= 170)
      return "tall feminine stature: longer legs and arms, elegant elongated proportions, larger frame";

    return "very tall feminine stature: notably long limbs, statuesque proportions, commanding presence";
  } else if (gender === "Male") {
    if (H <= 162)
      return "shorter masculine stature: compact proportional build, smaller frame size, shorter limb length";

    if (H <= 172)
      return "average Asian masculine height: balanced proportions, standard limb-to-torso ratio";

    if (H <= 180)
      return "tall masculine stature: longer limbs, broader shoulders, imposing frame";

    return "very tall masculine stature: notably long limbs, large frame, commanding physical presence";
  } else {
    if (H <= 157)
      return "petite stature: shorter limbs, smaller frame, compact proportions";

    if (H <= 167)
      return "average height: balanced proportional build, standard limb length";

    if (H <= 175)
      return "tall stature: longer limbs, larger frame, elongated proportions";

    return "very tall stature: notably long limbs, large overall frame";
  }
}

function garmentSpecification(itemText, style) {
  // Your existing, excellent garment logic remains unchanged.

  const item = (itemText || "").toLowerCase().trim();

  const garmentSpecs = {
    "baby tee":
      "short cropped t-shirt that ends above the natural waistline, fitted but not skin-tight",

    "crop top":
      "short top that ends above the natural waistline, showing midriff",

    "oversized tee":
      "t-shirt with boxy, loose fit, sleeves extending near elbows, length past waist",

    shirt:
      "button-up or pullover top with proper torso coverage, casual or formal depending on fabric",

    blouse:
      "feminine top with proper fit and coverage, often with light fabric or detailing",

    hoodie: "hooded sweatshirt with front pocket, relaxed fit",

    "oversized hoodie":
      "hooded sweatshirt intentionally large and baggy, falls below hips, casual streetwear style",

    "crewneck sweatshirt":
      "long-sleeve pullover sweatshirt with crew neckline, casual fit",

    sweater: "knitted pullover top with long sleeves, fitted or relaxed",

    jacket:
      "outerwear layer, may be denim, bomber, or casual fabric, proper length and fit",

    blazer: "structured tailored jacket with lapels, buttons, and proper fit",

    jeans:
      "denim pants with proper fit, belt loops, pockets, and appropriate length",

    "baggy jeans":
      "extra-loose denim pants with very relaxed fit from waist to ankle, wide straight legs that do not taper, pooling slightly over shoes. Streetwear silhouette inspired by 90s hip-hop and skate culture. Denim should visibly hang away from thighs and calves, NOT slim or fitted.",

    jorts:
      "denim shorts ABOVE the knee, casual fit, may be loose or slightly baggy, with visible stitching and hem or frayed edges",

    "cargo pants":
      "loose straight-leg pants with multiple utility pockets on thighs and sides, casual streetwear style",

    "parachute pants":
      "lightweight baggy pants with drawstring waist and adjustable ankle hems, balloon-like silhouette",

    chinos:
      "casual straight-fit trousers, cotton fabric, cleaner than jeans but not formal",

    "track pants":
      "athletic pants with elastic waistband, relaxed fit, sometimes with side stripes",

    sweatpants:
      "casual relaxed pants with elastic waist and cuffs, fleece or cotton fabric",

    shorts:
      "knee-length or above-knee casual bottoms, made of cotton or polyester",

    "bermuda shorts":
      "loose straight-cut shorts that end just above the knee, casual menswear staple",

    "pleated tennis skirt":
      "short high-waisted skirt with uniform pleats, sporty and feminine style",

    "mini skirt": "short skirt ending mid-thigh, various fits and fabrics",

    dress:
      "one-piece garment with proper length and fit for the specified style",

    "slip dress":
      "sleek fitted dress with thin straps, often satin or silk, minimalistic style",

    "bodycon dress":
      "tight-fitting dress that hugs the body, short or midi length",

    sundress:
      "lightweight casual dress, often sleeveless with flowy skirt, above-knee length",

    "maxi dress": "long dress that extends to ankles, flowy silhouette",

    corset:
      "fitted structured corset top with boning, lace-up back or front, covers torso from bust to waist, NOT a bra or bikini top",

    "tube top":
      "strapless fitted top that wraps around torso, cropped above waist, NOT a bra",

    "cami top":
      "sleeveless fitted top with thin spaghetti straps, cropped or waist length",

    "halter top":
      "sleeveless top with straps tied behind the neck, leaves shoulders bare",

    cardigan:
      "knitted button-up sweater worn as a top layer, cropped or regular length",

    "puffer jacket (cropped)":
      "quilted padded jacket ending above the waist, bulky silhouette, outerwear",

    "polo shirt":
      "short-sleeve collared shirt with buttoned neckline, casual-smart fit",

    "graphic tee":
      "t-shirt with printed graphic design or logo, relaxed or regular fit",

    "button-up shirt":
      "collared shirt with buttons down front, casual or formal style",

    "flannel shirt":
      "button-up long sleeve shirt made of plaid patterned fabric, worn layered",

    "bomber jacket":
      "waist-length jacket with elastic cuffs and hem, zip-up front, casual streetwear",

    "denim jacket": "structured denim outerwear, hip-length, button closure",

    "varsity jacket":
      "jacket with contrasting sleeves and ribbed cuffs, sporty streetwear style",

    windbreaker: "lightweight zip-up jacket with hood, water-resistant fabric",

    jersey:
      "sports-inspired top, oversized fit, often with numbers or team logos",

    sneakers:
      "casual athletic-style shoes with lace-up design, versatile everyday wear",

    "platform sneakers":
      "sneakers with thick elevated soles, trendy and casual footwear",

    "slip-ons": "flat casual shoes without laces, canvas or leather material",

    sandals:
      "open footwear with straps across the foot, casual warm-weather wear",

    boots: "ankle or mid-calf footwear, sturdy with laces or zippers",

    cap: "baseball cap with curved brim, casual streetwear accessory",

    beanie: "knitted close-fitting hat, casual and cozy style",

    "tote bag": "large rectangular shoulder bag, made of canvas or fabric",

    backpack:
      "casual functional bag with shoulder straps, youth streetwear staple",
  };

  for (const [key, spec] of Object.entries(garmentSpecs)) {
    if (item.includes(key)) {
      return spec;
    }
  }

  return `"${itemText}" garment worn appropriately for ${style} styling with proper fit and realistic appearance`;
}

module.exports = {
  normalizeRace,

  complexionDescriptor,

  ethnicFeaturesFor,

  bmiDescriptor,

  statureDescriptor,

  garmentSpecification,

  poseAndExpressionFor,

  hairStyleFor,
};
