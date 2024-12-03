// routes/entradas.routes.js
const express = require('express');
const router = express.Router();
const entradasController = require('../controllers/entradasController');
const autoIncrementEntradas = require('../middlewares/autoIncrementEntradas');


// Criar uma nova entrada
router.post('/',autoIncrementEntradas, entradasController.createEntrada);

// Obter todas as entradas
router.get('/', entradasController.getEntradas);

// Obter uma entrada por ID
router.get('/:id', entradasController.getEntradaById);

// Atualizar uma entrada
router.put('/:id', entradasController.updateEntrada);

module.exports = router;
