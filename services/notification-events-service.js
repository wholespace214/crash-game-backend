const _ = require('lodash');
const mongoose = require("mongoose");
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
  `Notification/EVENT_USER_SIGNED_UP`,
  'Notification/EVENT_USER_REWARD',
  'Notification/EVENT_USER_UPLOADED_PICTURE',
  'Notification/EVENT_USER_CHANGED_USERNAME',
  'Notification/EVENT_USER_CHANGED_NAME',
  'Notification/EVENT_USER_CHANGED_ABOUT_ME'
]

const elonGameCategory = [
  'Casino/CASINO_PLACE_BET',
  'Casino/CASINO_CASHOUT',
  'Casino/EVENT_CASINO_LOST'
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

exports.listNotificationEventsByBet = async (limit = 10, betId) => {
  let selectedCat = _.get(categories, "bets", []);

  return UniversalEvent.find({
    'data.bet._id': mongoose.Types.ObjectId(betId)
  }).where('type').in(selectedCat).sort('-createdAt').limit(+limit);
}

exports.listNotificationEventsByUser = async (limit = 10, userId) => {
  let selectedCat = _.get(categories, "users", []);

  return UniversalEvent.find({
    'performedBy': 'user',
    'userId': userId
  }).where('type').in(selectedCat).sort('-createdAt').limit(+limit);
}

exports.updateUserData = async (filter, data) => {
  return UniversalEvent.updateMany(
    filter,
    {
      $set: data,
    },
  );
}
