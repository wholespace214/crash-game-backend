// Import ChatMessage model
const ChatMessage = require("../models/ChatMessage");

exports.getChatMessagesByEvent = async (eventId) => {
    return ChatMessage.find({eventId});
};

exports.createChatMessage = async (data) => {
    return ChatMessage.create(data)
}

exports.saveChatMessage = async (chatMessage) => {
    return chatMessage.save();
}