const {UniversalEvent} = require('@wallfair.io/wallfair-commons').models;
const _ = require('lodash');

/***
 * Get how many times user played the game by userId
 * @param userId
 * @param gameId
 * @returns {Promise<string>}
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
 * @returns {Promise<string>}
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
 * @returns {Promise<string>}
 */
const getCasinoGamesAmountWon = async (userId, gameId) => {
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
        totalWon: { "$subtract": [ "$totalReward", "$totalStaked" ] },
        totalReward: 1,
        totalStaked: 1
      }
    }]).catch((err) => {
    console.error(err);
  });

  console.log("query", query);
  console.log("userId", userId);
  console.log("gameId", gameId);
  console.log("filter", filter);

  return _.get(query, 0);
};

/***
 * Get total amount lost by user
 * @param userId
 * @param gameId - gameTypeId
 * @returns {Promise<string>} - return negative value, when user lost in general
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

  if(queryTotalRewarded && queryTotalBetted) {
    const totalRewarded = parseFloat(_.get(queryTotalRewarded, 'totalReward'));
    return totalRewarded - totalBetted;
  } else {
    return -totalBetted;
  }
};

module.exports = {
  getCasinoGamePlayCount,
  getCasinoGameCashoutCount,
  getCasinoGamesAmountWon,
  getCasinoGamesAmountLost
};
