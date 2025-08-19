// src/sogni/client.js
const { SogniClient } = require('@sogni-ai/sogni-client');

let instance = null;

async function connectSogni() {
  const client = await SogniClient.createInstance({
    appId: process.env.APP_ID,
    restEndpoint: process.env.REST_ENDPOINT,
    socketEndpoint: process.env.SOCKET_ENDPOINT,
  });

  client.apiClient.on('connected', () => console.log('[Sogni] Connected'));
  client.apiClient.on('disconnected', ({ code, reason }) => {
    console.error('[Sogni] Disconnected', code, reason);
  });

  await client.account.login(process.env.SOGNI_USERNAME, process.env.SOGNI_PASSWORD);
  instance = client;
  return client;
}

function getClientOrThrow() {
  if (!instance) throw new Error('Sogni not connected');
  return instance;
}

async function generateImages({
  positivePrompt,
  negativePrompt,
  numberOfImages,
  model = process.env.SOGNI_MODEL_ID || process.env.SOGNI_MODEL || 'flux1-schnell-fp8',
  steps = Number(process.env.SOGNI_STEPS || 12),
  width = Number(process.env.SOGNI_WIDTH || 768),
  height = Number(process.env.SOGNI_HEIGHT || 1152)
}) {
  const client = getClientOrThrow();

  const project = await client.projects.create({
    tokenType: 'spark',
    modelId: model,
    positivePrompt,
    negativePrompt,
    stylePrompt: '',
    steps,
    guidance: 1.5,
    numberOfImages,
    scheduler: 'Euler',
    timeStepSpacing: 'Linear',
    sizePreset: 'custom',
    width,
    height
  });

  const images = await project.waitForCompletion();
  return { images, params: { model, steps, guidance: 1.5, width, height } };
}

module.exports = { connectSogni, generateImages };
