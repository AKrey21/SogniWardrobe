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

module.exports = {
  GENDERS,
  STYLES,
  RACE_LABELS,
  COMPLEXIONS,
  DEFAULT_BATCH,
  NEGATIVE_PROMPT,
  STYLE_PROMPTS
};