// routes/Clientes.routes.js
const express = require('express');
const router = express.Router();
const autoIncrementFornecedor = require('../middlewares/autoIncrementFornecedor');
const fornecedoresController = require('../controllers/fornecedorController');

// Criar novo Cliente com middleware
router.post('/fornecedor', autoIncrementFornecedor, fornecedoresController.createFornecedor);
router.get('/fornecedores', fornecedoresController.getFornecedores);
router.get('/fornecedor/:id', fornecedoresController.getfornecedorById);
router.put('/fornecedor/:id', fornecedoresController.updateFornecedor);
router.delete('/fornecedor/:id', fornecedoresController.deleteFornecedor);

module.exports = router;
