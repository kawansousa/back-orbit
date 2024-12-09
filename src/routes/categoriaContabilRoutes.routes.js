const express = require('express');
const router = express.Router();
const dreController = require('../controllers/categoriaContabilController');

router.post('/adicionarConta', dreController.adicionarConta);
router.get('/listarContas', dreController.listarContas);
router.put('/atualizarConta', dreController.atualizarConta);
router.delete('/excluirConta', dreController.excluirConta);
router.get('/drePdf', dreController.generateDREPDF);

module.exports = router;
