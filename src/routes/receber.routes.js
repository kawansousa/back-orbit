const express = require("express");
const router = express.Router();
const receberController = require("../controllers/receberController");
const autoIncrementreceber = require("../middlewares/autoIncrementreceber");
const auth = require("../middlewares/auth");
const checkPermission = require("../middlewares/checkPermission");
const ClientesController = require("../controllers/clientesController");

router.use(auth);

router.get(
  "/recebers",
  checkPermission("receber:ler"),
  receberController.listarRecebers
);
router.get(
  "/clientes",
  checkPermission("receber:ler"),
  ClientesController.getClientes
);

router.post(
  "/receber",
  checkPermission("receber:criar"),
  autoIncrementreceber,
  receberController.criarReceber
);

router.put(
  "/liquidar",
  checkPermission("receber:liquidar"),
  receberController.liquidarReceber
);

module.exports = router;