const router = require('express').Router();
const notificationEventsController = require('../../controllers/notification-events-controller');

router.get(
  '/list',
  notificationEventsController.listNotificationEvents,
);

router.get(
  '/list/bets/:betId',
  notificationEventsController.listNotificationEventsByBet,
);

module.exports = router;
