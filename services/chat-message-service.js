const mongoose = require('mongoose');
// Import ChatMessage model
const { ChatMessage } = require('@wallfair.io/wallfair-commons').models;

exports.getChatMessagesByEvent = async (eventId) => ChatMessage.find({ roomId: eventId });

exports.getLatestChatMessagesByRoom = async (roomId, limit = 100, skip = 0) =>
  ChatMessage.aggregate([
    {
      $match: { roomId: mongoose.Types.ObjectId(roomId) },
    },
    { $sort: { date: -1 } },
    { $limit: limit },
    { $skip: skip },
    {
      $lookup: {
        localField: 'userId',
        from: 'users',
        foreignField: '_id',
        as: 'user',
      },
    },
    {
      $replaceRoot: {
        newRoot: {
          $mergeObjects: [
            {
              $arrayElemAt: ['$user', 0],
            },
            '$$ROOT',
          ],
        },
      },
    },
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
              profilePictureUrl: '$$userMatch.profilePictureUrl',
            },
          },
        },
      },
    },
  ]);

exports.createChatMessage = async (data) => ChatMessage.create(data);

exports.saveChatMessage = async (chatMessage) => chatMessage.save();
