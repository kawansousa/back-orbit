const express = require("express");
const router = express.Router();
const contasBancariasController = require("../controllers/contasBancariasController");
const autoIncrementContasBancariasController = require("../middlewares/autoIncrementContasBancariasController");
const autoIncrementMovimentoBanco = require("../middlewares/autoIncrementMovimento");


router.get(
  "/movimentacaoBanco",
  contasBancariasController.listaMovimentacaoContaBancaria
);
router.get(
  "/conta-padrao",
  contasBancariasController.obterContaPadrao
);
router.get(
  "/", 
  contasBancariasController.listarContasBancarias
);
router.get(
  "/saldoTotal", 
  contasBancariasController.saldoTotalContasBancarias
);
router.get(
  "/:id", 
  contasBancariasController.listarContaBancaria
);
router.post(
  "/registraMovimentacaoBanco",
  autoIncrementMovimentoBanco,
  contasBancariasController.registrarMovimentacaoBanco
);
router.post(
  "/",
  autoIncrementContasBancariasController,
  contasBancariasController.adicionarContaBancaria
);

router.put(
  "/definir-padrao",
  contasBancariasController.definirContaPadrao
);
router.put(
  "/:id", 
  contasBancariasController.atualizarContaBancaria
);

router.delete (
  "/remover-padrao",
  contasBancariasController.removerContaPadrao
);
router.delete(
  "/:id", 
  contasBancariasController.excluirContaBancaria
);

module.exports = router;
