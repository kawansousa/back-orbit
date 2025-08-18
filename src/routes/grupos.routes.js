// routes/Clientes.routes.js
const express = require('express');
const router = express.Router();
const autoIncrementGrupos = require('../middlewares/autoIncrementGrupos');
const gruposController = require('../controllers/gruposController');

router.post("/", autoIncrementGrupos, gruposController.createGrupos);
router.get("/", gruposController.getGrupos);
router.put("/:id", gruposController.updateGrupos)
router.patch("/", gruposController.canceledGrupo)

module.exports = router;
