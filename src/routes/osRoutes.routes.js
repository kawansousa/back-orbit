const express = require("express");
const router = express.Router();
const osController = require("../controllers/osController");
const autoIncrementOs = require("../middlewares/autoIncrementOs");
const autoIncrementreceber = require("../middlewares/autoIncrementreceber");
const autoIncrementMovimento = require("../middlewares/autoIncrementMovimento");
const auth = require("../middlewares/auth");
const checkPermission = require("../middlewares/checkPermission");
const mecanicoController = require("../controllers/mecanicoController");
const ClientesController = require("../controllers/clientesController");
const ProdutosController = require("../controllers/produtosController");
const servicoController = require("../controllers/servicoController");

router.use(auth);

router.get(
  "/os", 
  checkPermission("os:ler"), 
  osController.listaOs
);
router.get(
  "/mecanicos",
  checkPermission("os:ler"),
  mecanicoController.listaMecanicos
);
router.get(
  "/clientes",
  checkPermission("os:ler"),
  ClientesController.getClientes
);
router.get(
  "/produtos",
  checkPermission("os:ler"),
  ProdutosController.getProdutos
);
router.get(
  "/servicos",
  checkPermission("os:ler"),
  servicoController.listaServicos
);
router.get(
  "/osPdf/:id", 
  checkPermission("os:pdf"), 
  osController.generateOsPDF
);
router.get(
  "/os/:id",
  checkPermission("os:ler"),
  autoIncrementreceber,
  osController.getOsById
);

router.post(
  "/os",
  checkPermission("os:criar"),
  autoIncrementOs,
  autoIncrementMovimento,
  autoIncrementreceber,
  osController.createOs
);

router.patch(
  "/updateOs",
  checkPermission("os:atualizar"),
  autoIncrementMovimento,
  autoIncrementreceber,
  osController.updateOs
);

router.patch(
  "/os/", 
  checkPermission("os:cancelar"), 
  osController.cancelarOs
);

module.exports = router;