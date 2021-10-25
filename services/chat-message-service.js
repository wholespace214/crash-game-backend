const mongoose = require('mongoose');
// Import ChatMessage model
const { ChatMessage } = require('@wallfair.io/wallfair-commons').models;

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
              count: { $sum: 1 }
            }
          }
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
          }
        ]
      }
    },
    { $unwind: "$total" },
    {
      $project: {
        total: "$total.count",
        data: "$data",
      },
    },
  ]).exec().then(items => items[0]);
