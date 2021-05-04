// Import the express Router to create routes
const router = require("express").Router();

// Imports from express validator to validate user input
const { check } = require("express-validator");

// Import User Controller
const eventController = require("../../controllers/events-controller");

//Login does register & login
router.get(
    "/list",
    eventController.listEvents
);

router.get(
    "/get/:id",
    [
        check("id").notEmpty()
    ],
    eventController.getEvent
);

router.post(
    "/create",
    [
        check("title"),
        check("liveMode"),
        check("endDate"),
        check("liveStreamUrl"),
    ],
    eventController.createEvent
);

module.exports = router;
