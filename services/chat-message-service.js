const mongoose = require('mongoose');
const WebPurify = require('webpurify');
const { ChatMessage } = require('@wallfair.io/wallfair-commons').models;
const { ForbiddenError, NotFoundError } = require('../util/error-handler');

const profanityReplacement = '****';
exports.profanityReplacement = profanityReplacement;

const webPurify = process.env.PROFANITY_FILTER_API_KEY && new WebPurify({
  api_key: process.env.PROFANITY_FILTER_API_KEY,
  endpoint: 'eu',
  enterprise: true,
});
if (webPurify == null) {
  console.log('Profanity filter key not found. Profanity filter disabled');
}

const notificationTypes = {
  EVENT_START: 'Notification/EVENT_START',
  EVENT_RESOLVE: 'Notification/EVENT_RESOLVE',
  EVENT_CANCEL: 'Notification/EVENT_CANCEL',
  BET_STARTED: 'Notification/BET_STARTED',
  USER_AWARD: 'Notification/USER_AWARD',
};

exports.NotificationTypes = notificationTypes;

exports.getChatMessagesByEvent = async (eventId) => ChatMessage.find({ roomId: eventId });

exports.getLatestChatMessagesByRoom = async (roomId, limit = 100, skip = 0) =>
  ChatMessage.aggregate([
    {
      $match: { roomId: mongoose.Types.ObjectId(roomId) },
    },
    { $sort: { date: -1 } },
    {
      $lookup: {
        localField: 'userId',
        from: 'users',
        foreignField: '_id',
        as: 'user',
      },
    },
    {
      $facet: {
        total: [
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
            },
          },
        ],
        data: [
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              userId: 1,
              roomId: 1,
              type: 1,
              message: 1,
              date: 1,
              user: {
                $let: {
                  vars: {
                    userMatch: {
                      $arrayElemAt: ['$user', 0],
                    },
                  },
                  in: {
                    username: '$$userMatch.username',
                    name: '$$userMatch.name',
                    profilePicture: '$$userMatch.profilePicture',
                  },
                },
              },
            },
          },
        ],
      },
    },
    { $unwind: '$total' },
    {
      $project: {
        total: '$total.count',
        data: '$data',
      },
    },
  ])
    .exec()
    .then((items) => items[0]);

async function profanityFilter(data) {
  if (!webPurify) {
    return data;
  }

  const parsed = await webPurify.replace(data.message, profanityReplacement);
  if (parsed !== data.message) {
    console.debug(`Profanity filter. Replaced '${data.message}' with ${parsed}`);
  }
  return {
    ...data,
    message: parsed,
  };
}
exports.profanityFilter = profanityFilter;

exports.createChatMessage = async (data) => {
  const parsed = await profanityFilter(data);
  console.log('chatemessage create', parsed);
  return ChatMessage.create(parsed);
};

exports.saveChatMessage = async (chatMessage) => chatMessage.save();

exports.getLatestChatMessagesByUserId = async (userId, limit = 100, skip = 0) =>
  ChatMessage.aggregate([
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId),
        read: { $exists: false },
        type: { $in: Object.values(notificationTypes) },
      },
    },
    { $sort: { date: -1 } },
    {
      $facet: {
        total: [
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
            },
          },
        ],
        data: [
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              userId: 1,
              roomId: 1,
              type: 1,
              message: 1,
              date: 1,
              payload: 1,
            },
          },
        ],
      },
    },
    { $unwind: '$total' },
    {
      $project: {
        total: '$total.count',
        data: '$data',
      },
    },
  ])
    .exec()
    .then((items) => items[0]);

exports.setMessageRead = async (messageId, requestingUser) => {
  const message = await ChatMessage.findById(messageId);
  if (!message) {
    throw new NotFoundError();
  }
  if (!requestingUser?.admin && message.userId.toString() !== requestingUser._id.toString()) {
    throw new ForbiddenError();
  }
  message.read = new Date();
  await message.save(message);
};
