const {UniversalEvent} = require('@wallfair.io/wallfair-commons').models;
const _ = require('lodash');

/***
 * Get how many times user played the game by userId
 * @param userId
 * @param gameId
 * @returns {Promise<number>}
 */
const getCasinoGamePlayCount = async (userId, gameId) => {
  const filter = {
    type: 'Casino/CASINO_PLACE_BET',
    userId
  };

  if (gameId) {
    _.set(filter, 'data.gameTypeId', gameId);
  }

  const query = await UniversalEvent.countDocuments(filter).catch((err) => {
    console.error('[getCasinoGamePlayCount]', err);
  });

  return query;
};

/***
 * Get how many times user cashout-ed in game
 * @param userId
 * @param gameId
 * @returns {Promise<number>}
 */
const getCasinoGameCashoutCount = async (userId, gameId) => {
  const filter = {
    type: 'Casino/CASINO_CASHOUT',
    userId
  };

  if (gameId) {
    filter['data.gameTypeId'] = gameId;
  }

  const query = await UniversalEvent.countDocuments(filter).catch((err) => {
    console.error(err);
  });

  return query;
};

/***
 * Get total amount won by user
 * @param userId
 * @param gameId
 * @returns {Promise<object>}
 * object.totalWon
 * object.totalReward
 * object.totalStaked
 */
const getCasinoGamesAmountWon = async (userId, gameId) => {
  const defaultOutput = {
    totalWon: 0,
    totalReward: 0,
    totalStaked: 0
  };

  const filter = {
    type: 'Casino/CASINO_CASHOUT',
    userId
  };

  if (gameId) {
    filter['data.gameTypeId'] = gameId;
  }

  const query = await UniversalEvent.aggregate([
    {
      $match: filter
    },
    {
      $group: {
        _id: null,
        totalReward: {$sum: "$data.reward"},
        totalStaked: {$sum: "$data.stakedAmount"}
      },
    }, {
      $project: {
        _id: 0,
        totalWon: {"$subtract": ["$totalReward", "$totalStaked"]},
        totalReward: 1,
        totalStaked: 1
      }
    }]).catch((err) => {
    console.error(err);
  });

  return _.get(query, 0) || defaultOutput;
};

/***
 * Get total amount lost by user
 * @param userId
 * @param gameId - gameTypeId
 * @returns {Promise<number>} - return negative value, when user lost in general
 */
const getCasinoGamesAmountLost = async (userId, gameId) => {
  const queryTotalBetted = await UniversalEvent.aggregate([
    {
      $match: {
        type: 'Casino/CASINO_PLACE_BET',
        'data.gameTypeId': gameId,
        userId
      }
    },
    {
      $group: {
        _id: null,
        totalBettedAmount: {$sum: "$data.amount"}
      },
    }, {
      $project: {
        _id: 0,
        totalBettedAmount: 1
      }
    }]).catch((err) => {
    console.error(err);
  });

  const queryTotalRewarded = await getCasinoGamesAmountWon(userId, gameId).catch((err) => {
    console.error(err);
  });

  const totalBetted = parseFloat(_.get(queryTotalBetted, '0.totalBettedAmount'));

  if (queryTotalRewarded && queryTotalBetted) {
    const totalRewarded = parseFloat(_.get(queryTotalRewarded, 'totalReward'));
    return totalRewarded - totalBetted;
  } else {
    return -totalBetted;
  }
};

/***
 * Get total amount of bets per user
 * @param userId
 * @returns {Promise<object>} - return
 * object.totalBettedAmount
 * object.totalBets
 * object.totalOutcomeAmount
 */
