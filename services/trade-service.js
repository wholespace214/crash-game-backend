const mongoose = require('mongoose');
const { Trade } = require('@wallfair.io/wallfair-commons').models;
const eventService = require('./event-service');

exports.getTradesByUserIdAndStatuses = async (userId, statuses = []) =>
  await Trade.aggregate([
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId),
        status: { $in: statuses },
      },
    },
    { $sort: { createdAt: -1 } },
    {
      $lookup: {
        localField: 'betId',
        from: 'bets',
        foreignField: '_id',
        as: 'bet',
      },
    },
    {
      $group: {
        _id: {
          userId: '$userId',
          betId: '$betId',
          outcomeIndex: '$outcomeIndex',
          status: '$status',
          bet: {
            $let: {
              vars: {
                betMatch: {
                  $arrayElemAt: ['$bet', 0],
                },
              },
              in: {
                outcomes: '$$betMatch.outcomes',
                finalOutcome: '$$betMatch.finalOutcome',
              },
            },
          },
        },
        totalInvestmentAmount: {
          $sum: '$investmentAmount',
        },
        totalOutcomeTokens: {
          $sum: '$outcomeTokens',
        },
        date: {
          $max: '$createdAt',
        },
      },
    },
  ]);

exports.closeTrades = async (userId, bet, outcomeIndex, status, session) => {
  if (![eventService.BET_STATUS.active, eventService.BET_STATUS.closed].includes(bet.status)) {
    throw new Error(`Cannot close inactive bets, bet status is ${bet.status}`);
  }

  await Trade.updateMany(
    { userId, betId: bet.id, outcomeIndex },
    {
      $set: {
        status,
        updatedAt: Date.now(),
      },
    },
    { session }
  );
};
