const express = require("express");
const router = express.Router();
const osController = require("../controllers/osController");
const autoIncrementOs = require("../middlewares/autoIncrementOs");

// Criar novo Cliente com middleware
router.get("/os", osController.listaOs);
router.post("/os", autoIncrementOs, osController.createOs);
router.get("/os/:id", osController.getOsById);
router.put("/os/:id", osController.updateOs);
router.delete("/os/:id", osController.deleteOs);
router.get("/osPdf/:id", osController.generateOsPDF);

module.exports = router;
