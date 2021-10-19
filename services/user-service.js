const { User } = require('@wallfair.io/wallfair-commons').models;
const pick = require('lodash.pick');
const bcrypt = require('bcrypt');
const axios = require('axios');
const { BetContract, Erc20 } = require('@wallfair.io/smart_contract_mock');
const { fromScaledBigInt } = require('../util/number-helper');
const { WFAIR_REWARDS } = require('../util/constants');
const { publishEvent, notificationEvents } = require('./notification-service');
const { updateUserData } = require('./notification-events-service');
const { getUserBetsAmount } = require('./statistics-service');
const awsS3Service = require('./aws-s3-service');
const _ = require('lodash');

const WFAIR = new Erc20('WFAIR');
const CURRENCIES = ['WFAIR', 'EUR', 'USD'];

exports.getUserByPhone = async (phone, session) => User.findOne({ phone }).session(session);

exports.getUserById = async (id, session) => User.findOne({ _id: id }).session(session);

exports.getUserReducedDataById = async (id, session) => User.findOne({ _id: id }).select({
  _id: 1,
  username: 1,
  name: 1,
  profilePicture: 1,
  amountWon: 1
}).session(session);

exports.getUserByIdAndWallet = async (id, walletAddress, session) =>
  User.findOne({ _id: id }).session(session);

exports.getRefByUserId = async (id) => {
  const result = [];
  await User.find({ ref: id }).then((users) => {
    users.forEach((entry) => result.push(pick(entry, ['id', 'username', 'email', 'date'])));
  });
  return result;
};

exports.getUsersToNotify = async (eventId, notificationSettings) => {
  //TODO: use eventId to find users with this event bookmarked
  return User.find({ notificationSettings });
};

exports.saveUser = async (user, session) => user.save({ session });

exports.rewardUserAction = async (ref, amount) => {
  if (ref) {
    await this.mintUser(ref, amount);
  }
};

exports.securePassword = async (user, password) => {
  bcrypt.hash(password, 10, (err, hash) => {
    user.password = hash;
    user.save();
  });
};

exports.comparePassword = async (user, plainPassword) =>
  await bcrypt.compare(plainPassword, user.password);

exports.getRankByUserId = async (userId) => {
  // TODO this cant stay like this.
  // it is an improvement over the previous solution, but still bad
  // we need to have a service updating the rank frequently (ex: every 15 secs)
  const users = await User.find({ username: { $exists: true } })
    .sort({ amountWon: -1, username: 1 })
    .select({ _id: 1, amountWon: 1 })
    .exec();

  let lastDiffAmount = 0;
  let ranking = {
    rank: 0,
    toNextRank: 0,
  };

  for (let i = 0; i < users.length; i++) {
    if (users[i]._id == userId) {
      const rank = i + 1;
      const toNextRank = i == 0 ? 0 : lastDiffAmount - users[i].amountWon;

      ranking = { rank, toNextRank };
    }

    if (lastDiffAmount == 0 || lastDiffAmount != users[i].amountWon) {
      lastDiffAmount = users[i].amountWon;
    }
  }

  return ranking;
};

exports.createUser = async (user) => {
  axios
    .post('https://hooks.zapier.com/hooks/catch/10448019/b3155io/', {
      name: user.name,
      email: user.email,
    })
    .then((res) => {
      console.log(`statusCode: ${res.statusCode}`);
      console.log(res);
    })
    .catch((error) => {
      console.error(error);
    });
};

exports.payoutUser = async (userId, bet) => {
  const betId = bet.id;
  const LOG_TAG = '[PAYOUT-BET]';
  console.debug(LOG_TAG, 'Payed out Bet', betId, userId);

  console.debug(LOG_TAG, 'Requesting Bet Payout');
  const betContract = new BetContract(betId, bet.outcomes.length);
  await betContract.getPayout(userId);
};

exports.getBalanceOf = async (userId) => fromScaledBigInt(await WFAIR.balanceOf(userId));

const INITIAL_LIQUIDITY = 5000n;

exports.mintUser = async (userId, amount) => {
  await WFAIR.mint(userId, amount ? BigInt(amount) * WFAIR.ONE : INITIAL_LIQUIDITY * WFAIR.ONE);
};

exports.getTotalWin = (balance) => {
  const value = balance - INITIAL_LIQUIDITY;
  return value < 0n ? 0n : value;
};

