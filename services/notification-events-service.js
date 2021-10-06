const _ = require('lodash');
const { UniversalEvent } = require('@wallfair.io/wallfair-commons').models;

//@todo now only already handled frontend events, we plan to extend this list soon
// 'Notification/EVENT_UPDATED',
// 'Notification/EVENT_BET_STARTED',
// 'Notification/EVENT_BET_EVALUATED',
// 'Notification/EVENT_BET_DISPUTED',
// 'Notification/EVENT_START', // Deprecated in favor of EVENT_USER_REWARD
// 'Notification/EVENT_RESOLVE', // Deprecated in favor of EVENT_USER_REWARD
// 'Notification/EVENT_CANCEL', // Deprecated in favor of EVENT_USER_REWARD
// 'Notification/EVENT_NEW_REWARD', // Deprecated in favor of EVENT_USER_REWARD
const betsCategory = [
  'Notification/EVENT_ONLINE',
  'Notification/EVENT_OFFLINE',
  'Notification/EVENT_NEW',
  'Notification/EVENT_NEW_BET',
  'Notification/EVENT_BET_PLACED',
  'Notification/EVENT_BET_CASHED_OUT',
  'Notification/EVENT_BET_RESOLVED',
  'Notification/EVENT_BET_CANCELED'
]

// `Notification/EVENT_USER_SIGNED_IN`,
// `Notification/EVENT_USER_SIGNED_UP`,
// `Notification/EVENT_USER_FORGOT_PASSWORD`,
// `Notification/EVENT_USER_UPLOADED_PICTURE`,
// `Notification/EVENT_USER_CHANGED_USERNAME`,
// `Notification/EVENT_USER_CHANGED_NAME`,
// `Notification/EVENT_USER_CHANGED_PASSWORD`,
// `Notification/EVENT_USER_UPDATED_EMAIL_PREFERENCES`,
// `Notification/EVENT_USER_SET_CURRENCY`,
const usersCategory = [
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
