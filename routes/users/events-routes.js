// Import the express Router to create routes
const router = require("express").Router();
const { check } = require("express-validator");
const eventController = require("../../controllers/events-controller");

router.get(
    "/list",
    eventController.listEvents
);

router.get(
    "/chat-messages/:id",
    [
        check("id").notEmpty()
    ],
    eventController.getChatMessagesByEventId
);

module.exports = router;