const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    max: 255,
  },
  password: {
    type: String,
    required: true,
    max: 1024,
    min: 8,
  },
  coins: {
    type: Number,
    required: true,
    default: 10000,
  },
  openBets: {
    type: Array,
    required: true,
    default: [],
  },
  closedBets: {
    type: Array,
    required: true,
    default: [],
  },
  confirmed: {
    type: Boolean,
    required: true,
    default: true,
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

module.exports = mongoose.model("User", userSchema);
