const { User, UniversalEvent } = require('@wallfair.io/wallfair-commons').models;
const pick = require('lodash.pick');
const bcrypt = require('bcrypt');
const axios = require('axios');
// const { BetContract } = require('@wallfair.io/smart_contract_mock');
const { Wallet /*, ONE*/, fromWei, Query } = require('@wallfair.io/trading-engine');
const { WFAIR_REWARDS } = require('../util/constants');
const { updateUserData } = require('./notification-events-service');
const { notificationEvents } = require('@wallfair.io/wallfair-commons/constants/eventTypes');
const amqp = require('./amqp-service');
const { getUserBetsAmount } = require('./statistics-service');
const awsS3Service = require('./aws-s3-service');
const _ = require('lodash');
const {BONUS_TYPES} = require('../util/constants');
const walletUtil = require("../util/wallet");
const mongoose = require("mongoose");
const {NotFoundError} = require('../util/error-handler')

const WFAIR = new Wallet();
// const WFAIR_TOKEN = 'WFAIR';
const CURRENCIES = ['WFAIR', 'EUR', 'USD'];

exports.getUserByPhone = async (phone, session) => User.findOne({ phone }).session(session);

exports.getUserById = async (id, session) => User.findOne({ _id: id }).session(session);

exports.getUserReducedDataById = async (id, session) =>
  User.findOne({ _id: id })
    .select({
      _id: 1,
      username: 1,
      name: 1,
      profilePicture: 1,
      amountWon: 1,
    })
    .session(session);

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
    .sort({ amountWon: -1, date: -1 })
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

exports.payoutUser = async (/*userId, bet*/) => {
  // const betId = bet.id;
  const LOG_TAG = '[PAYOUT-BET]';
  // console.debug(LOG_TAG, 'Payed out Bet', betId, userId);

  console.debug(LOG_TAG, 'Requesting Bet Payout');
  // const betContract = new BetContract(betId, bet.outcomes.length);
  // await betContract.getPayout(userId);
};

exports.getBalanceOf = async (userId) => {
  return fromWei(await WFAIR.getBalance(userId)).toFixed(4);
};

const INITIAL_LIQUIDITY = 5000n;

exports.mintUser = async (/*userId, amount*/) => {
  throw Error('Not supported');
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

    amqp.send(
      'universal_events',
      'event.user_changed_name',
      JSON.stringify({
        event: notificationEvents.EVENT_USER_CHANGED_NAME,
        producer: 'user',
        producerId: userId,
        data: {
          userId,
          name: updatedUser.name,
          oldName: oldName,
          updatedAt: Date.now(),
        },
        date: Date.now(),
        broadcast: true,
      })
    );

    await updateUserData(
      {
        userId,
        'data.user.name': { $exists: true },
      },
      {
        'data.user.name': updatedUser.name,
      }
    ).catch((err) => {
      console.error('updateUserData failed', err);
    });
  }

  if (updatedUser.username && updatedUser.username !== user.username) {
    const oldUsername = _.clone(user.username);
    user.username = updatedUser.username;

    amqp.send(
      'universal_events',
      'event.user_changed_username',
      JSON.stringify({
        event: notificationEvents.EVENT_USER_CHANGED_USERNAME,
        producer: 'user',
        producerId: userId,
        data: {
          userId,
          username: updatedUser.username,
          oldUsername,
          updatedAt: Date.now(),
        },
        date: Date.now(),
        broadcast: true,
      })
    );

    //update username across the events for this user, only when data.user exists at all, we need to have these unified across the events,
    // so for user specific things, we need to use proper user property
    await updateUserData(
      {
        userId,
        'data.user.username': { $exists: true },
      },
      {
        'data.user.username': updatedUser.username,
      }
    ).catch((err) => {
      console.error('updateUserData failed', err);
    });

    //handle SET_USERNAME award
    // const checkUsernameAward = await this.checkAwardExist(userId, 'SET_USERNAME').catch((err) => {
    //   console.error('checkAwardExist err', err);
    // });

    // if (checkUsernameAward.length === 0) {
    //   await this.createUserAwardEvent({
    //     userId,
    //     awardData: {
    //       type: AWARD_TYPES.SET_USERNAME,
    //       award: WFAIR_REWARDS.setUsername,
    //     },
    //   }).catch((err) => {
    //     console.error('createUserAwardEvent', err);
    //   });
    // }
  }

  if (updatedUser.image) {
    // if (!user.profilePicture) {
    //   await this.createUserAwardEvent({
    //     userId,
    //     awardData: {
    //       type: AWARD_TYPES.AVATAR_UPLOADED,
    //       award: WFAIR_REWARDS.setAvatar,
    //     },
    //   }).catch((err) => {
    //     console.error('createUserAwardEvent', err);
    //   });
    // }

    const imageLocation = await awsS3Service.upload(userId, updatedUser.image);
    user.profilePicture = imageLocation.split('?')[0];
    user.alpacaBuilderProps = updatedUser.alpacaBuilderProps;

    amqp.send(
      'universal_events',
      'event.user_uploaded_picture',
      JSON.stringify({
        event: notificationEvents.EVENT_USER_UPLOADED_PICTURE,
        producer: 'user',
        producerId: userId,
        data: {
          userId,
          username: _.get(updatedUser, 'username'),
          image: updatedUser.image,
          updatedAt: Date.now(),
        },

        date: Date.now(),
        broadcast: true,
      })
    );
  }

  if (
    updatedUser.notificationSettings &&
    updatedUser.notificationSettings !== user.notificationSettings
  ) {
    user.notificationSettings = updatedUser.notificationSettings;

    amqp.send(
      'universal_events',
      'event.user_updated_email_preferences',
      JSON.stringify({
        event: notificationEvents.EVENT_USER_UPDATED_EMAIL_PREFERENCES,
        producer: 'user',
        producerId: userId,
        data: { notificationSettings: user.notificationSettings },
      })
    );
  }

  if (updatedUser.aboutMe && user.aboutMe !== updatedUser.aboutMe) {
    amqp.send(
      'universal_events',
      'event.user_changed_about_me',
      JSON.stringify({
        event: notificationEvents.EVENT_USER_CHANGED_ABOUT_ME,
        producer: 'user',
        producerId: userId,
        data: {
          userId,
          username: updatedUser.username,
          notificationSettings: user.notificationSettings,
          updatedAt: Date.now(),
        },
        date: Date.now(),
        broadcast: true,
      })
    );

    user.aboutMe = updatedUser.aboutMe;
  }

  return await user.save();
};

