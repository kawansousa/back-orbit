const express = require("express");
const router = express.Router();
const lojasController = require("../controllers/lojasController");
const incrementarCodigos = require("../middlewares/incrementarCodigos");
const auth = require("../middlewares/auth");
const checkPermission = require("../middlewares/checkPermission");

router.post(
  "/", 
  incrementarCodigos, 
  lojasController.createLoja
);

router.get(
  "/empresas",
  auth,
  checkPermission("empresa:ler"),
  lojasController.listEmpresasByCodigoLoja
);

router.post(
  "/empresa",
  auth,
  checkPermission("empresa:criar"),
  incrementarCodigos,
  lojasController.createEmpresa
);

router.put(
  "/update-empresa/:empresaId",
  auth,
  checkPermission("empresa:atualizar"),
  lojasController.updateEmpresa
)

module.exports = router;
