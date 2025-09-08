const express = require("express");
const router = express.Router();
const vendaController = require("../controllers/vendasController");
const autoIncrementreceber = require("../middlewares/autoIncrementreceber");
const autoIncrementMovimento = require("../middlewares/autoIncrementMovimento");
const autoIncrementVendas = require("../middlewares/autoIncrementVendas");
const auth = require("../middlewares/auth");
const checkPermission = require("../middlewares/checkPermission");
const ClientesController = require("../controllers/clientesController");
const ProdutosController = require("../controllers/produtosController");
const userController = require("../controllers/usuarioController");
const contasBancariasController = require("../controllers/contasBancariasController");

router.use(auth);

router.get(
  "/", 
  checkPermission("venda:ler"), 
  vendaController.listarVendas
);
router.get(
  "/clientes",
  checkPermission("venda:ler"),
  ClientesController.getClientes
);
router.get(
  "/produtos",
  checkPermission("venda:ler"),
  ProdutosController.getProdutos
);
router.get(
  "/usuario", 
  checkPermission("venda:ler"), 
  userController.getUsers
);
router.get(
  "/contasBancarias",
  checkPermission("venda:ler"),
  contasBancariasController.listarContasBancarias
);
router.get(
  "/contasBancarias",
  checkPermission("os:ler"),
  contasBancariasController.listarContasBancarias
);
router.get(
  "/:id", 
  checkPermission("venda:ler"), 
  vendaController.getVendaById
);
router.get(
  "/:id/pdf",
  checkPermission("venda:pdf"),
  vendaController.generateVendaPDF
);

router.post(
  "/",
  checkPermission("venda:criar"),
  autoIncrementMovimento,
  autoIncrementreceber,
  autoIncrementVendas,
  vendaController.criarVenda
);

router.put(
  "/alterar",
  checkPermission("venda:atualizar"),
  autoIncrementreceber,
  vendaController.alterarVenda
);

router.patch(
  "/cancelar",
  checkPermission("venda:cancelar"),
  autoIncrementMovimento,
  autoIncrementreceber,
  vendaController.cancelarVenda
);

module.exports = router;