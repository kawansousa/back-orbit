// routes/produtos.routes.js
const express = require('express');
const router = express.Router();
const ProdutosController = require('../controllers/produtosController');
const autoIncrementProduto = require('../middlewares/autoIncrementProduto');
const authUser = require('../middlewares/authUser');

// Criar novo produto com middleware
router.post('/produtos', autoIncrementProduto, ProdutosController.createProduto);
router.get('/produtos', ProdutosController.getProdutos);
router.get('/produtos/:id', ProdutosController.getProdutosById);
router.put('/produtos/:id', ProdutosController.updateProduto);
router.post('/produtosImportacao', ProdutosController.importProdutosFromExcel);

module.exports = router;
