// src/sogni/client.js
const { SogniClient } = require('@sogni-ai/sogni-client');

/* ----------------- Sogni connection (singleton + single-flight) ----------------- */
let sogni = null;
let initPromise = null;

async function connectSogni() {
  const { APP_ID, REST_ENDPOINT, SOCKET_ENDPOINT, SOGNI_USERNAME, SOGNI_PASSWORD } = process.env;
  if (!APP_ID || !REST_ENDPOINT || !SOCKET_ENDPOINT || !SOGNI_USERNAME || !SOGNI_PASSWORD) {
    throw new Error("Missing Sogni environment variables");
  }

  const instance = await SogniClient.createInstance({
    appId: APP_ID,
    restEndpoint: REST_ENDPOINT,
    socketEndpoint: SOCKET_ENDPOINT,
  });

  instance.apiClient.on('connected', () => console.log('Connected to Sogni API'));
  instance.apiClient.on('disconnected', ({ code, reason }) => {
    console.error('Disconnected from Sogni API', code, reason);
  });

  await instance.account.login(SOGNI_USERNAME, SOGNI_PASSWORD);
  return instance;
}

async function getSogniClient() {
  if (sogni) return sogni;
  if (!initPromise) {
    initPromise = (async () => {
      try {
        sogni = await connectSogni();
        return sogni;
      } finally {
        initPromise = null; // allow re-init later if needed
      }
    })();
  }
  return initPromise;
}

module.exports = { getSogniClient };
