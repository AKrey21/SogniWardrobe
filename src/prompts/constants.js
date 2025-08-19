// src/prompts/constants.js
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

const NEGATIVE_BASE = [
  'bad anatomy, deformed, extra limbs, watermark, text, logo, low quality, jpeg artifacts, disfigured, blurry',
  'multiple people, crowd, background figures',
  'mannequin, doll, statue, toy, CGI, sketch, cartoon',
  'incorrect garment fit, wrong fabric texture, mismatched skin tone'
].join(', ');

const STYLE_PROMPTS = {
  Formal:
    'tailored blazer or suit jacket, crisp shirt, slim trousers or pencil skirt, leather shoes, minimal jewelry, neutral palette',
  Casual:
    'soft tee, straight-leg jeans/chinos, sneakers or sandals, light overshirt, relaxed but neat look',
  'Smart Casual':
    'unstructured blazer/cardigan, knit polo or tucked shirt, chinos or dark denim, loafers or clean sneakers',
  'Business Casual':
    'tucked blouse/button-up, tailored slacks or knee/midi skirt, loafers or block heels, subtle jewelry',
  Streetwear:
    'oversized tee/hoodie, wide denim/cargo, chunky sneakers, cap or beanie, one pop colour',
  Preppy:
    'polo/striped knit, pleated skirt/chinos, loafers/boat shoes, cardigan or blazer, collegiate palette',
  Minimal:
    'clean silhouettes, no visible logos, monochrome/neutral tones, premium fabrics, single accessory',
  Vintage:
    'high-rise denim or A-line midi, earthy muted palette, authentic fabrics, retro accents',
  Workwear:
    'utility/chore jacket, duck canvas, cargo/work pants, rugged boots, functional pockets, earthy tones',
  Techwear:
    'matte nylon shell, articulated cargo pants, trail/tech sneakers, modular straps, dark palette',
  Grunge:
    'plaid flannel over band tee, ripped straight jeans, combat boots, layered textures, dark palette',
  Skater:
    'oversized tee/hoodie, baggy jeans/shorts, skate shoes, cap/beanie, graphic accents',
  Bohemian:
    'flowy dresses/blouses, light prints, layered necklaces, earthy palette, natural fabrics',
  Festival:
    'playful textures, cropped layers, shorts/mini skirts, statement sunnies, metallic/neon accents',
  Y2K:
    'low-rise bootcut or micro mini, baby tee/ribbed tank, platform sneakers or kitten heels, pastel/metallic accents',
  Cottagecore:
    'puff-sleeve blouse/prairie dress, lace/eyelet trims, woven accessories, soft countryside palette',
  'Dark Academia':
    'wool blazer/trench, turtleneck/collared shirt, plaid skirt/pleated trousers, oxfords, earthy palette',
  Gorpcore:
    'puffer/fleece, ripstop cargo, technical shell, trail runners, clipped accessories, nature tones'
};

module.exports = {
  GENDERS,
  STYLES,
  RACE_LABELS,
  COMPLEXIONS,
  DEFAULT_BATCH,
  NEGATIVE_BASE,
  STYLE_PROMPTS
};
