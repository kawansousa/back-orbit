const express = require("express");
const router = express.Router();
const caixaController = require("../controllers/caixaController");
const autoIncrementCaixa = require("../middlewares/autoIncrementCaixa");
const autoIncrementMovimento = require("../middlewares/autoIncrementMovimento");
const auth = require("../middlewares/auth");
const checkPermission = require("../middlewares/checkPermission");
const dreController = require("../controllers/categoriaContabilController");

router.use(auth);

router.get(
  "/caixas",
  checkPermission("caixa:ler"),
  caixaController.listarCaixas
);
router.get(
  "/listarContas",
  checkPermission("caixa:ler"),
  dreController.listarContas
);
router.get(
  "/caixasDetalhes/:caixaId",
  checkPermission("caixa:detalhes"),
  caixaController.detalhesCaixa
);
router.get(
  "/todos-caixas",
  checkPermission("caixa:relatorio"),
  caixaController.listarTodosCaixas
);

router.post(
  "/caixa",
  checkPermission("caixa:abrir"),
  autoIncrementCaixa,
  caixaController.abrirCaixa
);
router.post(
  "/caixaRegistraMovimento",
  checkPermission("caixa:movimentar"),
  autoIncrementMovimento,
  caixaController.registrarMovimentacao
);
router.post(
  "/caixaFechamento",
  checkPermission("caixa:fechar"),
  caixaController.fecharCaixa
);

module.exports = router;
