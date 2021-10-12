const notificationEventsService = require('../services/notification-events-service');

exports.listNotificationEvents = async (req, res) => {
  const {limit, cat} = req.query;
  const eventList = await notificationEventsService.listNotificationEvents(limit, cat);
  res.status(200).json(eventList);
};

exports.listNotificationEventsByBet = async (req, res) => {
  const {limit} = req.query;
  const {betId} = req.params;

  const eventList = await notificationEventsService.listNotificationEventsByBet(limit, betId);
  res.status(200).json(eventList);
};
