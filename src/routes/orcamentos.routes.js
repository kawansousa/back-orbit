const express = require("express");
const router = express.Router();
const autoIncrementOrcamentos = require("../middlewares/autoIncrementOrcamentos");
const orcamentosController = require("../controllers/orcamentosController");
const auth = require("../middlewares/auth");
const checkPermission = require("../middlewares/checkPermission");
const ClientesController = require("../controllers/clientesController");
const ProdutosController = require("../controllers/produtosController");
const userController = require("../controllers/usuarioController");

router.use(auth);

router.get(
  "/orcamentos",
  checkPermission("orcamento:ler"),
  orcamentosController.getOrcamentos
);
router.get(
  "/clientes",
  checkPermission("orcamento:ler"),
  ClientesController.getClientes
);
router.get(
  "/produtos",
  checkPermission("orcamento:ler"),
  ProdutosController.getProdutos
);
router.get(
  "/usuario",
  checkPermission("orcamento:ler"),
  userController.getUsers
);
router.get(
  "/orcamento/:id",
  checkPermission("orcamento:ler"),
  orcamentosController.getOrcamentoById
);
router.get(
  "/orcamentos/:id/pdf",
  checkPermission("orcamento:pdf"),
  orcamentosController.generateOrcamentoPDF
);

router.post(
  "/orcamento",
  checkPermission("orcamento:criar"),
  autoIncrementOrcamentos,
  orcamentosController.createOrcamento
);

router.put(
  "/orcamento/:id",
  checkPermission("orcamento:atualizar"),
  orcamentosController.updateOrcamento
);

router.put(
  "/orcamentos/:id/status",
  checkPermission("orcamento:converter"),
  orcamentosController.updateOrcamentoStatus
);

module.exports = router;
