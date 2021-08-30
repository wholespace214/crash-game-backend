const mongoose = require("mongoose");

const Outcome = new mongoose.Schema({
    index: Number,
    name: String,
});

/*const Metadata = new mongoose.Schema({
    key: {
        type: String,
        enum: ['twitch_id', 'twitch_synced', 'twitch_login', 'twitch_name', 'twitch_game_id', 'twitch_game_name', 'twitch_channel_title']
    },
    name: String,
});*/

const Metadata = new mongoose.Schema({
    'twitch_id': String, 
    'twitch_synced': String, 
    'twitch_login': String, 
    'twitch_name':String, 
    'twitch_game_id': String, 
    'twitch_game_name': String, 
    'twitch_channel_title': String
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
    streamUrl: {
        type: String,
        required: true,
        max: 500,
    },
    previewImageUrl: {
        type: String,
        required: true,
        max: 255,
    },
    tags: [{
        name: String
    }],
    type: {
        type: String,
        required: true,
        enum: ['streamed', 'non-streamed']
    },
    category: {
        type: String,
        required: true,
    },
    metadata: {
        type: Metadata
    },
    date: {
        type: Date,
        required: true,
        default: Date.now,
    },
    betTemplate: this.BetTemplate,
    bets: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bet'
    }]
});

module.exports = mongoose.model("Event", eventSchema);
