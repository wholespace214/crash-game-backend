const mongoose = require("mongoose");

const Outcome = new mongoose.Schema({
    index: Number,
    name: String,
});

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
    outcomes: [{
        type: Outcome
    }],
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
        ref: 'User',
        required: true,
    },
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true,
    }
});
module.exports = mongoose.model("Bet", betSchema);
