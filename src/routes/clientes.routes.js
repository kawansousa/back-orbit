// routes/Clientes.routes.js
const express = require('express');
const router = express.Router();
const autoIncrementCliente = require('../middlewares/autoIncrementCliente');
const ClientesController = require('../controllers/clientesController');

// Criar novo Cliente com middleware
router.post('/clientes', autoIncrementCliente, ClientesController.createCliente);
router.get('/clientes', ClientesController.getClientes);
router.get('/cliente/:id', ClientesController.getClientesById);
router.put('/cliente/:id', ClientesController.updateCliente);
router.delete('/cliente/:id', ClientesController.deleteCliente);

module.exports = router;
