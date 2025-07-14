const express = require("express");
const router = express.Router();
const servicoController = require("../controllers/servicoController");
const autoIncrementServicos = require("../middlewares/autoIncrementservico");

// Criar novo Cliente com middleware
router.post("/servico", autoIncrementServicos, servicoController.createServico);
router.get("/servicos", servicoController.listaServicos);
router.get("/servico/:id", servicoController.getServicosById);
router.put("/servico/:id", servicoController.updateServico);
router.patch("/servico", servicoController.deleteServico);

module.exports = router;
