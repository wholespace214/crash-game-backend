const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        max: 255,
    },
    previewImageUrl: {
            type: String,
            required: true,
            max: 255,
    },
    streamUrl: {
        type: String,
        required: true,
        max: 500,
    },
    tags: [
        {
            name: String
        }
        ],
    date: {
        type: Date,
        required: true,
        default: Date.now,
    },
    bets: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bet'
    }]
});

module.exports = mongoose.model("Event", eventSchema);
