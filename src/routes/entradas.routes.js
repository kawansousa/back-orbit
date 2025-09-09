const express = require("express");
const router = express.Router();
const entradasController = require("../controllers/entradasController");
const autoIncrementEntradas = require("../middlewares/autoIncrementEntradas");
const auth = require("../middlewares/auth");
const checkPermission = require("../middlewares/checkPermission");
const ProdutosController = require("../controllers/produtosController");
const fornecedoresController = require("../controllers/fornecedorController");

router.use(auth);

router.get(
  "/", 
  checkPermission("entrada:ler"), 
  entradasController.getEntradas);
router.get(
  "/produtos",
  checkPermission("entrada:ler"),
  ProdutosController.getProdutos
);
router.get(
  "/fornecedores",
  checkPermission("entrada:ler"),
  fornecedoresController.getFornecedores
);
router.get(
  "/:id",
  checkPermission("entrada:ler"),
  entradasController.getEntradaById
);

router.post(
  "/",
  checkPermission("entrada:criar"),
  autoIncrementEntradas,
  entradasController.createEntrada
);

router.put(
  "/:id",
  checkPermission("entrada:atualizar"),
  entradasController.updateEntrada
);

module.exports = router;