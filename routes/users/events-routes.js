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
        check("name"),
        check("tags"),
        check("streamUrl"),
        check("previewImageUrl"),
    ],
    eventController.createEvent
);

router.post(
    "/bet/create",
    [
        check("eventId"),
        check("marketQuestion"),
        check("hot"),
        check("betOne"),
        check("betTwo"),
        check("endDate")
    ],
    eventController.createBet
);

router.post(
    "/bet/:id/place",
    [
        check("amount").isNumeric(),
        check("isOutcomeOne").isBoolean(),
        check("minOutcomeTokens").isNumeric().default(0)
    ],
    eventController.placeBet
);

router.post(
    "/bet/:id/backout",
    [
        check("amount").isNumeric(),
        check("isOutcomeOne").isBoolean(),
        check("maxOutcomeTokens").isNumeric().default(Number.MAX_SAFE_INTEGER)
    ],
    eventController.pullOutBet
);

router.post(
    "/bet/:id/outcomes",
    [
        check("amount").isNumeric()
    ],
    eventController.calculateOutcome
);

router.get(
    "/bet/:id/payout",
    eventController.payoutBet
);

module.exports = router;
