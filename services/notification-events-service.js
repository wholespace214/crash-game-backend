const _ = require('lodash');
const { UniversalEvent } = require('@wallfair.io/wallfair-commons').models;

const betsCategory = [
  'Notification/EVENT_ONLINE',
  'Notification/EVENT_OFFLINE',
  'Notification/EVENT_NEW',
  'Notification/EVENT_NEW_BET',
  'Notification/EVENT_BET_PLACED',
  'Notification/EVENT_BET_CASHED_OUT',
  'Notification/EVENT_BET_RESOLVED',
  'Notification/EVENT_BET_CANCELED',
  'Notification/EVENT_BET_EVALUATED'
]

const usersCategory = [
  `Notification/EVENT_USER_SIGNED_IN`,
  `Notification/EVENT_USER_SIGNED_UP`,
  'Notification/EVENT_USER_REWARD'
]

const elonGameCategory = [
  'Casino/CASINO_PLACE_BET',
  'Casino/CASINO_CASHOUT'
]

const categories = {
  'all': [...betsCategory, ...usersCategory, ...elonGameCategory],
  'bets': betsCategory,
  'users': usersCategory,
  'elongame': elonGameCategory
}

exports.listNotificationEvents = async (limit = 10, cat) => {
  let selectedCat = _.get(categories, cat, []);

  if(!cat) {
    selectedCat = categories.all;
  }

  return UniversalEvent.find({}).where('type').in(selectedCat).sort('-createdAt').limit(+limit);
}
