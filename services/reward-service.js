// Import Event model
const { Lottery, LotteryTicket } = require("@wallfair.io/wallfair-commons").models;

exports.listRewards = async () => {
    return Lottery.find({ });
};

exports.getReward = async (id) => {
    return Lottery.findOne({ _id: id });
};

exports.saveReward = async (lotteryId, lotteryQuestionIndex, userId) => {
    const lotteryTicket = new LotteryTicket({
        lotteryId,
        lotteryQuestionIndex,
        userId,
        skip: false
    });
    return lotteryTicket.save();
};
