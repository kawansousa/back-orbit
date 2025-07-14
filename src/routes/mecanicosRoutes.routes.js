const express = require("express");
const router = express.Router();
const mecanicoController = require("../controllers/mecanicoController");
const autoIncrementmecanico = require("../middlewares/autoIncrementmecanico");

// Criar novo Cliente com middleware
router.post(
  "/mecanico",
  autoIncrementmecanico,
  mecanicoController.createMecanico
);
router.get("/mecanicos", mecanicoController.listaMecanicos);
router.get("/mecanico/:id", mecanicoController.getMecanicosById);
router.put("/mecanico/:id", mecanicoController.updateMecanico);
router.delete("/mecanico/:id", mecanicoController.deleteMecanico);

module.exports = router;
