const { UniversalEvent } = require('@wallfair.io/wallfair-commons').models;

const broadcastedEvents = [
  'Notification/EVENT_USER_REWARD',
  'Notification/EVENT_ONLINE',
  'Notification/EVENT_OFFLINE',
  'Notification/EVENT_NEW',
  'Notification/EVENT_NEW_BET ',
  'Notification/EVENT_BET_PLACED',
  'Notification/EVENT_BET_CASHED_OUT',
  'Notification/EVENT_BET_RESOLVED',
  'Notification/EVENT_BET_CANCELED',
  'Casino/CASINO_PLACE_BET',
  'Casino/CASINO_CASHOUT',
]

exports.listNotificationEvents = async (limit = 10) => {
  return UniversalEvent.find({}).where('type').in(broadcastedEvents).sort('-createdAt').limit(+limit);
}
