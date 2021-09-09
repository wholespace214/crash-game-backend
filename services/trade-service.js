const mongoose = require('mongoose');
const { Trade } = require("@wallfair.io/wallfair-commons").models;

exports.getActiveTradesByUserId = async (userId) => {
  return await Trade.aggregate(
    [
      {
        $match: {
          userId: mongoose.Types.ObjectId(userId),
          status: 'active',
        },
      },
      {
        $group: {
          _id: {
            userId: '$userId',
            betId: '$betId',
            outcomeIndex: '$outcomeIndex',  
          },
          totalInvestmentAmount: {
            $sum: '$investmentAmount'
          },
          totalOutcomeTokens: {
            $sum: '$outcomeTokens'
          }
        }
      }
    ]
  );
};

exports.closeTrades = async (userId, bet, outcomeIndex, status, session) => {
  if (![BET_STATUS.active].includes(bet.status)) {
    throw new Error('Cannot close inactive bets, bet status is ' + bet.status);
  }

  await Trade.updateMany({userId, betId: bet.id, outcomeIndex}, {
    $set: {
      status,
      updatedAt: Date.now,
    }
  }, { session });
};
