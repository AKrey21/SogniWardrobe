// telegramBot.js — Robust regenerate / change style / restart (fixed)
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

// ---------- constants ----------
const GENDERS = ['Male', 'Female', 'Unisex'];
const STYLES = [
  'Formal','Casual','Smart Casual','Business Casual','Streetwear','Preppy',
  'Minimal','Vintage','Workwear','Techwear','Grunge','Skater','Bohemian',
  'Festival','Y2K'
];

const STYLE_PROMPTS = {
  'Formal': 'sharp formalwear: tailored suit or dress, crisp shirt, polished shoes, refined accessories, clean grooming',
  'Casual': 'easy everyday casual: tees, jeans or shorts, sneakers, relaxed fit, simple layers, natural colours',
  'Smart Casual': 'elevated smart casual: blazers or structured outerwear with chinos/denim, loafers or sleek sneakers',
  'Business Casual': 'office-ready business casual: shirts/blouses, slacks or midi skirts, loafers, muted palette',
  'Streetwear': 'modern streetwear: hoodies, graphic tees, baggy jeans, cargos, statement sneakers, cap or beanie',
  'Preppy': 'preppy vibe: polo or knit, pleated skirt or chinos, loafers, argyle/checks, pastel or primary colours',
  'Minimal': 'minimalist style: clean lines, neutral palette, simple silhouettes, no logos, high-quality basics',
  'Vintage': 'retro-inspired: classic cuts and muted tones, era hints without costume, timeless silhouettes',
  'Workwear': 'workwear-inspired: denim, chore or utility jackets, sturdy fabrics, boots, functional pockets',
  'Techwear': 'futuristic techwear: water-resistant shells, taped seams, tactical pants, straps, muted monochrome',
  'Grunge': '90s grunge: flannel, distressed denim, band tee, combat boots, layered dark tones',
  'Skater': 'skate style: oversized tee/hoodie, loose jeans or shorts, skate shoes, cap, relaxed layers',
  'Bohemian': 'boho: flowing fabrics, earthy tones, floral prints, layered jewellery, relaxed silhouettes',
  'Festival': 'festival-ready: bold colours, crop tops or mesh, fringe, playful accessories, fun textures',
  'Y2K': 'early 2000s Y2K: low-rise jeans or mini, baby tees/camis, shiny or metallic fabrics, chunky accessories, playful pink/purple/metallic accents'
};

const COMPLEXIONS = ['Fair', 'Light-medium', 'Medium', 'Tan', 'Deep'];
const RACES = ['Chinese', 'Malay', 'Indian', 'Eurasian', 'Other'];

const RACE_LABELS = {
  Chinese:  'Singaporean Chinese',
  Malay:    'Singaporean Malay',
  Indian:   'Singaporean Indian',
  Eurasian: 'Singaporean Eurasian',
  Other:    'Singapore resident (unspecified ethnicity)'
};
function normalizeRace(race) {
  if (!race) return null;
  const key = String(race).trim();
  return RACE_LABELS[key] || `Singapore resident (${key})`;
}

const DEFAULT_BATCH = Number(process.env.SOGNI_BATCH || 3);

// ---------- session store ----------
const sessions = Object.create(null); // key -> session
const userLastPrompt = {};
const sKey = (chatId, userId) => `${chatId}:${userId}`;
function getSessionByIds(chatId, userId){
  const key = sKey(chatId, userId);
  if (!sessions[key]) sessions[key] = { state: 'idle', last: null };
  return sessions[key];
}
function getSession(msg){ return getSessionByIds(msg.chat.id, msg.from.id); }
function clearSessionByIds(chatId, userId){ sessions[sKey(chatId, userId)] = { state: 'idle', last: null }; }
function clearSession(msg){ clearSessionByIds(msg.chat.id, msg.from.id); }

// ---------- telegram setup ----------
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) { console.error('Error: TELEGRAM_BOT_TOKEN not set'); process.exit(1); }
const bot = new TelegramBot(token, { polling: true, request: { agentOptions: { keepAlive: true, family: 4 } } });

