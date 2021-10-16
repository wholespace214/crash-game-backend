const mongoose = require('mongoose');
const { Trade, User } = require('@wallfair.io/wallfair-commons').models;
const eventService = require('./event-service');
const { BetContract } = require('@wallfair.io/smart_contract_mock');
const { toScaledBigInt, fromScaledBigInt } = require('../util/number-helper');

const getTradesAggregate = (betId, statuses = []) => {
  return Trade.aggregate([
    {
      $match: {
        betId: mongoose.Types.ObjectId(betId),
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
};

const calcBuySell = async (betId, trade) => {
  let outcomeBuy = 0;
  let outcomeSell = 0;

  const betContract = new BetContract(betId);
  outcomeBuy = await betContract.calcBuy(
    toScaledBigInt(trade.totalInvestmentAmount),
    trade.outcomeIndex
  );
  outcomeSell = await betContract.calcSellFromAmount(
    toScaledBigInt(trade.totalOutcomeTokens),
    trade.outcomeIndex
  );

  return [fromScaledBigInt(outcomeBuy), fromScaledBigInt(outcomeSell)];
}

exports.getTradesByBetAndStatuses = async (betId, statuses = []) => {
  const [{
    totalInvestmentAmount,
    totalOutcomeTokens
  }] = await getTradesAggregate(betId, statuses);

  const trades = await Trade.find({
    betId: mongoose.Types.ObjectId(betId),
    status: { $in: statuses }
  });
  const userIds = trades.map(t => t.userId);
  const users = await User.find({
    _id: { $in: userIds },
  });
  const userMap = new Map(users.map(u => [u._id.toString(), u]));
  return Promise.all(trades.map(async t => {
    const base = {
      ...t,
      id: t.id.toString(),
      investmentAmount: t.investmentAmount,
      isNew: t.isNew,
      outcomeIndex: t.outcomeIndex,
      outcomeTokens: t.outcomeTokens,
      status: t.status,
      updatedAt: t.updatedAt,
      userId: t.userId,
      username: userMap.get(t.userId.toString()).username,
      profilePicture: userMap.get(t.userId.toString()).profilePicture,
      totalInvestmentAmount,
      totalOutcomeTokens,
    };
    const [outcomeBuy, outcomeSell] = await calcBuySell(betId, base);
    return {
      ...base,
      outcomeBuy,
      outcomeSell,
    };
  }));
};

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
