// api/index.js
const express = require('express');
const generateRouter = require('../src/routes/generate'); 

const app = express();
app.use(express.json({ limit: '2mb' }));

// Mount at root so this function responds at /api/generate
app.use('/', generateRouter);

module.exports = (req, res) => app(req, res);
