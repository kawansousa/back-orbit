const express = require("express");
const router = express.Router();
const osController = require("../controllers/osController");
const autoIncrementOs = require("../middlewares/autoIncrementOs");
const autoIncrementreceber = require("../middlewares/autoIncrementreceber");
const autoIncrementMovimento = require("../middlewares/autoIncrementMovimento");

// Criar novo Cliente com middleware
router.get("/os", osController.listaOs);
router.post(
  "/os",
  autoIncrementOs,
  autoIncrementMovimento,
  autoIncrementreceber,
  osController.createOs
);
router.get("/os/:id", autoIncrementreceber, osController.getOsById);
router.patch(
  "/updateOs",
  autoIncrementMovimento,
  autoIncrementreceber,
  osController.updateOs
);
router.delete("/os/:id", osController.deleteOs);
router.get("/osPdf/:id", osController.generateOsPDF);

module.exports = router;
