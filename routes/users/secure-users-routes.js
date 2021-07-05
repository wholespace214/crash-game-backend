// Import the express Router to create routes
const router = require("express").Router();

// Imports from express validator to validate user input
const { check } = require("express-validator");

// Import User Controller
const userController = require("../../controllers/users-controller");

router.post(
  "/saveAdditionalInformation",
  [check("name").notEmpty(), check("email").isEmail(), check("username").notEmpty()],
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

router.get(
    "/open-bets",
    userController.getOpenBetsList
);

router.get(
    "/closed-bets",
    userController.getClosedBetsList
);

router.get(
    "/transactions",
    userController.getTransactions
)

router.get(
    "/history",
    userController.getAMMHistory
)

router.get(
    "/resend-confirm",
    userController.resendConfirmEmail
)


router.get("/:userId", userController.getUserInfo);

module.exports = router;
