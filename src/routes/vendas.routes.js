const express = require('express');
const router = express.Router();
const vendaController = require('../controllers/vendasController');
const autoIncrementreceber = require('../middlewares/autoIncrementreceber');
const autoIncrementMovimento = require('../middlewares/autoIncrementMovimento');
const autoIncrementVendas = require('../middlewares/autoIncrementVendas');

router.post('/', autoIncrementMovimento, autoIncrementreceber, autoIncrementVendas, vendaController.criarVenda);
router.get('/', vendaController.listarVendas);
router.patch('/cancelar', autoIncrementMovimento, vendaController.cancelarVenda);
router.put('/alterar', autoIncrementMovimento, vendaController.alterarVenda);
router.get('/:id/pdf', vendaController.generateVendaPDF);


module.exports = router;