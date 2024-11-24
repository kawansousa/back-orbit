const express = require('express');
const router = express.Router();
const autoIncrementOrcamentos = require('../middlewares/autoIncrementOrcamentos');
const orcamentosController = require('../controllers/orcamentosController');

// Criar novo Cliente com middleware
router.post('/orcamento', autoIncrementOrcamentos, orcamentosController.createOrcamento);
router.get('/orcamentos', orcamentosController.getOrcamentos);
router.get('/orcamento/:id', orcamentosController.getOrcamentoById);
router.put('/orcamento/:id', orcamentosController.updateOrcamento);
router.get('/orcamentos/:id/pdf', orcamentosController.generateOrcamentoPDF);

module.exports = router;
