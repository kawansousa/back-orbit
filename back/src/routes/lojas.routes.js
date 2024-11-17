const express = require('express');
const router = express.Router();
const lojasController = require('../controllers/lojasController');

router.post('/lojas', lojasController.createLoja);
router.get('/lojas', lojasController.getLojas);
router.post('/lojas/:lojaId/empresas', lojasController.addEmpresaToLoja);

module.exports = router;
