// api/index.js
const express = require('express');
const generateRouter = require('../src/routes/generate'); 

const app = express();
app.use(express.json({ limit: '1mb' }));

// Your router already defines `router.post('/generate', ...)`,
// so mounting it at `/api` keeps your front-end fetch('/api/generate') working.
app.use('/api', generateRouter);

// Hand off to Express
module.exports = (req, res) => app(req, res);
