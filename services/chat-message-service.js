const mongoose = require('mongoose');
const { ChatMessage } = require('@wallfair.io/wallfair-commons').models;
const { ForbiddenError, NotFoundError } = require('../util/error-handler');

const notificationTypes = {
  EVENT_START: 'Notification/EVENT_START',
  EVENT_RESOLVE: 'Notification/EVENT_RESOLVE',
  EVENT_CANCEL: 'Notification/EVENT_CANCEL',
  BET_STARTED: 'Notification/BET_STARTED',
  USER_AWARD: 'Notification/USER_AWARD',
};

exports.NotificationTypes = notificationTypes;

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

exports.createChatMessage = async (data) => ChatMessage.create(data);

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
