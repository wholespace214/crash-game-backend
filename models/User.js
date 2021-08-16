const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    max: 255,
  },
  name: {
    type: String,
    required: false,
    max: 128,
    min: 2,
  },
  username: {
    type: String,
    required: false,
    max: 128,
    min: 2,
  },
  email: {
    type: String,
    required: false,
    max: 128,
    min: 2,
  },
  walletAddress: {
    type: String,
    required: false,
    max: 42,
    min: 42
  },
  profilePictureUrl: {
    type: String,
    required: false,
    max: 128,
    min: 2
  },
  password: {
    type: String,
    required: false,
    max: 128,
    min: 8,
  },
  ref: {
    type: String,
    required: false,
  },
  openBets: {
    type: [Object],
    required: true,
    default: [],
  },
  closedBets: {
    type: [Object],
    required: true,
    default: [],
  },
  confirmed: {
    type: Boolean,
    required: true,
    default: false,
  },
  admin: {
    type: Boolean,
    required: true,
    default: false,
  },
  emailConfirmed: {
    type: Boolean,
    required: true,
    default: false,
  },
  emailCode: {
    type: String,
    required: false,
    max: 6,
    min: 6,
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  amountWon: {
    type: Number,
    required: false,
    default: 0
  }
});

module.exports = mongoose.model("User", userSchema);
