// Import User and Bet models
const { Bet } = require('@wallfair.io/wallfair-commons').models;
const { notificationEvents } = require('@wallfair.io/wallfair-commons/constants/eventTypes');
const amqp = require('../services/amqp-service');

const betsActiveNotification = async () => {
  const now = new Date();
  const nowPlus1Min = new Date(+now + 60_000);

  const bets = await Bet.find(
    { date: { $gt: now, $lt: nowPlus1Min }, activeNotificationSend: { $ne: true } },
    {}
  )
    .populate('event')
    .exec();

  for (const bet of bets) {
    bet.activeNotificationSend = true;
    await bet.save();

    amqp.send('universal_events', 'event.bet_started', JSON.stringify({
      event: notificationEvents.EVENT_BET_STARTED,
      producer: 'system',
      producerId: 'notification-service',
      data: { bet },
      date: Date.now(),
      broadcast: true
    }));
  }
};

const initBetsJobs = () => {
  setInterval(betsActiveNotification, 1_000);
};

exports.initBetsJobs = initBetsJobs;