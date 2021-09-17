const _ = require('lodash');
const mongoose = require('mongoose');
const { Lottery, LotteryTicket } = require('@wallfair.io/wallfair-commons').models;

exports.listLotteries = async () => Lottery.find({});

exports.listLotteriesForUser = async (userId) => {
  const completedTickets = await LotteryTicket.find({ userId: mongoose.Types.ObjectId(userId) });
  const completedLotteries = _.uniq(completedTickets.map(({ lotteryId }) => lotteryId));
  return Lottery.find({
    _id: {
      // exclude completed lotteries
      $nin: completedLotteries,
    },
    closed: false,
  });
};

exports.getLottery = async (id) => Lottery.findOne({ _id: id });

exports.saveLottery = async (lotteryId, lotteryQuestionIndex, userId) => {
  const lotteryTicket = new LotteryTicket({
    lotteryId,
    lotteryQuestionIndex,
    userId,
    skip: false,
  });
  return lotteryTicket.save();
};
