const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        max: 255,
    },
    liveMode: {
      type: Boolean,
      required: true
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
});

module.exports = mongoose.model("Event", userSchema);
