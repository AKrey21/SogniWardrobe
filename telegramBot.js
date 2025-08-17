require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

// ---------- constants ----------
const GENDERS = ['Male', 'Female', 'Unisex'];
const STYLES  = ['Streetwear','Casual','Smart Casual','Business Formal','Minimalist','Athleisure','Vintage','Techwear'];
// reduced default batch size; overridable via env
const DEFAULT_BATCH = Number(process.env.SOGNI_BATCH || 3);

// ---------- session store ----------
const sessions = Object.create(null); // key: `${chatId}:${userId}` -> {state, gender, style, itemText, lastPrompt, lastImages, generating?}
const userLastPrompt = {};

const sKey = (chatId, userId) => `${chatId}:${userId}`;
function getSessionByIds(chatId, userId){
  const key = sKey(chatId, userId);
  if (!sessions[key]) sessions[key] = { state: 'idle' };
  return sessions[key];
}
function getSession(msg){ return getSessionByIds(msg.chat.id, msg.from.id); }
function clearSessionByIds(chatId, userId){ sessions[sKey(chatId, userId)] = { state: 'idle' }; }
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
function styleKeyboard(){
  const rows = chunk(STYLES, 2).map(r => r.map(s => ({ text:s, callback_data:`style:${s}` })));
  return { inline_keyboard: rows.concat([[{ text:'⟵ Restart', callback_data:'action:restart' }]]) };
}
function resultActionsKeyboard(){
  return { inline_keyboard: [[
    { text:'🔁 Regenerate', callback_data:'action:regen' },
    { text:'🎛 Change Style', callback_data:'action:changestyle' },
    { text:'🔄 Restart', callback_data:'action:restart' },
  ] ] };
}
function buildPrompt(gender, style, itemText){
  return [
    `Create a fashion lookbook image, full body ${gender.toLowerCase()} model.`,
    `Overall aesthetic: ${style}.`,
    `Centerpiece item: ${itemText}.`,
    `One outfit per image. Clean studio or editorial background.`,
    `High quality, sharp details, color-balanced, no text, no watermarks.`
  ].join(' ');
}
const NEGATIVE_PROMPT = 'bad anatomy, deformed, extra limbs, watermark, text, low quality, jpeg artifacts, disfigured, blurry';

