import 'dotenv/config';
import express from 'express';
import axios from 'axios';
import { SogniClient } from '@sogni-ai/sogni-client';
import { startTelegramBot } from './telegramBot.js';

/* --------- kill proxies (both cases) --------- */
delete process.env.HTTP_PROXY;
delete process.env.HTTPS_PROXY;
delete process.env.http_proxy;
delete process.env.https_proxy;
process.env.NO_PROXY = '*';

/* --------- log non-JSON to surface hidden HTML errors --------- */
const _fetch = globalThis.fetch;
globalThis.fetch = async (...args) => {
  const res = await _fetch(...args);
  try {
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (!ct.includes('application/json')) {
      const clone = res.clone();
      const txt = await clone.text();
      console.error('[Sogni REST non-JSON]', {
        url: String(args[0]),
        status: res.status,
        first100: txt.slice(0, 100)
      });
    }
  } catch {}
  return res;
};

const app = express();
const port = process.env.PORT || 3004;
app.get('/heartbeat', (_req, res) => res.send('OK'));

function resolveNetwork(raw) {
  const n = (raw || '').toLowerCase();
  return ['fast','relaxed','mixed'].includes(n) ? n : null;
}
function withTimeout(promise, ms, label='timeout') {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error(label)), ms))
  ]);
}

let sogni, MODEL_ID, ACTIVE_NET;

async function createClientWithFallback() {
  const appId = process.env.APP_ID || 'sogniwardrobe-bot';
  const first = resolveNetwork(process.env.SOGNI_NETWORK);
  const order = Array.from(new Set([first, 'fast', 'relaxed', 'mixed'].filter(Boolean)));

  for (const net of order) {
    try {
      console.log(`[Sogni] createInstance on '${net}'…`);
      const client = await withTimeout(SogniClient.createInstance({ appId, network: net }), 12000, `createInstance ${net}`);
      // login
      const user = process.env.SOGNI_USERNAME;
      const pass = process.env.SOGNI_PASSWORD;
      if (!user || !pass) throw new Error('Missing SOGNI_USERNAME or SOGNI_PASSWORD in .env');
      await withTimeout(client.account.login(user, pass), 12000, `login ${net}`);

      // switch server-side network (prevents /network/undefined)
      await withTimeout(client.account.switchNetwork(net), 8000, `switchNetwork ${net}`);

      // wait for models
      await withTimeout(client.projects.waitForModels(), 20000, `waitForModels ${net}`);

      ACTIVE_NET = net;
      return client;
    } catch (e) {
      console.error(`[Sogni] connect on '${net}' failed:`, e?.message || e);
    }
  }
  throw new Error('All Sogni networks failed (fast/relaxed/mixed).');
}

async function connectSogni() {
  console.log('[Env]', {
    hasUser: !!process.env.SOGNI_USERNAME,
    requestedNet: process.env.SOGNI_NETWORK || '(none)'
  });

  sogni = await createClientWithFallback();
  const emitter = sogni.apiClient || sogni;
  emitter.on?.('connected', () => console.log('[Sogni] connected (ws)'));
  emitter.on?.('disconnected', ({ code, reason } = {}) => console.error('[Sogni] disconnected', code, reason));

  // pick a model (or respect SOGNI_MODEL)
  const models = (typeof sogni.projects.getAvailableModels === 'function')
    ? await sogni.projects.getAvailableModels()
    : (sogni.projects.availableModels || []);

  MODEL_ID =
    process.env.SOGNI_MODEL ||
    models.find(m => /flux|sdxl/i.test(m.id))?.id ||
    models[0]?.id;

  if (!MODEL_ID) throw new Error('No Sogni models available for this account/network');
  console.log('[Sogni] using model:', MODEL_ID, `on '${ACTIVE_NET}'`);
}

(async () => {
  try {
    await connectSogni();

    const tgToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!tgToken) {
      console.warn('[Bot] TELEGRAM_BOT_TOKEN not set, skipping bot start.');
    } else {
      await startTelegramBot({ sogni, modelId: MODEL_ID, axios });
      console.log('[Bot] Telegram bot started');
    }

    app.listen(port, '0.0.0.0', () =>
      console.log(`Heartbeat on http://0.0.0.0:${port}/heartbeat`)
    );
  } catch (err) {
    console.error('[Init] failed:', err);
    process.exit(1);
  }
})();
