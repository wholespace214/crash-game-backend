// Import Event model
const Reward = require("../models/Reward");

exports.listRewards = async () => {
    return Reward.find();
};

exports.getReward = async (id) => {
    return Reward.findOne({ _id: id });
};

exports.saveReward = async (reward) => {
    return reward.save();
};
