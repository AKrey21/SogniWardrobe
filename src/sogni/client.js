const { SogniClient } = require('@sogni-ai/sogni-client');

/* ----------------- Sogni connection (singleton) ----------------- */
let sogni = null;

async function connectSogni() {
  const instance = await SogniClient.createInstance({
    appId: process.env.APP_ID,
    restEndpoint: process.env.REST_ENDPOINT,
    socketEndpoint: process.env.SOCKET_ENDPOINT,
  });

  instance.apiClient.on('connected', () => console.log('Connected to Sogni API'));
  instance.apiClient.on('disconnected', ({ code, reason }) => {
    console.error('Disconnected from Sogni API', code, reason);
  });

  await instance.account.login(process.env.SOGNI_USERNAME, process.env.SOGNI_PASSWORD);
  return instance;
}

async function getSogniClient() {
  if (!sogni) {
    try {
      sogni = await connectSogni();
    } catch (e) {
      console.error('Failed to connect to Sogni:', e);
      throw e;
    }
  }
  return sogni;
}

module.exports = { getSogniClient };