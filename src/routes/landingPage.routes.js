const express = require("express")
const router = express.Router()
const LandingPageController = require("../controllers/landingPageController")

router.get(
  "/",
  LandingPageController.getLandingPageByUrl
)
router.get(
  "/existing",
  LandingPageController.getLandingPageByEnterprise
)

router.post(
  "/",
  LandingPageController.createLadingPage
)

router.patch(
  "/:id",
  LandingPageController.updateLandingPage
)

module.exports = router