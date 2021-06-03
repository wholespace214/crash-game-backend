// Import the express Router to create routes
const router = require("express").Router();

// Imports from express validator to validate user input
const { check } = require("express-validator");

// Import User Controller
const userController = require("../../controllers/users-controller");

router.post(
  "/saveAdditionalInformation",
  [check("name"), check("email").isEmail()],
  userController.saveAdditionalInformation
);

router.post(
  "/acceptConditions",
  [check("conditions").isArray({ min: 3, max: 3 })],
  userController.saveAcceptConditions
);

router.get(
    "/refList",
    userController.getRefList
);

router.get("/:userId", userController.getUserInfo);

module.exports = router;
