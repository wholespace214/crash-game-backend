const mongoose = require("mongoose");

const Outcome = new mongoose.Schema({
    index: Number,
    name: String,
});

exports.BetTemplate = new mongoose.Schema({
    betDuration: {
        type: Number,
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    marketQuestion: {
        type: String,
        max: 255,
    },
    description: {
        type: String,
        max: 1200,
    },
    hot: {
        type: Boolean,
    },
    outcomes: [{
        type: Outcome
    }],
});

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
    betTemplate: this.BetTemplate,
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
    }],
    type: {
        type: String,
        required: true,
        enum: ['streamed', 'non-streamed', 'game']
    },
    category: {
        type: String,
        required: true,
        enum: ['streamed-esports', 'streamed-shooter', 'streamed-mmorpg', 'streamed-other', 'sports', 'politics', 'crypto', 'celebrities', 'other']
    }
});

module.exports = mongoose.model("Event", eventSchema);
