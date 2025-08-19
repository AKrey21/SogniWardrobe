// src/prompts/constants.js

const GENDERS = ["Male", "Female", "Unisex"];
const STYLES = [
  "Formal",
  "Casual",
  "Smart Casual",
  "Business Casual",
  "Streetwear",
  "Preppy",
  "Minimal",
  "Vintage",
  "Workwear",
  "Techwear",
  "Grunge",
  "Skater",
  "Bohemian",
  "Festival",
  "Y2K",
  "Cottagecore",
  "Dark Academia",
  "Gorpcore",
];
const RACE_LABELS = {
  Chinese: "Singaporean Chinese",
  Malay: "Singaporean Malay",
  Indian: "Singaporean Indian",
  Eurasian: "Singaporean Eurasian",
  Other: "Singapore resident",
};
const COMPLEXIONS = ["Fair", "Light-medium", "Medium", "Tan", "Deep"];
const DEFAULT_BATCH = Number(process.env.SOGNI_BATCH || 3);

const GENERAL_NEGATIVES =
  "bad anatomy, deformed, extra limbs, watermark, text, logo, low quality, jpeg artifacts, disfigured, blurry, grainy, noisy";
const SCENE_NEGATIVES =
  "multiple people, group, duplicate person, mannequin, doll, statue, toy, sketch, cartoon, CGI, 3d render";
const ANATOMY_NEGATIVES =
  "unrealistic body proportions, barbie body, extreme long legs, disproportionate limbs, oversized head, tiny waist, inconsistent body type between images";
const CLOTHING_NEGATIVES =
  "incorrect garment fit, wrong fabric texture, distorted clothing, malformed garments, unrealistic fabric behavior";
const CROPPING_NEGATIVES =
  "NEVER crop the body, NEVER cut off any body parts, NEVER partial body shots, cropped image, partial body, cut-off limbs, headshot, portrait, close-up, upper body only, torso shot, bust shot, waist-up, missing feet, missing shoes, cut-off legs, cut-off head, tight framing, zoomed in, cropped hair, missing hair, cut-off top of head, cut-off hair, hair clipped by frame, tight crop above hairline";

const NEGATIVE_PROMPT = [
  GENERAL_NEGATIVES,
  SCENE_NEGATIVES,
  ANATOMY_NEGATIVES,
  CLOTHING_NEGATIVES,
  CROPPING_NEGATIVES,
].join(", ");