let botUsername = null;
bot.getMe().then(me => { botUsername = me.username; console.log('Bot username:', botUsername); });

let retryCount = 0;
const maxRetries = 9999;

// ---------- sogni ----------
let globalSogni = null;

// ---------- utils ----------
function getThreadMessageOptions(msg){
  if (msg.chat.type === 'supergroup' && msg.chat.is_forum && msg.message_thread_id) {
    return { message_thread_id: msg.message_thread_id };
  }
  return {};
}
function chunk(arr, n){ const out=[]; for(let i=0;i<arr.length;i+=n) out.push(arr.slice(i,i+n)); return out; }

function genderKeyboard(){ return { inline_keyboard: [ GENDERS.map(g => ({ text:g, callback_data:`gender:${g}` })) ] }; }
function complexionKeyboard() { return { inline_keyboard: COMPLEXIONS.map(c => [{ text: c, callback_data: `complexion:${c}` }]) }; }
function raceKeyboard() { return { inline_keyboard: RACES.map(r => [{ text: r, callback_data: `race:${r}` }]) }; }
function styleKeyboard(){
  const rows = chunk(STYLES, 2).map(r => r.map(s => ({ text:s, callback_data:`style:${s}` })));
  return { inline_keyboard: rows.concat([[{ text:'⟵ Restart', callback_data:'action:restart' }]]) };
}
function resultActionsKeyboard(){
  return { inline_keyboard: [[
    { text:'🔁 Regenerate', callback_data:'action:regen' },
    { text:'Change Style', callback_data:'action:changestyle' },
    { text:'🔄 Restart', callback_data:'action:restart' },
  ] ] };
}

// Confirm details UI
function profileSummary(s) {
  return [
'🎉 Awesome! Your profile is ready. This helps me picture *you* more clearly and design outfits that truly fit your vibe.\n\n✨ Please take a moment to *confirm your details* below:',
    '',
    `• Gender: *${s.gender || s.last?.gender || '-'}*`,
    `• Height: *${s.heightCm ? s.heightCm + ' cm' : (s.last?.heightCm ? s.last.heightCm + ' cm' : '-') }*`,
    `• Weight: *${s.weightKg ? s.weightKg + ' kg' : (s.last?.weightKg ? s.last.weightKg + ' kg' : '-') }*`,
    `• Race: *${s.race || s.last?.race || '-'}*`,
    `• Complexion: *${s.complexion || s.last?.complexion || '-'}*`,
    '',
    '_You can edit any field below before we pick a style._'
  ].join('\n');
}
function profileConfirmKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '✅ Looks good', callback_data: 'profile:confirm' },
        { text: '❌ Edit', callback_data: 'profile:editmenu' }
      ]
    ]
  };
}
function profileEditMenuKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '✏️ Edit Height', callback_data: 'edit:height' },
        { text: '✏️ Edit Weight', callback_data: 'edit:weight' }
      ],
      [
        { text: '✏️ Edit Race', callback_data: 'edit:race' },
        { text: '✏️ Edit Complexion', callback_data: 'edit:complexion' }
      ],
      [
        { text: '✅ Done, Confirm', callback_data: 'profile:confirm' }
      ],
      [
        { text: '⟵ Restart', callback_data: 'action:restart' }
      ]
    ]
  };
}

// Metric parsers (SG)
function parseHeightCm(input) {
  const s = (input || '').toString().trim().toLowerCase();
  const m = s.match(/(\d{2,3})(?:\s*cm|$)/);
  const cm = m ? Number(m[1]) : NaN;
  return (cm >= 140 && cm <= 210) ? cm : null;
}
function parseWeightKg(input) {
  const s = (input || '').toString().trim().toLowerCase();
  const m = s.match(/(\d{2,3})(?:\s*kg|$)/);
  const kg = m ? Number(m[1]) : NaN;
  return (kg >= 35 && kg <= 160) ? kg : null;
}

