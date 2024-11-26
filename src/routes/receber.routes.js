const express = require('express');
const router = express.Router();
const receberController = require('../controllers/receberController');
const autoIncrementreceber = require('../middlewares/autoIncrementreceber');

// Criar novo Cliente com middleware
router.post('/receber', autoIncrementreceber, receberController.criarReceber);
router.post('/receberCancelaar', autoIncrementreceber, receberController.cancelarReceber);
router.get('/receber', receberController.listarRecebers);

router.post('/receberLiquidacao', receberController.registrarPagamentoParcela);
module.exports = router;
