const express = require("express");
const router = express.Router();
const saidasController = require("../controllers/saidasController");
const autoIncrementSaidas = require("../middlewares/autoIncrementSaidas");
const auth = require("../middlewares/auth");
const checkPermission = require("../middlewares/checkPermission");
const ProdutosController = require("../controllers/produtosController");

router.use(auth);

router.get(
  "/", 
  checkPermission("saida:ler"), 
  saidasController.getSaidas
);
router.get(
  "/produtos",
  checkPermission("saida:ler"),
  ProdutosController.getProdutos
);
router.get(
  "/:id", 
  checkPermission("saida:ler"), 
  saidasController.getSaidaById
);

router.post(
  "/",
  checkPermission("saida:criar"),
  autoIncrementSaidas,
  saidasController.createSaida
);

router.put(
  "/:id",
  checkPermission("saida:atualizar"),
  saidasController.updateSaida
);

module.exports = router;