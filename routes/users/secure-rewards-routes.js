// Import the express Router to create routes
const router = require("express").Router();

// Imports from express validator to validate user input
const { check } = require("express-validator");

// Import controllers
const rewardsController = require("../../controllers/rewards-controller");

router.get(
  "/questions",
  [],
  rewardsController.getQuestions
);

router.post(
  "/answer",
  [],
  rewardsController.postRewardAnswer
);

module.exports = router;
