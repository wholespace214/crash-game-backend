const mongoose = require("mongoose");

const betSchema = new mongoose.Schema({
    marketQuestion: {
        type: String,
        required: true,
        max: 255,
    },
    description: {
        type: String,
        required: false,
        max: 1200,
    },
    hot: {
        type: Boolean,
        required: false
    },
    betOne: {
        type: String,
        required: true,
        max: 255,
    },
    betTwo: {
        type: String,
        required: true,
        max: 255,
    },
    finalOutcome: {
        type: String,
        required: false,
        max: 255,
    },
    date: {
        type: Date,
        required: true,
        default: Date.now,
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event'
    }
});
module.exports = mongoose.model("Bet", betSchema);
