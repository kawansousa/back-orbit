const express = require("express");
const router = express.Router();
const dreController = require("../controllers/categoriaContabilController");
const auth = require("../middlewares/auth");
const checkPermission = require("../middlewares/checkPermission");

router.use(auth);

router.get(
  "/listarContas",
  checkPermission("dre:ler"),
  dreController.listarContas
);
router.get("/drePdf", checkPermission("dre:pdf"), dreController.generateDREPDF);

router.post(
  "/adicionarConta",
  checkPermission("dre:ler"),
  dreController.adicionarConta
);

router.put(
  "/atualizarConta",
  checkPermission("dre:ler"),
  dreController.atualizarConta
);

router.delete(
  "/excluirConta",
  checkPermission("dre:ler"),
  dreController.excluirConta
);

module.exports = router;
