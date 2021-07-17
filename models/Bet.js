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
    reasonOfCancellation : {
        type: String,
        required: false,
        max: 1200,
    },
    evidenceDescription: {
        type: String,
        required: false,
        max: 1200,
    },
    evidenceActual: {
        type: String,
        required: false,
        max: 255,
    },
    date: {
        type: String,
        required: true,
        default: Date.now,
    },
    endDate: {
        type: String,
        required: false,
    },
    published: {
        type: Boolean,
        required: true,
        default: true,
    },
    resolved: {
        type: Boolean,
        required: false,
        default: false,
    },
    canceled: {
        type: Boolean,
        required: false,
        default: false,
    },
    activeNotificationSend: {
        type: Boolean,
        required: false,
        default: false,
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
    },
    status: {
        type: String,
        required: false,
        max: 255,
    }
});
module.exports = mongoose.model("Bet", betSchema);