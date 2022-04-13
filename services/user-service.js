const { User, UniversalEvent, ApiLogs } = require('@wallfair.io/wallfair-commons').models;
const pick = require('lodash.pick');
const bcrypt = require('bcrypt');
const axios = require('axios');
const { Wallet, fromWei, Query, AccountNamespace, BN, Transactions, TransactionManager, WFAIR_SYMBOL, toWei, Webhook, WebhookQueueOriginator, WebhookQueueStatus, Account, ExternalTransactionOriginator, ExternalTransactionStatus } = require('@wallfair.io/trading-engine');
const { WFAIR_REWARDS } = require('../util/constants');
const { updateUserData } = require('./notification-events-service');
const { notificationEvents } = require('@wallfair.io/wallfair-commons/constants/eventTypes');
const amqp = require('./amqp-service');
const { getUserBetsAmount } = require('./statistics-service');
const awsS3Service = require('./aws-s3-service');
const _ = require('lodash');
const mongoose = require("mongoose");
const { NotFoundError } = require('../util/error-handler')
const { CasinoTradeContract } = require('@wallfair.io/wallfair-casino');
const WFAIR = new Wallet();
const casinoContract = new CasinoTradeContract();
const CURRENCIES = ['WFAIR', 'EUR', 'USD'];
const twilio = require('twilio')(process.env.TWILIO_ACC_SID, process.env.TWILIO_AUTH_TOKEN);
const userApi = require('./user-api');
const { ObjectId } = require('mongodb');
const { verifyRecaptcha } = require('../util/recaptcha');

const isPlayMoney = process.env.PLAYMONEY === 'true';

exports.getUserByPhone = async (phone, session) => User.findOne({ phone }).session(session);
exports.getUserByEmail = async (email) => User.findOne({ email });

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

