const express = require("express");
const router = express.Router();
const autoIncrementFornecedor = require("../middlewares/autoIncrementFornecedor");
const fornecedoresController = require("../controllers/fornecedorController");
const auth = require("../middlewares/auth");
const checkPermission = require("../middlewares/checkPermission");

router.use(auth);

router.get(
  "/fornecedores",
  checkPermission("fornecedor:ler"),
  fornecedoresController.getFornecedores
);
router.get(
  "/fornecedor/:id",
  checkPermission("fornecedor:ler"),
  fornecedoresController.getfornecedorById
);

router.post(
  "/fornecedor",
  checkPermission("fornecedor:criar"),
  autoIncrementFornecedor,
  fornecedoresController.createFornecedor
);

router.put(
  "/fornecedor/:id",
  checkPermission("fornecedor:atualizar"),
  fornecedoresController.updateFornecedor
);

router.delete(
  "/fornecedor/:id",
  checkPermission("fornecedor:deletar"),
  fornecedoresController.deleteFornecedor
);

module.exports = router;