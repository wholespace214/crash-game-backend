const mongoose = require('mongoose');
// Import ChatMessage model
const { ChatMessage } = require('@wallfair.io/wallfair-commons').models;

exports.getChatMessagesByEvent = async (eventId) => {
    return ChatMessage.find({ eventId });
};

exports.getNewestChatMessagesByEvent = async (eventId, limit = 100, skip = 0) => {
    return ChatMessage.aggregate([
        {
            $match: { eventId: mongoose.Types.ObjectId(eventId) },
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
                eventId: 1,
                type: 1,
                message: 1,
                date: 1,
                name: 1,
            },
        },
    ]);
};

exports.createChatMessage = async (data) => {
    return ChatMessage.create(data);
};

exports.saveChatMessage = async (chatMessage) => {
    return chatMessage.save();
};
