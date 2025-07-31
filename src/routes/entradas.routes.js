const express = require('express');
const router = express.Router();
const entradasController = require('../controllers/entradasController');
const autoIncrementEntradas = require('../middlewares/autoIncrementEntradas');

router.post('/', autoIncrementEntradas, entradasController.createEntrada);
router.get('/', entradasController.getEntradas);
router.get('/:id', entradasController.getEntradaById);
router.put('/:id', entradasController.updateEntrada);

module.exports = router;