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
  "/saldoTotal",
  checkPermission("conta_bancaria:ler"),
  contasBancariasController.saldoTotalContasBancarias
)
router.get(
  "/movimentacaoBanco",
  checkPermission("conta_bancaria:ler"),
  contasBancariasController.listaMovimentacaoContaBancaria
);
router.get(
  "/conta-padrao",
  checkPermission("ler"),
  contasBancariasController.obterContaPadrao
)

router.post(
  "/",
  checkPermission("conta_bancaria:criar"),
  autoIncrementContasBancariasController,
  contasBancariasController.adicionarContaBancaria
);
router.post(
  "/movimentacao-bancaria",
  checkPermission("conta_bancaria:movimentar"),
  autoIncrementMovimentoBanco,
  contasBancariasController.criarMovimentacaoBancaria
)

router.put(
  "/definir-padrao",
  checkPermission("atualizar"),
  contasBancariasController.definirContaPadrao
)
router.put(
  "/:id",
  checkPermission("conta_bancaria:atualizar"),
  contasBancariasController.atualizarContaBancaria
);

router.delete(
  "/remover-padrao",
  checkPermission("deletar"),
  contasBancariasController.removerContaPadrao
)

module.exports = router;
