const express = require("express");
const router = express.Router();
const userController = require("../controllers/usuarioController");
const auth = require("../middlewares/auth");
const checkPermission = require("../middlewares/checkPermission");
const roleController = require("../controllers/roleController");

// ─── Rotas públicas (sem auth) ──────────────────────────────
router.post("/login", userController.loginUser);
router.post("/refresh-token", userController.refreshToken);
router.post("/logout", userController.logout);

// ─── Rotas protegidas ───────────────────────────────────────
router.use(auth);

router.post("/logout-all", userController.logoutAll);

router.get(
  "/", 
  checkPermission("usuario:ler"), 
  userController.getUsers);

router.get(
  "/", 
  checkPermission("usuario:ler"), 
  roleController.getRoles
);
router.get(
  "/:id", 
  checkPermission("usuario:ler"), 
  userController.getUserById
);

router.post(
  "/", 
  checkPermission("usuario:criar"), 
  userController.createUser
);

router.put(
  "/:id",
  checkPermission("usuario:atualizar"),
  userController.updateUser
);

router.patch(
  "/inativar",
  checkPermission("usuario:inativar"),
  userController.inactiveUser
);

module.exports = router;