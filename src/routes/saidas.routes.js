const express = require('express');
const router = express.Router();
const saidasController = require('../controllers/saidasController');
const autoIncrementSaidas = require('../middlewares/autoIncrementSaidas');

router.post('/', autoIncrementSaidas, saidasController.createSaida);
router.get('/', saidasController.getSaidas);
router.get('/:id', saidasController.getSaidaById);
router.put('/:id', saidasController.updateSaida);

module.exports = router;