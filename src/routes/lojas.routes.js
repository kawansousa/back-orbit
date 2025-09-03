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
router.post(
  "/empresa",
  auth,
  checkPermission("empresa:criar"),
  incrementarCodigos,
  lojasController.createEmpresa
);

module.exports = router;
