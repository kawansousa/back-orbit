const express = require("express");
const router = express.Router();
const mecanicoController = require("../controllers/mecanicoController");
const autoIncrementmecanico = require("../middlewares/autoIncrementmecanico");
const auth = require("../middlewares/auth");
const checkPermission = require("../middlewares/checkPermission");

router.use(auth);

router.get(
  "/mecanicos",
  checkPermission("mecanico:ler"),
  mecanicoController.listaMecanicos
);
router.get(
  "/mecanico/:id",
  checkPermission("mecanico:ler"),
  mecanicoController.getMecanicosById
);
router.get(
  "/relatorio",
  checkPermission("mecanico:relatorio"),
  mecanicoController.relatorioMecanicos
);

router.post(
  "/mecanico",
  checkPermission("mecanico:criar"),
  autoIncrementmecanico,
  mecanicoController.createMecanico
);

router.put(
  "/mecanico/:id",
  checkPermission("mecanico:atualizar"),
  mecanicoController.updateMecanico
);

router.patch(
  "/mecanico/",
  checkPermission("mecanico:inativar"),
  mecanicoController.deleteMecanico
);

module.exports = router;