exports.getRefsWithDeposits = async (id) => {
  const result = [];
  await User.find({ ref: id }).then((users) => {
    users.forEach((entry) => result.push(pick(entry, ['id', 'username', 'email', 'date'])));
  });

  return await Promise.all(
    result.map(async user => {
      const deposits = await new Transactions().getExternalTransactionLogs({
        select: ['created_at', 'amount'],
        where: {
          internal_user_id: user.id,
          originator: ExternalTransactionOriginator.DEPOSIT,
          status: ExternalTransactionStatus.COMPLETED
        },
        order: {
          created_at: 'DESC'
        }
      });

      const amounts = deposits.map((a) => a.amount);
      const total = amounts.length ? BN.sum.apply(null, amounts) : new BN('0');

      return { ...user, deposit: fromWei(total) };
    })
  );
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
    if (preferences.currency) {
      const valid = CURRENCIES.includes(preferences.currency);
      if (!valid) {
        throw new Error(`User validation failed. Invalid currency ${preferences.currency}`);
      }
      user.preferences.currency = preferences.currency;
    }

    if (preferences.gamesCurrency) {
      const valid = CURRENCIES.includes(preferences.gamesCurrency);
      if (!valid) {
        throw new Error(`User validation failed. Invalid currency ${preferences.gamesCurrency}`);
      }
      user.preferences.gamesCurrency = preferences.gamesCurrency;
    }
  }

  amqp.send(
    'universal_events',
    'event.user_set_currency',
    JSON.stringify({
      event: notificationEvents.EVENT_USER_SET_CURRENCY,
      producer: 'user',
      producerId: userId,
      data: {
        currency: user.preferences.currency,
        gamesCurrency: user.preferences.gamesCurrency
      },
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
exports.updateBanDeadline = async (userId, reactivateOn, description = null) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error(`No user found with ID '${userId}'`);
  }
  user.reactivateOn = reactivateOn;
  user.statusDescription = description;
  return await user.save();
};

exports.changeUserRole = async (userId, role) => {
  const user = await User.findById(userId);
  user.admin = role === 'admin';
  user.save();
};

exports.usersWithReferrals = async () => {
  const usersWithRefs = await User.aggregate([
    {
      $match: {
        ref: { $ne: null }
      }
    }, {
      $group: {
        _id: "$ref",
        refCount: { $sum: 1 }
      }
    }, {
      $sort: {
        refCount: -1
      }
    }
  ]).catch((err) => {
    console.error(err);
  });

  return await Promise.all(
    usersWithRefs.filter(u => u._id && mongoose.Types.ObjectId.isValid(u._id)).map(async user => {
      const i = await User.findById(user._id).select('username status date').exec();
      return await { ...i._doc, refCount: user.refCount };
    })
  );
}

exports.searchUsers = async (limit, skip, search, sortField, sortOrder, account) => {
  if (account) {
    const acc = await new Account().getUserLink(account);

    if (!acc) {
      return {
        users: [],
        count: 0
      }
    }

    const users = await User.find({ _id: acc.user_id })
      .select('_id username email status date amountWon admin');

    return {
      users: users,
      count: 1
    }
  }

  let query = {};
  if (search) {
    const qOr = [
      { username: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') },
      { _id: search },
    ];

    if (!mongoose.Types.ObjectId.isValid(search)) {
      qOr.pop();
    }

    query = {
      $or: qOr,
    }
  }

  const users = await User.find(query)
    .select('_id username email status date amountWon admin')
    .sort({ [sortField]: sortOrder })
    .limit(limit)
    .skip(skip);

  const count = await User.find(query).count();

  return {
    users,
    count
  }
}

exports.verifySms = async (user, phone, smsToken) => {
  try {
    const verification = await twilio.verify
      .services(process.env.TWILIO_SID)
      .verificationChecks.create({ to: phone, code: smsToken });
    if (verification?.status !== 'approved') {
      throw new Error('Invalid verification code', 401);
    }
  } catch (err) {
    throw new Error('Invalid verification code', 401);
  }

  try {
    user.phone = phone;
    await user.save();
  } catch (err) {
    throw new Error('Unable to save user\n' + err, 401);
  }
};
exports.sendSms = async (phone) => {
  //Cancel existing code if there's any.
  try {
    await twilio.verify.services(process.env.TWILIO_SID)
      .verifications(phone)
      .update({ status: 'canceled' })
  } catch (err) {
    //Do nothing if no previous code existed
    console.log('No previous valid sms code, nothing to cancel.', err.message);
  }
  try {
    await twilio.verify.services(process.env.TWILIO_SID)
      .verifications
      .create({ to: phone, channel: 'sms' })
  } catch (err) {
    console.error('Failed to send sms', err.message);
    throw new Error('Unable to send SMS\n' + err, 401);
  }
};

exports.getUserDataForAdmin = async (userId) => {
  const queryRunner = new Query();
  const one = 1000000000000000000;
  const u = await User.findOne({ _id: userId })
  if (!u) throw new NotFoundError()
  const balances = await WFAIR.getBalances(userId, AccountNamespace.USR);
  const balance = balances.length > 1 ?
    balances.reduce((a, b) => new BN(a.balance).plus(new BN(b.balance))) :
    balances[0]?.balance;

  const bets = await queryRunner
    .query(
      `select cast(stakedamount / ${one} as integer) as "bet", crashfactor as "multiplier", 
              cast(amountpaid/${one} as integer) as "cashout", 
              cast((amountpaid - stakedamount) / ${one} as integer) as "profit", 
              concat(games1.label, games2.label, external_games_config.game_data -> 'title') as label,
              created_at
       from casino_trades 
        left join games as games1 on games1.id = casino_trades.gameid
        left join games as games2 on games2.label = casino_trades.gameid 
        left join external_games_config on external_games_config.game_id = casino_trades.gameid
       where userid = '${userId}' and state < 4 order by created_at;`
    );

  const transactions = await new Transactions().getExternalTransactionLogs({
    select: ['created_at', 'amount', 'internal_user_id', 'originator', 'status', 'external_system'],
    where: {
      internal_user_id: userId
    },
    order: {
      created_at: 'DESC'
    }
  });

  const apiLogs = await ApiLogs.find({ userId }, ['ip', 'createdAt', 'api_type', 'path', 'statusCode', 'headers'], { limit: 100, sort: { createdAt: -1 } });
  const userIps = [...new Set(apiLogs.map(item => item.ip))];
  const usersOnSameIps = await ApiLogs.aggregate([
    {
      $match: {
        ip: {
          $in: userIps
        },
        userId: { $exists: true, $ne: userId }
      }
    }, {
      $group: {
        _id: '$userId',
        ip: { $first: '$ip' }
      }
    }
  ]).catch((err) => {
    console.error(err);
  });

  const bonus = await casinoContract.getPromoCodeUserByType(userId, 'BONUS');
  const account = await new Account().findAccountByUserId(userId);
  const refList = await this.getRefsWithDeposits(userId);

  return {
    ...u.toObject(),
    balance: fromWei(balance).toFixed(2),
    bonus: bonus.map(b => {
      return {
        name: b.name,
        amount: fromWei(b.value).toFixed(2),
        state: b.status,
      }
    }),
    bets,
    transactions: transactions.map(t => {
      return {
        ...t,
        amount: fromWei(t.amount).toFixed(2),
      }
    }),
    account,
    apiLogs,
    userIps,
    usersOnSameIps,
    refList
  }
}

exports.claimTokens = async (userId) => {
  const manager = new TransactionManager();

  try {
    const user = await this.getUserById(userId);
    const now = new Date();

    if (user.tokensClaimedAt) {
      const diff = Math.abs(now - user.tokensClaimedAt) / 36e5;

      if (diff < 24) {
        throw new Error('You reached the daily limit')
      }
    }

    await manager.startTransaction();

    await manager.wallet.mint({
      owner: userId,
      namespace: AccountNamespace.USR,
      symbol: WFAIR_SYMBOL
    }, toWei(100).toString());

    user.tokensClaimedAt = now;
    await user.save();

    await manager.commitTransaction();
  } catch (e) {
    await manager.rollbackTransaction();
    console.error(e);
    throw new Error('Failed to claim tokens');
  }
};

exports.processWeb3Login = async (address, username, ref, sid, cid, recaptchaToken) => {
  const transaction = new TransactionManager();

  try {
    await transaction.startTransaction();

    const userAccount = await transaction.account.getUserLink(address);
    let user;

    if (userAccount) {
      user = await userApi.getOne(userAccount.user_id);

      amqp.send(
        'universal_events',
        'event.user_signed_in',
        JSON.stringify({
          event: notificationEvents.EVENT_USER_SIGNED_IN,
          producer: 'user',
          producerId: user._id,
          data: {
            userId: user._id,
            username: user.username,
            updatedAt: Date.now(),
          },
          broadcast: true,
        })
      );
    } else {
      if (!recaptchaToken) {
        throw new Error(`Recaptcha token missing. User address: ${address}`);
      }

      const recaptchaVerified = await verifyRecaptcha(recaptchaToken);

      if (!recaptchaVerified) {
        throw new Error(`Recaptcha verification failed. User address: ${address}`);
      }

      const userId = new ObjectId().toHexString();

      await transaction.account.linkEthereumAccount(
        userId,
        address
      );

      const ethAccount = await transaction.account.findAccount(address);

      if (ethAccount && new BN(ethAccount.balance).isGreaterThan(0)) {
        await transaction.wallet.transfer(
          {
            owner: ethAccount.owner_account,
            namespace: AccountNamespace.ETH,
            symbol: WFAIR_SYMBOL,
          },
          {
            owner: userId,
            namespace: AccountNamespace.USR,
            symbol: WFAIR_SYMBOL,
          },
          ethAccount.balance
        );
      }

      await transaction.account.createAccount({
        owner: userId,
        namespace: AccountNamespace.USR,
        symbol: WFAIR_SYMBOL,
      }, isPlayMoney ? toWei(100).toString() : '0');

      if (isPlayMoney && (await userApi.getOne(ref))) {
        await transaction.wallet.mint({
          owner: ref,
          namespace: AccountNamespace.USR,
          symbol: WFAIR_SYMBOL,
        }, toWei(50).toString());
      }

      const counter = ((await userApi.getUserEntriesAmount()) || 0) + 1;

      user = await userApi.createUser({
        _id: userId,
        username: username || `wallfair-${counter}`,
        preferences: {
          currency: WFAIR_SYMBOL,
          gamesCurrency: isPlayMoney ? WFAIR_SYMBOL : 'USD'
        },
        ref, sid, cid,
        tosConsentedAt: new Date(),
      });

      amqp.send(
        'universal_events',
        'event.user_signed_up',
        JSON.stringify({
          event: notificationEvents.EVENT_USER_SIGNED_UP,
          producer: 'user',
          producerId: user._id,
          data: {
            userId: user._id,
            username: user.username,
            ref, sid, cid,
            updatedAt: Date.now(),
          },
          date: Date.now(),
          broadcast: true,
        })
      );
    }

    await transaction.commitTransaction();

    return user;
  } catch (e) {
    console.error(e);
    await transaction.rollbackTransaction();
    throw new Error('Failed to process web3 login');
  }
};

exports.getUserByAddress = async (address) => {
  const userAccount = await new Account().getUserLink(address);
  return userAccount ? await userApi.getOne(userAccount.user_id) : {};
}

exports.confirmDeposit = async (hash, networkCode, userId) => {
  try {
    await new Webhook().insertWebhookQueue(
      WebhookQueueOriginator.DEPOSIT,
      JSON.stringify({ hash, networkCode, userId }),
      hash,
      '200',
      '',
      WebhookQueueStatus.NEW,
    );
  } catch (e) {
    console.error(e);
    throw new Error('Failed to confirm a deposit');
  }
};