const getUserBetsAmount = async (userId) => {
  const defaultOutput = {
    totalBettedAmount: 0,
    totalBets: 0,
    totalOutcomeAmount: 0
  };
  const queryTotalBetted = await UniversalEvent.aggregate([
    {
      $match: {
        type: 'Notification/EVENT_BET_PLACED',
        userId
      }
    },
    {
      $group: {
        _id: null,
        totalBettedAmount: {$sum: "$data.trade.investmentAmount"},
        totalBets: {$sum: 1},
        totalOutcomeAmount: {$sum: "$data.trade.outcomeTokens"}
      },
    }, {
      $project: {
        _id: 0,
        totalBettedAmount: 1,
        totalBets: 1,
        totalOutcomeAmount: 1
      }
    }]).catch((err) => {
    console.error(err);
  });

  return _.get(queryTotalBetted, '0') || defaultOutput;
};


/***
 * Get user cashout amounts
 * @param userId
 * @returns {Promise<object>} - return
 * object.totalBettedAmount
 * object.totalBets
 * object.totalOutcomeAmount
 */
const getUserBetsCashouts = async (userId) => {
  const defaultOutput = {
    totalAmount: 0,
    totalCashouts: 0
  };
  const queryTotalBetted = await UniversalEvent.aggregate([
    {
      $match: {
        type: 'Notification/EVENT_BET_CASHED_OUT',
        userId
      }
    },
    {
      $group: {
        _id: null,
        totalAmount: {
          $sum: {
            "$toDouble": "$data.amount" //@todo save this directly as float, to avoid from string conversion
          }
        },
        totalCashouts: {$sum: 1}
      },
    }, {
      $project: {
        _id: 0,
        totalAmount: 1,
        totalCashouts: 1
      }
    }]).catch((err) => {
    console.error(err);
  });

  return _.get(queryTotalBetted, '0') || defaultOutput;
};


/***
 * Get user bet rewards
 * @param userId
 * @returns {Promise<object>} - return
 * object.totalBettedAmount
 * object.totalBets
 * object.totalOutcomeAmount
 */
const getUserBetsRewards = async (userId) => {
  const defaultOutput = {
    totalWonAmount: 0,
    totalRewards: 0
  };
  const query = await UniversalEvent.aggregate([
    {
      $match: {
        type: 'Notification/EVENT_USER_REWARD',
        userId
      }
    },
    {
      $group: {
        _id: null,
        totalWonAmount: {
          $sum: {
            "$toDouble": "$data.winToken"
          }
        },
        totalRewards: {$sum: 1}
      },
    }, {
      $project: {
        _id: 0,
        totalWonAmount: 1,
        totalRewards: 1
      }
    }]).catch((err) => {
    console.error(err);
  });

  return _.get(query, '0') || defaultOutput;
};

const getUserStats = async (userId) => {
  const casinoGamePlayCount = await getCasinoGamePlayCount(userId).catch((err)=> {
    console.error(err);
  });

  const casinoGameCashoutCount = await getCasinoGameCashoutCount(userId).catch((err)=> {
    console.error(err);
  });

  const casinoGamesAmountWon = await getCasinoGamesAmountWon(userId).catch((err)=> {
    console.error(err);
  });

  const casinoGamesAmountLost = await getCasinoGamesAmountLost(userId).catch((err)=> {
    console.error(err);
  });

  const userBetsAmount = await getUserBetsAmount(userId).catch((err)=> {
    console.error(err);
  });

  const userBetsCashouts = await getUserBetsCashouts(userId).catch((err)=> {
    console.error(err);
  });

  const userBetsRewards = await getUserBetsRewards(userId).catch((err)=> {
    console.error(err);
  });

  return {
    casinoGamePlayCount,
    casinoGameCashoutCount,
    casinoGamesAmountWon,
    casinoGamesAmountLost,
    userBetsAmount,
    userBetsCashouts,
    userBetsRewards
  }
};

module.exports = {
  getCasinoGamePlayCount,
  getCasinoGameCashoutCount,
  getCasinoGamesAmountWon,
  getCasinoGamesAmountLost,
  getUserBetsAmount,
  getUserBetsCashouts,
  getUserBetsRewards,
  getUserStats
};
