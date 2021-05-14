// Import the express Router to create routes
const router = require("express").Router();

// Imports from express validator to validate user input
const { check } = require("express-validator");

// Import User Controller
const streamController = require("../../controllers/streams-controller");

//Login does register & login
router.get(
    "/list",
    streamController.listStreams
);

router.get(
    "/get/:id",
    [
        check("id").notEmpty()
    ],
    streamController.getStream
);

router.post(
    "/create",
    [
        check("title"),
        check("liveMode"),
        check("endDate"),
        check("liveStreamUrl"),
    ],
    streamController.createStream
);

module.exports = router;
