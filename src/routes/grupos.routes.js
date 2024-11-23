// routes/Clientes.routes.js
const express = require('express');
const router = express.Router();
const autoIncrementGrupos = require('../middlewares/autoIncrementGrupos');
const gruposController = require('../controllers/gruposController');

// Criar novo Cliente com middleware
router.post('/grupo', autoIncrementGrupos, gruposController.createGrupos);
router.get('/grupos', gruposController.getGrupos);
router.get('/grupo/:id', gruposController.getGrupoById);
router.put('/grupo/:id', gruposController.updateGrupo);
router.delete('/grupo/:id', gruposController.deleteGrupo);

module.exports = router;
