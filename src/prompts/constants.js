/* --------------------------- constants --------------------------- */
const GENDERS = ['Male', 'Female', 'Unisex'];
const STYLES = [
  'Formal',
  'Casual',
  'Business Casual',
  'Minimalist',
  'Cottagecore',
  'Streetwear',
  'Dark Academia',
  'Bohemian'
];

const RACE_LABELS = {
  Chinese: 'Singaporean Chinese',
  Malay: 'Singaporean Malay',
  Indian: 'Singaporean Indian',
  Eurasian: 'Singaporean Eurasian',
  Other: 'Singapore resident'
};

const COMPLEXIONS = ['Fair', 'Light-medium', 'Medium', 'Tan', 'Deep'];

const DEFAULT_BATCH = Number(process.env.SOGNI_BATCH || 3);

/* ---- Stronger global negative prompt (ban extra bodies/limbs/clothes) ---- */
const NEGATIVE_PROMPT =
  'bad anatomy, deformed, watermark, text, logo, low quality, jpeg artifacts, disfigured, blurry, ' +
  // single-subject enforcement
  'multiple people, two people, second person, additional person, multiple subjects, crowd, group, ' +
  'duplicate person, duplicate model, clone, twin, mirrored person, reflection of another person, ' +
  // anti-limb/fragment
  'extra limbs, extra arms, extra legs, extra torso, extra head, disembodied limbs, floating limbs, body fragment, ' +
  // anti-mannequin/garment-only
  'mannequin, mannequin legs, pants without body, floating clothes, ' +
  // rest
  'doll, statue, toy, sketch, cartoon, CGI, unrealistic slimming, barbie body, extreme long legs, exaggerated proportions, ' +
  'incorrect garment fit, wrong fabric texture, mismatched skin tone, wrong ethnicity';

/* --------------------- Enhanced style micro-prompts ----------------------- */
const STYLE_PROMPTS = {
  Formal:
    'modern formalwear: tailored blazer or suit jacket, crisp blouse/shirt, slim trousers or pencil skirt, polished heels or leather oxfords, neat belt, minimal jewelry, sleek hairstyle, neutral or dark palette (black, navy, grey, ivory) with clean lines',

  Casual:
    'everyday modern casual: soft cotton tee or blouse, slim or straight-leg jeans/chinos, sneakers or sandals, lightweight cardigan or overshirt, crossbody bag, neutral and denim-friendly palette, relaxed but neat look',

  'Business Casual':
    'professional business-casual: blouse or button-up shirt tucked in, tailored slacks or knee/midi skirt, loafers or block heels, light knit or blazer layer, subtle jewelry, neutral palette (black, white, beige, navy), ironed and office-appropriate',

  Minimalist:
    'sleek minimalism: simple clean silhouettes, no visible logos, tailored edges, monochrome or neutral tones (white, beige, black, grey), premium fabrics (cotton, wool, silk blends), single accessory, modern cuts and proportions',

  Cottagecore:
    'romantic cottagecore: puff-sleeve blouse or prairie dress, lace or eyelet trims, shirred bodice, midi/maxi skirt, natural fabrics (cotton, linen), woven basket bag, mary janes or ballet flats, cream/sage/blush palette, soft countryside vibe',

  Streetwear:
    'urban streetwear: oversized hoodie or graphic tee, wide-leg cargo or denim, chunky sneakers, baseball cap or beanie, chain necklace, crossbody or mini backpack, monochrome or dark base with one pop colour (red, neon, pastel)',

  'Dark Academia':
    'classic dark academia: wool blazer or trench coat, turtleneck or collared shirt, plaid skirt or pleated trousers, oxford shoes or loafers, leather satchel, rich earthy palette (espresso, camel, grey, forest), scholarly layered look',

  Bohemian:
    'modern boho chic: flowy maxi dress or blouse with puff sleeves, floral or ethnic prints, layered necklaces, soft earthy palette (sand, terracotta, sage, blush), natural fabrics (cotton, linen), woven or leather accessories'
};

module.exports = {
  GENDERS,
  STYLES,
  RACE_LABELS,
  COMPLEXIONS,
  DEFAULT_BATCH,
  NEGATIVE_PROMPT,
  STYLE_PROMPTS
};
