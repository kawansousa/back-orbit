const express = require("express");
const router = express.Router();
const PagarController = require("../controllers/pagarController");
const auth = require("../middlewares/auth");
const checkPermission = require("../middlewares/checkPermission");

router.use(auth);

router.get(
  "/", 
  checkPermission("pagar:ler"), 
  PagarController.listarPagamentos
);

router.post(
  "/", 
  checkPermission("pagar:criar"), 
  PagarController.criarPagar
);

router.put(
  "/liquidar",
  checkPermission("pagar:liquidar"),
  PagarController.liquidarPagamento
);

module.exports = router;