const express = require("express");
const router = express.Router();
const servicoController = require("../controllers/servicoController");
const autoIncrementServicos = require("../middlewares/autoIncrementservico");
const auth = require("../middlewares/auth");
const checkPermission = require("../middlewares/checkPermission");

router.use(auth);

router.get(
  "/servicos",
  checkPermission("servico:ler"),
  servicoController.listaServicos
);
router.get(
  "/servico/:id",
  checkPermission("servico:ler"),
  servicoController.getServicosById
);

router.post(
  "/servico",
  checkPermission("servico:criar"),
  autoIncrementServicos,
  servicoController.createServico
);

router.put(
  "/servico/:id",
  checkPermission("servico:atualizar"),
  servicoController.updateServico
);

router.patch(
  "/servico",
  checkPermission("servico:inativar"),
  servicoController.deleteServico
);

module.exports = router;