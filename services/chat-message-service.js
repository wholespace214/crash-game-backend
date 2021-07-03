// Import ChatMessage model
const ChatMessage = require("../models/ChatMessage");

exports.getChatMessagesByEvent = async (eventId) => {
    return ChatMessage.find({eventId});
};

exports.getNewestChatMessagesByEvent = async (eventId, limit=100, skip=0) => {
    return ChatMessage.find({eventId}, null, {sort: {date: -1}, limit, skip});
};

exports.createChatMessage = async (data) => {
    return ChatMessage.create(data)
}

exports.saveChatMessage = async (chatMessage) => {
    return chatMessage.save();
}