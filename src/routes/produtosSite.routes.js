const express = require("express");
const router = express.Router();
const ProdutosSercice = require("../services/produtosService");

router.get("/site", ProdutosSercice.getProdutos);

module.exports = router;