const STYLE_PROMPTS = {
  Formal: {
    base: "modern formalwear: tailored blazer or suit jacket, crisp blouse/shirt, slim trousers or pencil skirt, polished heels or leather oxfords",
    accessories: [
      "a classic leather watch",
      "simple pearl earrings",
      "a silk pocket square",
      "no visible accessories",
    ],
  },
  Casual: {
    base: "everyday modern casual: soft cotton tee or blouse, slim or straight-leg jeans/chinos, sneakers or sandals, lightweight cardigan or overshirt",
    accessories: [
      "a simple crossbody bag",
      "classic aviator sunglasses",
      "a casual canvas belt",
      "no specific accessory",
    ],
  },
  "Smart Casual": {
    base: "stylish smart-casual: unstructured blazer or cardigan, knit polo or tucked shirt, chinos or slim dark denim, loafers or clean sneakers",
    accessories: [
      "a coordinated leather belt and shoes",
      "a stylish minimalist watch",
      "subtle metal-frame glasses",
    ],
  },
  "Business Casual": {
    base: "professional business-casual: blouse or button-up shirt tucked in, tailored slacks or knee/midi skirt, loafers or block heels, light knit or blazer layer",
    accessories: [
      "a leather tote bag",
      "subtle gold jewelry",
      "a silk scarf",
      "no visible accessories",
    ],
  },
  Streetwear: {
    base: "urban streetwear: oversized hoodie or graphic tee, wide-leg cargo pants or baggy denim, chunky sneakers",
    accessories: [
      "a baseball cap or beanie",
      "a silver chain necklace",
      "a crossbody sling bag",
      "a mini backpack",
    ],
  },
  Preppy: {
    base: "contemporary preppy: polo or striped knit sweater, pleated skirt or chinos, loafers or boat shoes, layered cardigan or blazer",
    accessories: [
      "a pearl necklace",
      "a leather headband",
      "a classic canvas tote bag",
      "a simple gold bracelet",
    ],
  },
  Minimal: {
    base: "sleek minimalism: simple clean silhouettes, no visible logos, tailored edges, monochrome or neutral tones, premium fabrics like silk or wool",
    accessories: [
      "no visible accessories",
      "a single, high-quality silver bracelet",
      "a simple leather clutch",
    ],
  },
  Vintage: {
    base: "modern vintage-inspired: high-rise straight-leg denim or an A-line midi dress, muted earthy palette, authentic fabrics like denim or corduroy",
    accessories: [
      "cat-eye sunglasses",
      "a vintage leather belt",
      "a silk headscarf",
      "round metal glasses",
    ],
  },
  Workwear: {
    base: "modern workwear style: utility jacket or denim chore coat, heavyweight cotton or duck canvas, carpenter or cargo pants, rugged boots",
    accessories: [
      "a durable canvas belt",
      "a classic beanie",
      "a stainless steel watch",
      "no visible accessories",
    ],
  },
  Techwear: {
    base: "functional techwear: waterproof shell jacket with matte nylon finish, modular straps, articulated cargo pants with zippers, tech sneakers",
    accessories: [
      "a functional chest rig",
      "a tech-sling bag",
      "a futuristic cap",
      "a g-shock watch",
    ],
  },
  Grunge: {
    base: "90s grunge revival: plaid flannel shirt over a faded band tee, ripped straight-leg jeans, combat boots",
    accessories: [
      "a layered silver chain necklace",
      "a worn leather belt",
      "a slouchy beanie",
      "chipped black nail polish",
    ],
  },
  Skater: {
    base: "skate style: oversized graphic tee or hoodie, baggy work pants or jorts, classic skate shoes like Vans or Converse",
    accessories: [
      "a baseball cap",
      "visible crew socks",
      "a simple chain wallet",
      "a canvas backpack",
    ],
  },
  Bohemian: {
    base: "modern boho chic: flowy maxi dress or a blouse with puff sleeves, floral or ethnic prints, natural fabrics like cotton and linen",
    accessories: [
      "layered delicate necklaces",
      "stacked turquoise rings",
      "a woven straw bag",
      "fringe details",
    ],
  },
  Festival: {
    base: "festival fashion: bold playful textures like fringe or sequins, a cropped top or bralette layer, denim shorts or a mini skirt, statement sunglasses",
    accessories: [
      "a belt bag or harness",
      "metallic body glitter",
      "cowboy boots",
      "layered bracelets",
    ],
  },
  Y2K: {
    base: "authentic early-2000s Y2K: low-rise bootcut jeans or a micro mini skirt, a baby tee or ribbed tank top, velour tracksuit or denim-on-denim",
    accessories: [
      "tinted sunglasses",
      "butterfly hair clips",
      "a small shoulder bag",
      "platform sneakers",
    ],
  },
  Cottagecore: {
    base: "romantic cottagecore: a puff-sleeve blouse or prairie dress with lace or eyelet trims, a shirred bodice, a midi or maxi skirt",
    accessories: [
      "a woven basket bag",
      "mary janes or ballet flats",
      "a ribbon in the hair",
      "delicate floral jewelry",
    ],
  },
  "Dark Academia": {
    base: "classic dark academia: a wool blazer or trench coat, a turtleneck or collared shirt, plaid skirt or pleated trousers",
    accessories: [
      "a leather satchel",
      "a vintage-style watch",
      "simple round glasses",
      "oxford shoes",
    ],
  },
  Gorpcore: {
    base: "outdoor gorpcore: a technical puffer jacket or fleece, ripstop cargo or trail pants, a waterproof shell, trail runners or hiking boots",
    accessories: [
      "a classic beanie",
      "a clip belt",
      "a carabiner attached to a belt loop",
      "a functional backpack",
    ],
  },
};

module.exports = {
  GENDERS,
  STYLES,
  RACE_LABELS,
  COMPLEXIONS,
  DEFAULT_BATCH,
  NEGATIVE_PROMPT,
  STYLE_PROMPTS,
};
