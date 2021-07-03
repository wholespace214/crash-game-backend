const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event'
    },
    type: {
        type: String,
        required: false,
        max: 256,
    },
    message: {
        type: String,
        required: true,
        max: 1200,
    },
    date: {
        type: Date,
        required: true,
        default: Date.now,
    }
});
module.exports = mongoose.model("ChatMessage", chatMessageSchema);