exports.updateUserConsent = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error('NOT_FOUND');
  }

  user.tosConsentedAt = new Date().toUTCString();

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

  amqp.send(
    'universal_events',
    'event.user_set_currency',
    JSON.stringify({
      event: notificationEvents.EVENT_USER_SET_CURRENCY,
      producer: 'user',
      producerId: userId,
      data: { currency: user.preferences.currency },
    })
  );

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
exports.createUserAwardEvent = async ({ userId, awardData, broadcast = false }) => {
  //add token amount for award during event creation
  if (awardData?.award) {
    await this.mintUser(userId, awardData.award).catch((err) => {
      console.error('award mintUser', err);
    });
  }

  amqp.send(
    'universal_events',
    'event.user_award',
    JSON.stringify({
      event: notificationEvents.EVENT_USER_AWARD,
      producer: 'user',
      producerId: userId,
      data: {
        userId,
        awardData,
      },
      broadcast,
    })
  );
};

/***
 * check total bets for user and save USER_AWARD event, after reaching each levels
 * @param userId
 * @returns {Promise<void>} undefined
 */
exports.checkTotalBetsAward = async (userId) => {
  const awardData = {
    type: 'TOTAL_BETS_ABOVE_VALUE',
  };

  const totalUserBets = await getUserBetsAmount(userId).catch((err) => {
    console.error('getUserBetsAmount', err);
  });

  const total = (awardData.total = totalUserBets?.totalBets || 0);
  if ([5, 20, 50, 100, 150].includes(total)) {
    awardData.award = WFAIR_REWARDS.totalBets[total];
    awardData.total = total;

    //publish in universalevents collection and add tokens
    await this.createUserAwardEvent({
      userId,
      awardData,
    }).catch((err) => {
      console.error('createUserAwardEvent', err);
    });
  }
};

/***
 * check award exist for username and defined type
 * @param userId
 * @returns {Promise<void>} undefined
 */
exports.checkAwardExist = async (userId, type) => {
  return UniversalEvent.find({
    userId,
    'data.type': type,
  });
};

/***
 * Set user's ban deadline, provide zero to nullify ban date
 * @param {string} userId
 * @param {number} duration
 * @returns {Promise<User>}
 */
exports.updateBanDeadline = async (userId, duration = 0, description = null) => {
  if (!userId) {
    throw new Error(`Invalid ban data supllied: userId - ${userId}, duration - ${duration}`);
  }
  const user = await User.findById(userId);
  if (!user) {
    throw new Error(`No user found with ID '${userId}'`);
  }
  const now = Date.now();
  user.status = duration === 0 ? 'active' : 'banned';
  user.reactivateOn = duration === 0 ? null : new Date(now + duration);
  user.statusDescription = description;
  return user.save();
};

/***
 * create user bonus for first 1000 users
 * @param userId
 * @returns {Promise<void>} undefined
 */
