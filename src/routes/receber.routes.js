const express = require('express');
const router = express.Router();
const receberController = require('../controllers/receberController');
const autoIncrementreceber = require('../middlewares/autoIncrementreceber');
const autoIncrementMovimento = require('../middlewares/autoIncrementMovimento');

// Criar novo Cliente com middleware
router.post('/receber', autoIncrementreceber, receberController.criarReceber);
router.get('/recebers', receberController.listarRecebers);
router.post('/receberLiquidacao',autoIncrementMovimento, receberController.liquidarReceber);
router.post('/receberDesliquidacao',autoIncrementMovimento, receberController.estornarLiquidacao);
module.exports = router;
