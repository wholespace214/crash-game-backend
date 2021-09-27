const router = require('express').Router();
const notificationEventsController = require('../../controllers/notification-events-controller');

router.get(
  '/list',
  notificationEventsController.listNotificationEvents,
);

module.exports = router;
