const express = require("express");
const router = express.Router();
const contasBancariasController = require("../controllers/contasBancariasController");
const autoIncrementContasBancariasController = require("../middlewares/autoIncrementContasBancariasController");
const autoIncrementMovimentoBanco = require("../middlewares/autoIncrementMovimentoBanco");

router.post(
  "/",
  autoIncrementContasBancariasController,
  contasBancariasController.adicionarContaBancaria
);
router.get(
  "/", 
  contasBancariasController.listarContasBancarias
);
router.get(
  "/saldoTotal", 
  contasBancariasController.saldoTotalContasBancarias
);
router.put(
  "/:id", 
  contasBancariasController.atualizarContaBancaria
);
router.delete(
  "/:id", 
  contasBancariasController.excluirContaBancaria
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
router.get(
  "/movimentacaoBanco",
  contasBancariasController.listaMovimentacaoContaBancaria
);

module.exports = router;
