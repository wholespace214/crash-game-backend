// Import User and Bet models
const { User, Bet } = require('@wallfair.io/wallfair-commons').models;
const websocketService = require('../services/websocket-service');

const betsActiveNotification = async () => {
  const now = new Date();
  const nowPlus1Min = new Date(+now + 60_000);
  const users = await User.find({}, { id: 1, phone: 1 }).exec();

  const bets = await Bet.find(
    { date: { $gt: now, $lt: nowPlus1Min }, activeNotificationSend: { $ne: true } },
    {}
  )
    .populate('event')
    .exec();

  for (const bet of bets) {
    // console.log(bet);

    for (const user of users) {
      websocketService.emitEventStartNotification(user.id, bet.event.id, bet.event.name);

      bet.activeNotificationSend = true;
      await bet.save();
    }
  }
};

const initBetsJobs = () => {
  setInterval(betsActiveNotification, 1_000);
};

exports.initBetsJobs = initBetsJobs;
