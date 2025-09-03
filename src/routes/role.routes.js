const express = require("express");
const router = express.Router();
const roleController = require("../controllers/roleController");
const auth = require("../middlewares/auth");
const checkPermission = require("../middlewares/checkPermission");

router.use(auth);

router.get(
  "/", 
  checkPermission("role:ler"), 
  roleController.getRoles
);

router.post(
  "/", 
  checkPermission("role:criar"), 
  roleController.createRole
);

router.put(
  "/:id",
  checkPermission("role:atualizar"),
  roleController.updateRole
);

router.delete(
  "/:id",
  checkPermission("role:deletar"),
  roleController.deleteRole
);

module.exports = router;