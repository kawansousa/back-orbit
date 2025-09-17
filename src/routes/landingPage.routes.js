const express = require("express")
const router = express.Router()
const LandingPageController = require("../controllers/landingPageController")

router.get(
  "/",
  LandingPageController.getLandingPage
)

router.post(
  "/",
  LandingPageController.createLadingPage
)

module.exports = router