// Import the express Router to create routes
const router = require("express").Router();

// Import User Controller
const userController = require("../../controllers/users-controller");

router.post("/signup", userController.signup);

module.exports = router;
