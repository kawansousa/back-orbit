const express = require("express");
const router = express.Router();
const PagarController = require("../controllers/pagarController");

router.post("/", PagarController.criarPagar);
router.get("/", PagarController.listarPagamentos);

module.exports = router;