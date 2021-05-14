const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        max: 255,
    },
    endDate: {
        type: Date,
        required: true
    },
    liveStreamUrl: {
        type: String,
        required: false,
        max: 2048,
    },
    date: {
        type: Date,
        required: true,
        default: Date.now,
    },
    events: [{
        text: String,
        linkedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Event'
        }
    }]
});

module.exports = mongoose.model("Event", userSchema);