// ---------- prompt builder ----------
function buildPrompt({ gender, style, itemText, heightCm, weightKg, race, complexion }) {
  let build = '';
  if (heightCm && weightKg) {
    const h = heightCm / 100;
    const bmi = weightKg / (h * h);
    if (isFinite(bmi)) {
      if (bmi < 18.5)      build = 'slender build with lean proportions';
      else if (bmi < 25)   build = 'average build with balanced proportions';
      else if (bmi < 30)   build = 'strong build with fuller proportions';
      else                 build = 'plus-size build with full curves and realistic body volume';
    }
  }

  let stature = '';
  if (heightCm) {
    if (heightCm <= 155)       stature = 'short stature (petite height)';
    else if (heightCm <= 170)  stature = 'average height';
    else                       stature = 'tall stature';
  }

  const palette = complexion
    ? `skin tone: ${complexion.toLowerCase()}; use a color palette that flatters ${complexion.toLowerCase()} skin`
    : 'balanced color palette';

  const raceLabel = normalizeRace(race);
  const raceLine  = raceLabel ? `ethnicity: ${raceLabel}.` : '';

  const sgClimate = 'Singapore tropical climate: breathable fabrics, heat-friendly layering, sweat-wicking materials';

  const identity = [
    `${String(gender || 'Unisex').toLowerCase()} model`,
    heightCm ? `approx. ${heightCm} cm height` : '',
    weightKg ? `approx. ${weightKg} kg weight` : '',
    build, stature, palette, raceLine
  ].filter(Boolean).join(', ');

  const styleText = STYLE_PROMPTS[style] || style;

  //final prompt
  return [
    `Create a high-quality fashion lookbook image featuring a single, full-body ${identity}.`,
    `Overall aesthetic: ${style}.`,
    `Centerpiece item to style around: ${itemText}.`,
    `${sgClimate}.`,
    `One person only. No mannequins, no statues, no duplicate figures, no crowds.`,
    `Natural human posture and realistic proportions consistent with the stated height and weight.`,
    `Clean studio or editorial Singapore street background, realistic fabric textures, correct garment sizing and drape.`,
    `High resolution, sharp details, color-balanced, no text, no watermarks, no artifacts.`
  ].join(' ');
}

const NEGATIVE_PROMPT =
  'multiple people, group, duplicate person, mannequin, doll, bad anatomy, distorted body, incorrect limb length, exaggerated features, caricature, extra limbs, watermark, text, low quality, jpeg artifacts, disfigured, blurry';

// ---------- helper: persist & hydrate ----------
function persistLast(s) {
  s.last = {
    gender: s.gender, style: s.style, itemText: s.itemText,
    heightCm: s.heightCm, weightKg: s.weightKg,
    race: s.race, complexion: s.complexion
  };
}
function coreWithFallbacks(s) {
  return {
    gender:     s.gender     || s.last?.gender,
    style:      s.style      || s.last?.style,
    itemText:   s.itemText   || s.last?.itemText,
    heightCm:   s.heightCm   || s.last?.heightCm,
    weightKg:   s.weightKg   || s.last?.weightKg,
    race:       s.race       || s.last?.race,
    complexion: s.complexion || s.last?.complexion
  };
}

