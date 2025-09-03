const express = require("express");
const router = express.Router();
const cidadesController = require("../controllers/cidadesController");
const auth = require("../middlewares/auth");
const checkPermission = require("../middlewares/checkPermission");

router.use(auth);

router.get(
  "/cidades",
  checkPermission("cidade:ler"),
  cidadesController.getCidades
);
router.get(
  "/cidade/:id",
  checkPermission("cidade:ler"),
  cidadesController.getCidadesById
);

module.exports = router;
