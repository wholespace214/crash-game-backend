const mongoose = require('mongoose');
const axios = require('axios');
const { ChatMessage } = require('@wallfair.io/wallfair-commons').models;
const notificationsTypes = require('@wallfair.io/wallfair-commons').constants.events.notification;
const { ForbiddenError, NotFoundError } = require('../util/error-handler');

const profanityReplacement = '*';
exports.profanityReplacement = profanityReplacement;

exports.getChatMessagesByEvent = async (eventId) => ChatMessage.find({ roomId: eventId });

exports.getLatestChatMessagesByRoom = async (roomId, limit = 100, skip = 0) =>
  ChatMessage.aggregate([
    {
      $match: { roomId: roomId },
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


async function replaceProfanity(text) {
  return axios.get('http://api1.webpurify.com/services/rest/', {
    params: {
      method: 'webpurify.live.replace',
      api_key: process.env.PROFANITY_FILTER_API_KEY,
      text,
      replacesymbol: profanityReplacement,
      format: 'json',
      lang: 'en,de,ru' // check english, german and russian
    },
  }).then(x => x.data?.rsp.text);
}

async function profanityFilter(data) {
  if (!process.env.PROFANITY_FILTER_API_KEY) {
    return data;
  }

  const parsed = await replaceProfanity(data.message);
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
        type: { $in: Object.values(notificationsTypes) },
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
