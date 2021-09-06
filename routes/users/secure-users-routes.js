// Import the express Router to create routes
const router = require("express").Router();

// Imports from express validator to validate user input
const { check, oneOf } = require("express-validator");

// Import User Controller
const userController = require("../../controllers/users-controller");

router.post(
  "/bindWalletAddress",
  [check("walletAddress").notEmpty()],
  userController.bindWalletAddress
);

router.post(
  "/saveAdditionalInformation",
  oneOf([
    [
      check("name").notEmpty(),
      check("username").notEmpty(),
      check("username").isLength({ min: 3 }),
      check("name").isLength({ min: 3 }),
    ],
    check("email").isEmail(),
  ]),
  userController.saveAdditionalInformation
);

router.post(
  "/acceptConditions",
  [check("conditions").isArray({ min: 3, max: 3 })],
  userController.saveAcceptConditions
);

router.get("/refList", userController.getRefList);

router.get("/open-bets", userController.getOpenBetsList);

router.get("/closed-bets", userController.getClosedBetsList);

router.get("/transactions", userController.getTransactions);

router.get("/history", userController.getAMMHistory);

router.get("/resend-confirm", userController.resendConfirmEmail);

router.patch("/:userId", userController.updateUser);

router.get("/:userId", userController.getUserInfo);

module.exports = router;
