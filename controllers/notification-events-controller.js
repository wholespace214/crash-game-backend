const notificationEventsService = require('../services/notification-events-service');

exports.listNotificationEvents = async (req, res) => {
  const { limit, cat } = req.query;
  const eventList = await notificationEventsService.listNotificationEvents(limit, cat);
  res.status(200).json(eventList);
};
