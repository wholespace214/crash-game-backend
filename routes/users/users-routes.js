// Import the express Router to create routes
const router = require("express").Router();

// Imports from express validator to validate user input
const { check } = require("express-validator");

// Import User Controller
const userController = require("../../controllers/users-controller");

//Login does register & login
router.post("/login", [check("phone").isMobilePhone()], userController.login);

router.post(
  "/verifyLogin",
  [
    check("phone").isMobilePhone(),
    check("smsToken").isNumeric().isLength({ min: 6, max: 6 }),
  ],
  userController.verfiySms
);

router.get("/getUsers", userController.getUsers);

router.get("/getLeaderboard/:skip/:limit", userController.getLeaderboard);

router.get("/confirm-email",
    [
    check("userId").isString(),
    check("code").isLength({ min: 6, max: 6 }),
], userController.confirmEmail);

module.exports = router;
