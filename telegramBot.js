import { Telegraf, Markup } from 'telegraf';

const COOLDOWN_MS = 10_000;
const lastUse = new Map(); // userId -> last ts
const chatStyle = new Map(); // chatId -> 'flatlay' | 'lookbook'

function coolingDown(userId) {
  const now = Date.now();
  const prev = lastUse.get(userId) || 0;
  if (now - prev < COOLDOWN_MS) return true;
  lastUse.set(userId, now);
  return false;
}

const PRESET = {
  flatlay:
    'Studio flat-lay on a light backdrop, realistic textures, cohesive palette. Include top, bottom, shoes, and one accessory.',
  lookbook:
    'Full-body fashion lookbook on a Singapore street, natural light, editorial 35mm vibe, realistic fabrics.'
};

function composePrompt(text, style = 'flatlay') {
  const base = PRESET[style] || PRESET.flatlay;
  const cleaned = (text || '').trim().replace(/\s+/g, ' ').slice(0, 500);
  return `${base} ${cleaned}`.trim();
}

export async function startTelegramBot({ sogni, modelId, axios }) {
  const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

  bot.start(async (ctx) => {
    await ctx.reply(
      'SogniWardrobe is live! 👗\n' +
      'Send any outfit idea & I’ll generate a look.\n\n' +
      'Try:\n• white baby tee, wide-leg jeans (SG weather)\n' +
      '• smart-casual with loafers & linen shirt\n\n' +
      'Quick styles: /flatlay  or  /lookbook\n(1 gen per 10s to keep the queue happy ✨)'
    );
  });

  bot.command('flatlay', (ctx) => { chatStyle.set(ctx.chat.id, 'flatlay'); return ctx.reply('Style set: flatlay ✅'); });
  bot.command('lookbook', (ctx) => { chatStyle.set(ctx.chat.id, 'lookbook'); return ctx.reply('Style set: lookbook ✅'); });

  // Cancel button handler (best-effort cancel UX)
  const pending = new Map(); // messageId -> { canceled: boolean }

  bot.action('cancel', async (ctx) => {
    const mid = ctx.update.callback_query?.message?.message_id;
    if (mid && pending.has(mid)) {
      pending.get(mid).canceled = true;
      await ctx.answerCbQuery('Canceled');
      await ctx.editMessageText('Canceled ❌');
    } else {
      await ctx.answerCbQuery('Nothing to cancel');
    }
  });

  bot.on('text', async (ctx) => {
    const text = ctx.message.text;
    if (text.startsWith('/')) return;

    if (coolingDown(ctx.from.id)) {
      const remain = Math.ceil((COOLDOWN_MS - (Date.now() - (lastUse.get(ctx.from.id) || 0))) / 1000);
      return ctx.reply(`Gimme ${remain}s to glam up ✨`);
    }

    const style = chatStyle.get(ctx.chat.id) || 'flatlay';
    const prompt = composePrompt(text, style);

    // 1) Create an editable "Generating…" message
    const keyboard = Markup.inlineKeyboard([[Markup.button.callback('Cancel ❌', 'cancel')]]);
    const statusMsg = await ctx.reply(`Generating *${style}* look…`, { parse_mode: 'Markdown', ...keyboard });
    const chatId = ctx.chat.id;
    const messageId = statusMsg.message_id;
    pending.set(messageId, { canceled: false });
    let lastPercentShown = -1;

    const updateStatus = async (pct, note = '') => {
      if (!pending.get(messageId) || pending.get(messageId).canceled) return;
      let text = `Generating *${style}* look…`;
      if (pct != null) {
        const rounded = Math.max(0, Math.min(100, Math.floor(pct)));
        if (rounded === lastPercentShown) return;
        lastPercentShown = rounded;
        text += ` ${rounded}%`;
      }
      if (note) text += ` ${note}`;
      try {
        await ctx.telegram.editMessageText(chatId, messageId, undefined, text, { parse_mode: 'Markdown' });
      } catch (_) {}
    };

    try {
      // 2) Create a Sogni project
      const project = await sogni.projects.create({
        modelId: modelId,
        positivePrompt: prompt,
        numberOfImages: 1,
        steps: 20,
        sizePreset: 'square_hd',
        guidance: 7.5,
        negativePrompt: 'watermark, logo, text artifacts, deformed, extra limbs'
        // You could also pass network: 'fast' | 'relaxed' | 'mixed' here per-gen if needed
      });

      // 3) Listen for updates (progress + results)
      const onUpdate = async () => {
        if (pending.get(messageId)?.canceled) {
          project.off?.('updated', onUpdate);
          return;
        }

        const pct = project.progress ?? project.jobs?.[0]?.progress ?? null;
        if (pct != null) await updateStatus(pct);

        if (project.resultUrls?.length > 0) {
          project.off?.('updated', onUpdate);
          await updateStatus(100, '(sending)');
          try {
            const url = project.resultUrls[0];
            const resp = await axios.get(url, { responseType: 'arraybuffer' });
            await ctx.replyWithPhoto({ source: Buffer.from(resp.data) }, { caption: `Style: ${style}\n${text}` });
            await ctx.telegram.editMessageText(chatId, messageId, undefined, 'Done ✅');
          } catch (e) {
            await ctx.telegram.editMessageText(chatId, messageId, undefined, 'Failed to fetch image ❌');
          } finally {
            pending.delete(messageId);
          }
        }
      };

      project.on?.('updated', onUpdate);

      // 4) Safety poller (in case events are suppressed)
      const poller = setInterval(onUpdate, 1000);

      // 5) Timeout after 3 minutes
      setTimeout(async () => {
        clearInterval(poller);
        project.off?.('updated', onUpdate);
        if (!project.resultUrls?.length && !pending.get(messageId)?.canceled) {
          await ctx.telegram.editMessageText(chatId, messageId, undefined, 'Sorry, timed out 😭 Try a shorter prompt?');
          pending.delete(messageId);
        }
      }, 180000);
    } catch (e) {
      console.error('[Generation] failed:', e?.message || e);
      try { await ctx.reply('Paiseh, generation failed. Try shorter/simpler text?'); } catch {}
      try { await ctx.telegram.editMessageText(chatId, messageId, undefined, 'Failed ❌'); } catch {}
      pending.delete(messageId);
    }
  });

  await bot.launch();
}
