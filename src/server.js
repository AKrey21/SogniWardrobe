// src/server.js
require('dotenv').config();
const path = require('path');
const express = require('express');
const { connectSogni } = require('./sogni/client');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve your frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

// Healthcheck
app.get('/heartbeat', (_req, res) => res.send('OK'));

// API
app.use('/api/generate', require('./routes/generate'));

(async () => {
  try {
    await connectSogni();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Web app ready on http://localhost:${PORT}`);
    });
  } catch (e) {
    console.error('Failed to init Sogni client:', e);
    process.exit(1);
  }
})();
