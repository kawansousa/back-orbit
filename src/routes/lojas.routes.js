const express = require("express");
const router = express.Router();
const lojasController = require("../controllers/lojasController");
const incrementarCodigos = require("../middlewares/incrementarCodigos");

router.post("/", incrementarCodigos, lojasController.createLoja);
router.post("/empresa", incrementarCodigos, lojasController.createEmpresa);
module.exports = router;