exports.updateUser = async (userId, updatedUser) => {
  const user = await User.findById(userId);

  if (updatedUser.name && updatedUser.name !== user.name) {
    const oldName = _.clone(user.name);
    user.name = updatedUser.name;

    publishEvent(notificationEvents.EVENT_USER_CHANGED_NAME, {
      producer: 'user',
      producerId: userId,
      data: {
        userId,
        name: updatedUser.name,
        oldName: oldName,
        updatedAt: Date.now()
      },
      broadcast: true
    });

    await updateUserData({
      userId,
      'data.user.name': {$exists: true}
    }, {
      'data.user.name': updatedUser.name
    }).catch((err)=> {
      console.error('updateUserData failed', err)
    })
  }

  if (updatedUser.username && updatedUser.username !== user.username) {
    const oldUsername = _.clone(user.username);
    user.username = updatedUser.username;

    publishEvent(notificationEvents.EVENT_USER_CHANGED_USERNAME, {
      producer: 'user',
      producerId: userId,
      data: {
        userId,
        username: updatedUser.username,
        oldUsername,
        updatedAt: Date.now()
      },
      broadcast: true
    });

    //update username across the events for this user, only when data.user exists at all, we need to have these unified across the events,
    // so for user specific things, we need to use proper user property
    await updateUserData({
      userId,
      'data.user.username': {$exists: true}
    }, {
      'data.user.username': updatedUser.username
    }).catch((err)=> {
      console.error('updateUserData failed', err)
    })
  }

  if (updatedUser.image) {
    if (!user.profilePicture) {
      await this.rewardUserAction(user.ref, WFAIR_REWARDS.uploadPicture);
    }

    const imageLocation = await awsS3Service.upload(userId, updatedUser.image);
    user.profilePicture = imageLocation.split('?')[0];

    publishEvent(notificationEvents.EVENT_USER_UPLOADED_PICTURE, {
      producer: 'user',
      producerId: userId,
      data: {
        userId,
        username: _.get(updatedUser, 'username'),
        image: updatedUser.image,
        updatedAt: Date.now()
      },
      broadcast: true
    });
  }

  if (updatedUser.notificationSettings && updatedUser.notificationSettings !== user.notificationSettings) {
    user.notificationSettings = updatedUser.notificationSettings;

    publishEvent(notificationEvents.EVENT_USER_UPDATED_EMAIL_PREFERENCES, {
      producer: 'user',
      producerId: userId,
      data: { notificationSettings: user.notificationSettings },
    });
  }

  if (updatedUser.aboutMe && user.aboutMe !== updatedUser.aboutMe) {
    publishEvent(notificationEvents.EVENT_USER_CHANGED_ABOUT_ME, {
      producer: 'user',
      producerId: userId,
      data: {
        userId,
        username: updatedUser.username,
        notificationSettings: user.notificationSettings,
        updatedAt: Date.now()
      },
      broadcast: true
    });

    user.aboutMe = updatedUser.aboutMe;
  }

  return await user.save();
};

exports.updateUserPreferences = async (userId, preferences) => {
  let user = await User.findById(userId);

  if (preferences) {
    const valid = CURRENCIES.includes(preferences.currency);
    if (!valid) {
      throw new Error(`User validation failed. Invalid currency ${preferences.currency}`);
    }
    user.preferences.currency = preferences.currency;
  }

  publishEvent(notificationEvents.EVENT_USER_SET_CURRENCY, {
    producer: 'user',
    producerId: userId,
    data: { currency: user.preferences.currency },
  });

  return await user.save();
};

exports.increaseAmountWon = async (userId, amount) => {
  const userSession = await User.startSession();
  let user = null;
  try {
    await userSession.withTransaction(async () => {
      user = await User.findById({ _id: userId }, { phone: 1, amountWon: 1 }).exec();
      if (user) {
        user.amountWon += +amount;
        await user.save();
      }
    });
  } catch (err) {
    console.error(err);
    throw err;
  } finally {
    await userSession.endSession();
  }
};

exports.updateStatus = async (userId, status) => {
  let user = await User.findById(userId);

  if (user) {
    user.status = status;
    await user.save();
  } else {
    throw new Error('User does not exist');
  }
};

/***
 * create USER_AWARD event in universalevents, add proper token amount based on `awardData.award` amount
 * @param userId
 * @returns {Promise<void>} undefined
 */
exports.createUserAwardEvent = async ({userId, awardData, broadcast = false}) => {
  //add token amount for award during event creation
  if(awardData?.award) {
    await this.mintUser(userId, awardData.award).catch((err)=> {
      console.error('award mintUser', err)
    })
  }

  publishEvent(notificationEvents.EVENT_USER_AWARD, {
    producer: 'user',
    producerId: userId,
    data: awardData,
    broadcast
  });
}

/***
 * check total bets for user and save USER_AWARD event, after reaching each levels
 * @param userId
 * @returns {Promise<void>} undefined
 */
exports.checkTotalBetsAward = async (userId) => {
  const awardData = {
    type: 'TOTAL_BETS_ABOVE_VALUE'
  };

  const totalUserBets = await getUserBetsAmount(userId).catch((err)=> {
    console.error('getUserBetsAmount', err)
  });

  const total = awardData.total = totalUserBets?.totalBets || 0;
  if(total === 5 || total === 20 || total === 50 || total === 100 || total === 150) {
    awardData.award = WFAIR_REWARDS.totalBets[total];
    awardData.total = total;

    //publish in universalevents collection and add tokens
    await this.createUserAwardEvent({
      userId,
      awardData
    }).catch((err)=> {
      console.error('createUserAwardEvent', err)
    })
  }
}
