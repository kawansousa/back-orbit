const express = require("express");
const router = express.Router();
const autoIncrementCliente = require("../middlewares/autoIncrementCliente");
const ClientesController = require("../controllers/clientesController");
const auth = require("../middlewares/auth");
const checkPermission = require("../middlewares/checkPermission");

router.use(auth);

router.get(
  "/clientes",
  checkPermission("cliente:ler"),
  ClientesController.getClientes
);
router.get(
  "/cliente/:id",
  checkPermission("cliente:ler"),
  ClientesController.getClientesById
);

router.post(
  "/clientes",
  checkPermission("cliente:criar"),
  autoIncrementCliente,
  ClientesController.createCliente
);

router.put(
  "/cliente/:id",
  checkPermission("cliente:atualizar"),
  ClientesController.updateCliente
);

router.delete(
  "/cliente/:id",
  checkPermission("cliente:deletar"),
  ClientesController.deleteCliente
);

module.exports = router;