exports.checkUserRegistrationBonus = async (userId) => {
  const bonusValidUntil = BONUS_TYPES.LAUNCH_1k_500.endDate;
  const now = new Date();
  const validUntil = new Date(bonusValidUntil);

  //skip check when bonus period is over
  if(validUntil < now) {
    return;
  }

  const totalUsers = 1000;

  const alreadyRegistered1k500 = await this.getUsersCountByBonus(BONUS_TYPES.LAUNCH_1k_500.type);

  if (alreadyRegistered1k500 <= totalUsers) {
    const alreadyHasBonus = await this.checkUserGotBonus(BONUS_TYPES.LAUNCH_1k_500.type, userId);
    //just to make sure, bonus type entry not exist yet for the user
    if(!alreadyHasBonus) {
      await walletUtil.transferBonus(BONUS_TYPES.LAUNCH_1k_500, userId);
    }
  }

  // second bonus check BONUS_TYPES.LAUNCH_2k_400
  // check only when 1 reach 1000
  // if(alreadyRegistered1k500 >= 1000) {
  //   const alreadyRegistered2k400 = await this.getUsersCountByBonus(BONUS_TYPES.LAUNCH_2k_400.type);
  //
  //   if(alreadyRegistered2k400 <= 1000) {
  //     await walletUtil.transferBonus(BONUS_TYPES.LAUNCH_2k_400, userId);
  //   }
  // }

};

exports.getUsersCountByBonus = async (bonusName)=> {
  const alreadyRegistered = await User.find({
    'bonus.name': bonusName
  }, {_id: 1}, {
    sort: {
      date: -1
    }
  });

  return alreadyRegistered.length;
}

exports.checkUserGotBonus = async (bonusName, userId)=> {
  const userData = await User.findOne({
    'bonus.name': bonusName,
    '_id': userId
  }, {_id: 1});

  return userData ? true : false;
}

/***
 * check if user is eligible to get FIRST_DEPOSIT_450 bonus
 * @param dd {object} DEPOSIT DATA
 * @returns {Promise<void>} undefined
 */
exports.checkFirstDepositBonus = async (dd) => {
  const userId = dd?.userId;
  if(userId) {
    const bonusCfg = _.cloneDeep(BONUS_TYPES.FIRST_DEPOSIT_DOUBLE_DEC21);
    const alreadyHasBonus = await this.checkUserGotBonus(bonusCfg.type, userId);
    const hasSpecialPromoFlag = await this.checkUserGotBonus(BONUS_TYPES.LAUNCH_PROMO_2021.type, userId);

    if (!alreadyHasBonus && hasSpecialPromoFlag) {
      const formattedAmount = fromWei(dd.amount).decimalPlaces(0).toNumber();
      //the same amount as bonus
      bonusCfg.amount = Math.min(formattedAmount, bonusCfg.max);

      await walletUtil.transferBonus(bonusCfg, userId);
    }
  }
};

/***
 * check if user is eligible to get EMAIL_CONFIRM_50 bonus
 * @param userId
 * @returns {Promise<void>} undefined
 */
exports.checkConfirmEmailBonus = async (userId) => {
  if(userId) {
    const alreadyHasBonus = await this.checkUserGotBonus(BONUS_TYPES.EMAIL_CONFIRM_50.type, userId);
    const hasSpecialPromoFlag = await this.checkUserGotBonus(BONUS_TYPES.LAUNCH_PROMO_2021.type, userId);

    if (!alreadyHasBonus && hasSpecialPromoFlag) {
      await walletUtil.transferBonus(BONUS_TYPES.EMAIL_CONFIRM_50, userId);
    }
  }
};

/***
 * add special bonus flag only, without transfer
 * @param userId
 * @param bonusCfg
 * @returns {Promise<void>} undefined
 */
exports.addBonusFlagOnly = async (userId, bonusCfg) => {
  if(userId && bonusCfg) {
    await User.updateOne({
      _id: mongoose.Types.ObjectId(userId)
    }, {
      $push: {
        bonus: {
          name: bonusCfg.type
        }
      }
    });
  }
};

exports.getUserDataForAdmin = async (userId) => {
  const queryRunner = new Query();
  const one = 1000000000000000000
  const u = await User.findOne({ _id: userId })
  if(!u) throw NotFoundError()
  let KYCCount = 0
    if(u.kyc.uid){
      KYCCount = await User.count({"kyc.uid": u.kyc.uid})
    }
    const balance = await queryRunner
      .query(
        `select cast(balance / ${one} as integer) as "balance" from account where owner_account = '${userId}'`)

    const bets = await queryRunner
      .query(
        `select cast(stakedamount / ${one} as integer) as "bet", crashfactor as "multiplier", cast(amountpaid/${one} as integer) as "cashout", cast((amountpaid - stakedamount) / ${one} as integer) as "profit", games.label from casino_trades left join games on games.id = casino_trades.gameid where userid = '${userId}' and state < 4 order by created_at;`)

    const transactions = await queryRunner
      .query(
        `select created_at, cast(amount / ${one} as integer), internal_user_id, originator, status from external_transaction_log where internal_user_id = '${userId}' order by created_at;`)

    return {
      ...u.toObject(),
      KYCCount,
      balance: (balance && balance.length) ? balance[0].balance : 0,
      bets,
      transactions
    }
}
