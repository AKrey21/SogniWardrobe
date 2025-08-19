require('dotenv').config();
const path = require('path');
const express = require('express');
const generateRoutes = require('./routes/generate');

const app = express();
const PORT = process.env.PORT || 3000;

/* ----------------------- express setup -------------------------- */
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Healthcheck
app.get('/heartbeat', (_req, res) => res.send('OK'));

// Mount API routes
app.use('/api', generateRoutes);

/* -------------------------- bootstrap --------------------------- */
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Web app ready on http://localhost:${PORT}`);
});