const express = require("express");
const router = express.Router();
const ProdutosController = require("../controllers/produtosController");
const autoIncrementProduto = require("../middlewares/autoIncrementProduto");
const auth = require("../middlewares/auth");
const checkPermission = require("../middlewares/checkPermission");
const gruposController = require("../controllers/gruposController");

router.use(auth);

router.get(
  "/produtos",
  checkPermission("produto:ler"),
  ProdutosController.getProdutos
);
router.get(
  "/grupos/ativos",
  checkPermission("produto:ler"),
  gruposController.getGruposAtivos
);
router.get(
  "/produtos/:id",
  checkPermission("produto:ler"),
  ProdutosController.getProdutosById
);
router.get(
  "/sicronizacao",
  checkPermission("produto:ler"),
  ProdutosController.syncProdutos
);

router.post(
  "/produtos",
  checkPermission("produto:criar"),
  autoIncrementProduto,
  ProdutosController.createProduto
);
router.post(
  "/produtosImportacao",
  checkPermission("produto:importar"),
  ProdutosController.importProdutosFromExcel
);
router.post(
  "/clientesImportacao",
  checkPermission("cliente:criar"),
  ProdutosController.importClientesFromExcel
);

router.put(
  "/produtos/:id",
  checkPermission("produto:atualizar"),
  ProdutosController.updateProduto
);

module.exports = router;