// ---------- start bot ----------
const startTelegramBot = (sogni) => {
  globalSogni = sogni;

  // help
  bot.onText(/^\/help$/, (msg) => {
    const o = getThreadMessageOptions(msg);
    const t = [
      '*Sogni Wardrobe*',
      'Flow: /start → Gender → Height (cm) → Weight (kg) → Race → Complexion → *Confirm Details* → Style → Item',
      `I’ll generate *${DEFAULT_BATCH}* outfit images.`,
      '',
      '*Actions*',
      '• 🔁 Regenerate – new set with same gender/style/item',
      '• 🎛 Change Style – pick a different style',
      '• 🔄 Restart – start over',
      '',
      '*Shortcuts*',
      '• `!imagine <item>` – quick generate using your last chosen gender/style',
      '• `!repeat` – rerun your last item',
      '',
      '_Photo input is WIP — please type the item._'
    ].join('\n');
    bot.sendMessage(msg.chat.id, t, { ...o, parse_mode:'Markdown' });
  });

  // start
  bot.onText(/^\/start$/, (msg) => {
    const o = getThreadMessageOptions(msg);
    clearSession(msg);
    bot.sendMessage(
      msg.chat.id,
'👋 Hey there! I\'m *Sogni Wardrobe*, your pocket-sized fashion stylist. ✨\nLet\'s create outfits that fit YOU perfectly.\n\nStep 1 — Please choose your gender to get started!',
      { ...o, parse_mode:'Markdown', reply_markup: genderKeyboard() }
    );
    const s = getSession(msg);
    s.state = 'selecting_gender';
  });

  // ---------- callback buttons ----------
  bot.on('callback_query', async (cb) => {
    const chatId = cb.message.chat.id;
    const userId = cb.from.id;
    const o = getThreadMessageOptions(cb.message);
    const s = getSessionByIds(chatId, userId);
    const data = cb.data || '';

    try {
      if (data.startsWith('gender:')) {
        s.gender = data.split(':')[1];
        s.state = 'collecting_height';
        await bot.answerCallbackQuery(cb.id, { text: `Gender: ${s.gender}` });
        await bot.sendMessage(chatId, `Step 2 — What’s your height (in cm)?\nExample: 160`, o);
        return;
      }

      if (data.startsWith('race:')) {
        s.race = data.split(':')[1];
        s.state = 'selecting_complexion';
        await bot.answerCallbackQuery(cb.id, { text: `Race: ${s.race}` });
        await bot.sendMessage(chatId, 'Step 4 — Pick your complexion (for colour palette):', { ...o, reply_markup: complexionKeyboard() });
        return;
      }

      if (data.startsWith('complexion:')) {
        s.complexion = data.split(':')[1];
        s.state = 'confirm_profile';
        await bot.answerCallbackQuery(cb.id, { text: `Complexion: ${s.complexion}` });
        await bot.sendMessage(chatId, profileSummary(s), { ...o, parse_mode: 'Markdown', reply_markup: profileConfirmKeyboard() });
        return;
      }

      if (data === 'profile:editmenu') {  // <-- fixed line
        s.state = 'confirm_profile';
        await bot.answerCallbackQuery(cb.id);
        await bot.sendMessage(chatId, 'Which detail would you like to edit?', { ...o, reply_markup: profileEditMenuKeyboard() });
        return;
      }

      if (data === 'edit:height') {
        s.state = 'collecting_height';
        await bot.answerCallbackQuery(cb.id);
        await bot.sendMessage(chatId, 'Enter your height (cm). Example: 160', o);
        return;
      }

      if (data === 'edit:weight') {
        s.state = 'collecting_weight';
        await bot.answerCallbackQuery(cb.id);
        await bot.sendMessage(chatId, 'Enter your weight (kg). Example: 80', o);
        return;
      }

      if (data === 'edit:race') {
        s.state = 'selecting_race';
        await bot.answerCallbackQuery(cb.id);
        await bot.sendMessage(chatId, 'Pick your race:', { ...o, reply_markup: raceKeyboard() });
        return;
      }

      if (data === 'edit:complexion') {
        s.state = 'selecting_complexion';
        await bot.answerCallbackQuery(cb.id);
        await bot.sendMessage(chatId, 'Pick your complexion:', { ...o, reply_markup: complexionKeyboard() });
        return;
      }

      if (data === 'profile:confirm') {
        s.state = 'selecting_style';
        await bot.answerCallbackQuery(cb.id, { text: 'Details confirmed' });
        await bot.sendMessage(chatId, 'Step 5 — Choose a style:', { ...o, reply_markup: styleKeyboard() });
        return;
      }

      if (data.startsWith('style:')) {
        s.style = data.split(':')[1];
        s.state = 'awaiting_item';
        await bot.answerCallbackQuery(cb.id, { text: `Style: ${s.style}` });
        await bot.sendMessage(chatId, `Great — *${s.style}*.\n\nStep 6 — Type the clothing item (e.g., "baby tee").\nI’ll generate SG-friendly outfits for you.`, {
          ...o, parse_mode:'Markdown'
        });
        return;
      }

      if (data === 'action:changestyle') {
        // do NOT clear profile; just ask for a new style
        s.state = 'selecting_style';
        await bot.answerCallbackQuery(cb.id, { text:'Change style' });
        await bot.sendMessage(chatId, 'Pick a new style:', { ...o, reply_markup: styleKeyboard() });
        return;
      }

      if (data === 'action:restart') {
        clearSessionByIds(chatId, userId);
        await bot.answerCallbackQuery(cb.id, { text:'Restarted' });
        await bot.sendMessage(chatId, 'Restarted. Step 1 — Choose your gender:', { ...o, reply_markup: genderKeyboard() });
        return;
      }

      if (data === 'action:regen') {
        await bot.answerCallbackQuery(cb.id, { text:'Regenerating…' });
        if (!s.itemText && s.last?.itemText) s.itemText = s.last.itemText;
        if (!s.itemText) return bot.sendMessage(chatId, 'Nothing to regenerate yet. Use /start.', o);
        await generateAndSendImages(chatId, o, s);
        return;
      }
    } catch (e) { console.error('callback_query error:', e); }
  });

  // ---------- messages ----------
  bot.on('message', async (msg) => {
    const o = getThreadMessageOptions(msg);
    const s = getSession(msg);

    // Step 2 — Height
    if (s.state === 'collecting_height' && msg.text) {
      const cm = parseHeightCm(msg.text);
      if (!cm) return bot.sendMessage(msg.chat.id, 'Can you enter height in cm? Example: 160', o); //shld change
      s.heightCm = cm;

      if (s.race || s.complexion || s.weightKg) {
        s.state = 'confirm_profile';
        return bot.sendMessage(msg.chat.id, profileSummary(s), { ...o, parse_mode:'Markdown', reply_markup: profileConfirmKeyboard() });
      }

      s.state = 'collecting_weight';
      return bot.sendMessage(msg.chat.id, 'Step 3 — What’s your weight (in kg)?\nExample: 80', o);
    }

    // Step 3 — Weight
    if (s.state === 'collecting_weight' && msg.text) {
      const kg = parseWeightKg(msg.text);
      if (!kg) return bot.sendMessage(msg.chat.id, 'Can you enter weight in kg? Example: 80', o); //shld change
      s.weightKg = kg;

      if (s.race || s.complexion) {
        s.state = 'confirm_profile';
        return bot.sendMessage(msg.chat.id, profileSummary(s), { ...o, parse_mode:'Markdown', reply_markup: profileConfirmKeyboard() });
      }

      s.state = 'selecting_race';
      return bot.sendMessage(msg.chat.id, 'Step 4 — Pick your race (for localisation):', { ...o, reply_markup: raceKeyboard() });
    }

    // shortcuts
    if (msg.text && /^!repeat\b/i.test(msg.text)) {
      const last = userLastPrompt[msg.from.id];
      if (!last && !s.last?.itemText) return bot.sendMessage(msg.chat.id, 'No last prompt yet. Use /start.', o);
      s.itemText = last || s.last.itemText;
      return generateAndSendImages(msg.chat.id, o, s);
    }
    if (msg.text && /^!(generate|imagine)\b/i.test(msg.text)) {
      const text = msg.text.replace(/^!(generate|imagine)\b\s*/i, '').trim() || 't-shirt';
      s.itemText = text;
      userLastPrompt[msg.from.id] = text;
      return generateAndSendImages(msg.chat.id, o, s);
    }

    // photo input = WIP notice
    if (msg.photo && msg.photo.length) {
      if (s.state === 'awaiting_item' || s.state === 'ready') {
        return bot.sendMessage(msg.chat.id, '📸 Photo input is WIP. Please *type* the item (e.g., "baby tee").', { ...o, parse_mode:'Markdown' });
      }
      return;
    }

    // normal text flow
    if (msg.text) {
      if (s.state === 'awaiting_item' || s.state === 'ready') {
        s.itemText = msg.text.trim();
        if (!s.itemText) return;
        userLastPrompt[msg.from.id] = s.itemText;
        return generateAndSendImages(msg.chat.id, o, s);
      }

      if (msg.chat.type === 'private' && !/^\/(start|help)/.test(msg.text)) {
        return bot.sendMessage(msg.chat.id, 'Use /start → gender → height → weight → race → complexion → confirm → style → item.', o);
      }
    }
  });

  // ---------- generation ----------
  async function generateAndSendImages(chatId, o, s){
    const core = coreWithFallbacks(s);
    s.gender = core.gender;
    s.style = core.style;
    s.heightCm = core.heightCm;
    s.weightKg = core.weightKg;
    s.race = core.race;
    s.complexion = core.complexion;

    if (!core.gender || !core.style || !core.itemText) {
      return bot.sendMessage(chatId, 'Missing info. /start to begin.', o);
    }

    if (s.generating) return bot.sendMessage(chatId, 'Hang on — still generating the last batch.', o);
    s.generating = true;

    const prompt = buildPrompt({
      gender: core.gender,
      style: core.style,
      itemText: core.itemText,
      heightCm: core.heightCm,
      weightKg: core.weightKg,
      race: core.race,
      complexion: core.complexion
    });
    s.lastPrompt = prompt;

    await bot.sendMessage(
      chatId,
      `🎨✨ Generating *${DEFAULT_BATCH}* outfit ideas for “${core.itemText}” in *${core.style}* (${core.gender})…`,
      { ...o, parse_mode:'Markdown' }
    );

    try {
      const model  = process.env.SOGNI_MODEL_ID || process.env.SOGNI_MODEL || 'flux1-schnell-fp8';
      const steps  = Number(process.env.SOGNI_STEPS || 8);
      const width  = Number(process.env.SOGNI_WIDTH || 768);
      const height = Number(process.env.SOGNI_HEIGHT || 1152);

      const images = [];
      for (let attempt=1; attempt<=2 && images.length<DEFAULT_BATCH; attempt++) {
        const project = await globalSogni.projects.create({
          tokenType:'spark',
          modelId:model,
          positivePrompt: prompt,
          negativePrompt: NEGATIVE_PROMPT,
          stylePrompt: '',
          steps, guidance:1,
          numberOfImages: DEFAULT_BATCH - images.length,
          scheduler:'Euler', timeStepSpacing:'Linear',
          sizePreset:'custom', width, height,
        });
        const got = await project.waitForCompletion();
        if (got && got.length) images.push(...got);
      }

      if (!images.length) {
        return bot.sendMessage(chatId, 'Couldn’t generate images (maybe blocked by safety filters). Try rephrasing the item.', o);
      }

      const media = [];
      for (let i = 0; i < Math.min(DEFAULT_BATCH, images.length); i++) {
        const url = images[i];
        media.push({ type: 'photo', media: url, caption: i === 0 ? `✨ Done! Here are ${DEFAULT_BATCH} outfit ideas.` : undefined });
      }

      await bot.sendMediaGroup(chatId, media, o);
      await bot.sendMessage(chatId, 'What would you like to do next?', { ...o, reply_markup: resultActionsKeyboard() });

      s.itemText = core.itemText;
      persistLast(s);

      s.lastImages = images.slice(0, DEFAULT_BATCH);
      s.state = 'ready';
    } catch (err) {
      if (err && err.status === 401 && err.payload && err.payload.errorCode === 107) { setTimeout(()=>process.exit(1), 5000); return; }
      if (err?.message?.includes('WebSocket not connected')) { setTimeout(()=>process.exit(1), 5000); return; }
      if (err?.message?.includes('Project not found')) { setTimeout(()=>process.exit(1), 5000); return; }
      if (err?.message?.includes('Insufficient funds')) return bot.sendMessage(chatId, 'Bot is out of funds. Please top up.', o);
      console.error('Generation error:', err);
      bot.sendMessage(chatId, 'An error occurred while generating. Please try again.', o);
    } finally {
      s.generating = false;
    }
  }

  // ---------- polling error ----------
  bot.on('polling_error', (error) => {
    console.error('Polling error:', error);
    if (retryCount >= maxRetries) { setTimeout(()=>process.exit(1), 5000); return; }
    retryCount++;
    setTimeout(()=>process.exit(1), 5000);
  });
};

module.exports = startTelegramBot;
