const express = require("express")
const router = express.Router()
const GruposService = require("../services/gruposServices")

router.get(
  "/",
  GruposService.getGruposAtivos,
)

module.exports = router;