// Import the express Router to create routes
const router = require("express").Router();

// Imports from express validator to validate user input
const { check } = require("express-validator");

// Import User Controller
const userController = require("../../controllers/users-controller");

router.post(
    "/saveAdditionalInformation",
    [
        check("name"),
        check("email").isEmail()
    ],
    userController.saveAdditionalInformation
);

module.exports = router;
