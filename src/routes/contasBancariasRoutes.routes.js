const express = require('express');
const router = express.Router();
const contasBancariasController = require('../controllers/contasBancariasController');
const autoIncrementContasBancariasController = require('../middlewares/autoIncrementContasBancariasController')

router.post('/', autoIncrementContasBancariasController, contasBancariasController.adicionarContaBnacaria);
router.get('/', contasBancariasController.listarContasBancarias);
router.put('/:id', contasBancariasController.atualizarContaBancaria);
router.delete('/:id', contasBancariasController.excluirContaBancaria);
router.get('/:id', contasBancariasController.listarContaBancaria);

module.exports = router;
