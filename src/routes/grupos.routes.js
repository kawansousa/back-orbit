const express = require("express");
const router = express.Router();
const autoIncrementGrupos = require("../middlewares/autoIncrementGrupos");
const gruposController = require("../controllers/gruposController");
const auth = require("../middlewares/auth");
const checkPermission = require("../middlewares/checkPermission");

router.use(auth);

router.get(
  "/", 
  checkPermission("grupo:ler"), 
  gruposController.getGrupos);
router.get(
  "/ativos",
  checkPermission("grupo:ler"),
  gruposController.getGruposAtivos
);

router.post(
  "/",
  checkPermission("grupo:criar"),
  autoIncrementGrupos,
  gruposController.createGrupos
);

router.put(
  "/:id",
  checkPermission("grupo:atualizar"),
  gruposController.updateGrupos
);

router.patch(
  "/",
  checkPermission("grupo:deletar"),
  gruposController.canceledGrupo
);

module.exports = router;