// routes/Clientes.routes.js
const express = require('express');
const router = express.Router();
const cidadesController = require('../controllers/cidadesController');

// Criar novo Cliente com middleware
router.get('/cidades', cidadesController.getCidades);
router.get('/cidade/:id', cidadesController.getCidadesById);

module.exports = router;
