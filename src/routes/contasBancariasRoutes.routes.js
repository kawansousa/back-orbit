const express = require("express");
const router = express.Router();
const contasBancariasController = require("../controllers/contasBancariasController");
const autoIncrementContasBancariasController = require("../middlewares/autoIncrementContasBancariasController");
const autoIncrementMovimentoBanco = require("../middlewares/autoIncrementMovimentoBanco");
const auth = require("../middlewares/auth");
const checkPermission = require("../middlewares/checkPermission");

router.use(auth);

router.get(
  "/",
  checkPermission("conta_bancaria:ler"),
  contasBancariasController.listarContasBancarias
);
router.get(
  "/movimentacaoBanco",
  checkPermission("conta_bancaria:ler"),
  contasBancariasController.listaMovimentacaoContaBancaria
);
router.get(
  "/:id",
  checkPermission("conta_bancaria:ler"),
  contasBancariasController.listarContaBancaria
);

router.post(
  "/",
  checkPermission("conta_bancaria:criar"),
  autoIncrementContasBancariasController,
  contasBancariasController.adicionarContaBancaria
);
router.post(
  "/registraMovimentacaoBanco",
  checkPermission("conta_bancaria:movimentar"),
  autoIncrementMovimentoBanco,
  contasBancariasController.registrarMovimentacaoBanco
);

router.put(
  "/:id",
  checkPermission("conta_bancaria:atualizar"),
  contasBancariasController.atualizarContaBancaria
);

router.delete(
  "/:id",
  checkPermission("conta_bancaria:deletar"),
  contasBancariasController.excluirContaBancaria
);

module.exports = router;