// ---------- start bot ----------
const startTelegramBot = (sogni) => {
  globalSogni = sogni;

  // help
  bot.onText(/^\/help$/, (msg) => {
    const o = getThreadMessageOptions(msg);
    const t = [
      '*Sogni Wardrobe* (text-only for now)',
      '1) /start → pick *Gender* → pick *Style* → type your *item* (e.g., "baby tee").',
      `2) I’ll generate *${DEFAULT_BATCH}* outfit images.`,
      '',
      '*Actions*',
      '• 🔁 Regenerate – new set with same gender/style/item',
      '• 🎛 Change Style – pick a different style',
      '• 🔄 Restart – start over',
      '',
      '*Shortcuts*',
      '• `!imagine <item>` – quick-generate using your last chosen gender/style',
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
      '👋 Hello! I\'m *Sogni Wardrobe*.\nStep 1 — Choose your gender.',
      { ...o, parse_mode:'Markdown', reply_markup: genderKeyboard() }
    );
    const s = getSession(msg);
    s.state = 'selecting_gender';
  });

  // ---------- callback buttons (key session by user who clicked) ----------
  bot.on('callback_query', async (cb) => {
    const chatId = cb.message.chat.id;
    const userId = cb.from.id;
    const o = getThreadMessageOptions(cb.message);
    const s = getSessionByIds(chatId, userId);
    const data = cb.data || '';

    try {
      if (data.startsWith('gender:')) {
        s.gender = data.split(':')[1];
        s.state = 'selecting_style';
        await bot.answerCallbackQuery(cb.id, { text: `Gender: ${s.gender}` });
        await bot.sendMessage(chatId, `You selected *${s.gender}*.\n\nStep 2 — Choose a style.`, {
          ...o, parse_mode:'Markdown', reply_markup: styleKeyboard()
        });
        return;
      }
      if (data.startsWith('style:')) {
        s.style = data.split(':')[1];
        s.state = 'awaiting_item';
        await bot.answerCallbackQuery(cb.id, { text: `Style: ${s.style}` });
        await bot.sendMessage(chatId, `🔥 You’re going for *${s.style}*.\n\nStep 3 — Type the clothing item (e.g., "baby tee").\n_Photo input is WIP._`, {
          ...o, parse_mode:'Markdown'
        });
        return;
      }
      if (data === 'action:changestyle') {
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
        if (!s.gender || !s.style || !s.itemText) return bot.sendMessage(chatId, 'Nothing to regenerate yet. Use /start.', o);
        await generateAndSendImages(chatId, o, s);
        return;
      }
    } catch (e) { console.error('callback_query error:', e); }
  });

  // ---------- messages ----------
  bot.on('message', async (msg) => {
    const o = getThreadMessageOptions(msg);
    const s = getSession(msg);

    // shortcuts
    if (msg.text && /^!repeat\b/i.test(msg.text)) {
      const last = userLastPrompt[msg.from.id];
      if (!last || !s.gender || !s.style) return bot.sendMessage(msg.chat.id, 'No last prompt or no style set. Use /start.', o);
      s.itemText = last;
      return generateAndSendImages(msg.chat.id, o, s);
    }
    if (msg.text && /^!(generate|imagine)\b/i.test(msg.text)) {
      if (!s.gender || !s.style) {
        return bot.sendMessage(msg.chat.id, 'Let’s set *Gender* then *Style* first. Use /start.', { ...o, parse_mode:'Markdown' });
      }
      s.itemText = msg.text.replace(/^!(generate|imagine)\b\s*/i, '').trim() || 't-shirt';
      userLastPrompt[msg.from.id] = s.itemText;
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

      // friendly hint in DM
      if (msg.chat.type === 'private' && !/^\/(start|help)/.test(msg.text)) {
        return bot.sendMessage(msg.chat.id, 'Use /start → pick gender & style → then type the item.', o);
      }
    }
  });

  // ---------- generation ----------
  async function generateAndSendImages(chatId, o, s){
    if (!s.gender || !s.style || !s.itemText) return bot.sendMessage(chatId, 'Missing info. /start to begin.', o);

    // tiny guard to prevent accidental double-runs
    if (s.generating) return bot.sendMessage(chatId, 'Hang on — still generating the last batch.', o);
    s.generating = true;

    const prompt = buildPrompt(s.gender, s.style, s.itemText);
    s.lastPrompt = prompt;

    await bot.sendMessage(
      chatId,
      `🎨 Generating *${DEFAULT_BATCH}* outfit ideas for “${s.itemText}” in *${s.style}* (${s.gender})…`,
      { ...o, parse_mode:'Markdown' }
    );

    try {
      const model  = process.env.SOGNI_MODEL_ID || 'flux1-schnell-fp8';
      // lighter defaults
      const steps  = Number(process.env.SOGNI_STEPS || 4);
      const width  = Number(process.env.SOGNI_WIDTH || 640);
      const height = Number(process.env.SOGNI_HEIGHT || 896);

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

      // send album directly from URLs (no disk writes)
      const media = [];
      for (let i = 0; i < Math.min(DEFAULT_BATCH, images.length); i++) {
        const url = images[i];
        media.push({
          type: 'photo',
          media: url,
          caption: i === 0 ? `✨ Done! Here are ${DEFAULT_BATCH} outfit ideas.` : undefined,
        });
      }

      await bot.sendMediaGroup(chatId, media, o);
      await bot.sendMessage(chatId, 'What would you like to do next?', { ...o, reply_markup: resultActionsKeyboard() });

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
