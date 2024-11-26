const express = require('express');
const router = express.Router();
const caixaController = require('../controllers/caixaController');
const autoIncrementCaixa = require('../middlewares/autoIncrementCaixa');
const autoIncrementMovimento = require('../middlewares/autoIncrementMovimento');

// Criar novo Cliente com middleware
router.post('/caixa', autoIncrementCaixa, caixaController.abrirCaixa);
router.post('/caixaRegistraMovimento', autoIncrementMovimento, caixaController.registrarMovimentacao);
router.get('/caixas', caixaController.listarCaixas);
router.get('/caixasDetalhes/:caixaId', caixaController.detalhesCaixa);
router.post('/caixaFechamento', caixaController.fecharCaixa);

module.exports = router;
