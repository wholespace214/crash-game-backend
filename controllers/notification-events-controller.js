const notificationEventsService = require('../services/notification-events-service');

exports.listNotificationEvents = async (req, res) => {
  const { limit } = req.query;
  const eventList = await notificationEventsService.listNotificationEvents(limit);
  res.status(200).json(eventList);
};
