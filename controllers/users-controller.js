const dotenv = require('dotenv');

dotenv.config();
const { validationResult } = require('express-validator');
const {
  Wallet,
  Transactions,
  ExternalTransactionOriginator,
  fromWei,
  AccountNamespace,
  BN,
} = require('@wallfair.io/trading-engine');
const { CasinoTradeContract, CASINO_TRADE_STATE } = require('@wallfair.io/wallfair-casino');
const { User } = require('@wallfair.io/wallfair-commons').models;
const userService = require('../services/user-service');
const tradeService = require('../services/trade-service');
const statsService = require('../services/statistics-service');
const mailService = require('../services/mail-service');
const cryptopayService = require('../services/cryptopay-service');
const moonpayService = require('../services/moonpay-service');
const awsS3Service = require('../services/aws-s3-service');

const { ErrorHandler } = require('../util/error-handler');
const { fromScaledBigInt } = require('../util/number-helper');

const _ = require('lodash');
const bigDecimal = require('js-big-decimal');
const faker = require('faker');

const WFAIR = new Wallet();
const casinoContract = new CasinoTradeContract();
const kycService = require('../services/kyc-service.js');
const { getBanData } = require('../util/user');
const { PROMO_CODE_DEFAULT_REF } = require('../util/constants');

const bindWalletAddress = async (req, res, next) => {
  console.log('Binding wallet address', req.body);

  // retrieve wallet address
  const { walletAddress } = req.body;

  // ensure address is present
  if (!walletAddress) {
    return next(new ErrorHandler(422, 'WalletAddress expected, but was missing'));
  }

  try {
    // check if there is already a user with this wallet
    const walletUser = await User.findOne({ walletAddress });

    // if this address was already bound to another user, return 409 error
    if (walletUser && walletUser.id !== req.user.id) {
      return next(new ErrorHandler(409, 'This wallet is already bound to another user'));
    }

    let user;
    if (!walletUser) {
      // retrieve user who made the request
      user = await userService.getUserById(req.user.id);
      user.walletAddress = walletAddress;
      user = await userService.saveUser(user);
    } else {
      // do nothing if wallet exists and is already bound to the same user who made the request
    }

    res.status(201).json({
      userId: user?.id,
      walletAddress,
    });
  } catch (err) {
    console.log(err);
    next(new ErrorHandler(422, err.message));
  }
};

//@todo this route is not used in frontend, I will move ref reward part in confirm-email route
const saveAdditionalInformation = async (req, res, next) => {
  // Validating User Inputs
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ErrorHandler(422, errors[0]));
  }

  // Defining User Inputs
  const { email, name, username } = req.body;

  try {
    let user = await userService.getUserById(req.user.id);

    if (username) {
      const usernameUser = await User.findOne({ username });

      if (usernameUser !== null && !usernameUser._id.equals(user._id)) {
        return next(new ErrorHandler(409, 'Username is already used'));
      }

      user.username = username.replace(' ', '');
      user.name = name;
    }

    if (email) {
      const emailUser = await User.findOne({ email });

      if (emailUser !== null && !emailUser._id.equals(user._id)) {
        return next(new ErrorHandler(409, 'Email address is already used'));
      }

      user.email = email.replace(' ', '');

      // await rewardRefUserIfNotConfirmed(user);
    }

    user = await userService.saveUser(user);

    res.status(201).json({
      userId: user.id,
      phone: user.phone,
      name: user.username,
      email: user.email,
    });
  } catch (err) {
    next(new ErrorHandler(422, err.message));
  }
};

//@todo this route is not used in frontend as well
const saveAcceptConditions = async (req, res, next) => {
  // Validating User Inputs
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ErrorHandler(422, 'All conditions need to be accepted'));
  }

  try {
    let user = await userService.getUserById(req.user.id);
    const userConfirmedChanged = await rewardRefUserIfNotConfirmed(user);

    if (userConfirmedChanged) {
      user = await userService.saveUser(user);
    }

    res.status(201).json({
      confirmed: user.confirmed,
    });
  } catch (err) {
    next(new ErrorHandler(422, err.message));
  }
};

const rewardRefUserIfNotConfirmed = async (user) => {
  if (!user.confirmed) {
    // await userService.rewardUserAction(user.ref, WFAIR_REWARDS.referral);
    await userService.createUser(user);
    user.confirmed = true;
  }

  return user.confirmed;
};

// Receive all users in leaderboard
const getLeaderboard = async (req, res) => {
  const limit = +req.params.limit;
  const skip = +req.params.skip;

  const users = await User.find({ username: { $exists: true } })
    .sort({ amountWon: -1, date: -1 })
    .select({ username: 1, amountWon: 1 })
    .limit(limit)
    .skip(skip)
    .exec();

  const total = await User.countDocuments().exec();

  res.json({
    total,
    users,
    limit,
    skip,
  });
};

// Receive specific user information
const getUserInfo = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      return next(new ErrorHandler(404, 'User not found'));
    }

    const balances = await WFAIR.getBalances(userId, AccountNamespace.USR);
    const wfairBalance = balances.length > 1 ?
      balances.reduce((a, b) => new BN(a.balance).plus(new BN(b.balance))) :
      balances[0]?.balance || 0;
    const formattedBalance = fromWei(wfairBalance).toFixed(4);
    const { rank, toNextRank } = await userService.getRankByUserId(userId);
    let phoneConfirmed = false;
    if (user.phone) {
      phoneConfirmed = true;
    }
    res.status(200).json({
      userId: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      profilePicture: user.profilePicture,
      balance: formattedBalance,
      balances: balances.map(b => {
        return {
          symbol: b.symbol,
          balance: fromWei(b.balance).toFixed(4),
        };
      }),
      admin: user.admin,
      emailConfirmed: user.emailConfirmed,
      phoneConfirmed: phoneConfirmed,
      rank,
      toNextRank,
      amountWon: user.amountWon,
      tokensRequestedAt: user.tokensRequestedAt,
      tokensClaimedAt: user.tokensClaimedAt,
      preferences: user.preferences,
      aboutMe: user.aboutMe,
      status: user.status,
      notificationSettings: user && _.omit(user.toObject().notificationSettings, '_id'),
      alpacaBuilderProps: user.alpacaBuilderProps,
      kyc: user.kyc,
    });
  } catch (err) {
    console.error(err);
    next(new ErrorHandler(422, 'Account information loading failed'));
  }
};

// get public basic user info
const getBasicUserInfo = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      return next(new ErrorHandler(404, 'User not found'));
    }

    const { rank } = await userService.getRankByUserId(userId);

    res.status(200).json({
      name: user.name,
      username: user.username,
      profilePicture: user.profilePicture,
      aboutMe: user.aboutMe,
      rank,
      amountWon: user.amountWon,
      status: user.status,
    });
  } catch (err) {
    console.error(err);
    next(new ErrorHandler(422, 'Account information loading failed'));
  }
};

// check if username already exist
const checkUsername = async (req, res, next) => {
  try {
    const { username } = req.body;
    const user = await User.findOne({
      username,
    });
    let isUnique = false;

    if (!user) {
      isUnique = true;
    }

    res.status(200).json({
      username,
      isUnique,
    });
  } catch (err) {
    console.error(err);
    next(new ErrorHandler(400, 'Check username failed'));
  }
};

// Receive specific user information
const getRefList = async (req, res, next) => {
  try {
    const refList = await userService.getRefByUserId(req.user.id);

    res.status(200).json({
      userId: req.user.id,
      refList,
    });
  } catch (err) {
    next(new ErrorHandler(422, 'Account information loading failed'));
  }
};

const getOpenBetsList = async (request, response, next) => {
  const { user } = request;

  try {
    if (user) {
      const trades = await tradeService.getTradesByUserIdAndStatuses(user.id, ['active']);

      const openBets = [];

      for (const trade of trades) {
        const outcomeIndex = trade._id.outcomeIndex;
        const betId = trade._id.betId;
        // const outcomes = trade._id.bet.outcomes || [];
        let outcomeBuy = 0;
        let outcomeSell = 0;

        // if (outcomes.length) {
        //   const betContract = new BetContract(betId, outcomes.length);
        //   outcomeBuy = await betContract.calcBuy(
        //     toScaledBigInt(trade.totalInvestmentAmount),
        //     outcomeIndex
        //   );
        //   outcomeSell = await betContract.calcSellFromAmount(
        //     toScaledBigInt(trade.totalOutcomeTokens),
        //     outcomeIndex
        //   );
        // }

        openBets.push({
          betId,
          outcome: outcomeIndex,
          investmentAmount: trade.totalInvestmentAmount,
          outcomeAmount: trade.totalOutcomeTokens,
          lastDate: trade.date,
          currentBuyAmount: fromScaledBigInt(outcomeBuy),
          sellAmount: fromScaledBigInt(outcomeSell),
          status: trade._id.status,
        });
      }

      response.status(200).json({
        openBets,
      });
    } else {
      return next(new ErrorHandler(404, 'User not found'));
    }
  } catch (err) {
    console.error(err);
    next(new ErrorHandler(500, err.message));
  }
};

const getHistory = async (req, res, next) => {
  const { user } = req;

  try {
    if (user) {
      const interactions = await casinoContract.getAMMInteractions(user.id);
      const casinoTrades = await casinoContract.getCasinoTradesByUserIdAndStates(user.id, [
        CASINO_TRADE_STATE.LOCKED,
        CASINO_TRADE_STATE.WIN,
        CASINO_TRADE_STATE.LOSS,
      ]);
      const transactions = [];

      for (const interaction of interactions) {
        const investmentAmount = fromScaledBigInt(BigInt(interaction.investmentamount));
        const feeAmount = fromScaledBigInt(BigInt(interaction.feeamount));
        const outcomeTokensBought = fromScaledBigInt(BigInt(interaction.outcometokensbought));

        transactions.push({
          ...interaction,
          investmentAmount,
          feeAmount,
          outcomeTokensBought,
          type: 'BET',
        });
      }

      for (const casinoTrade of casinoTrades) {
        const isWin = casinoTrade.state === CASINO_TRADE_STATE.WIN;
        const investmentAmount = fromScaledBigInt(casinoTrade.stakedamount);
        const outcomeTokensBought = isWin
          ? fromScaledBigInt(
            bigDecimal.multiply(
              BigInt(casinoTrade.stakedamount),
              parseFloat(casinoTrade.crashfactor)
            )
          )
          : 0;
        const direction = isWin ? 'PAYOUT' : 'BUY';

        transactions.push({
          direction,
          investmentAmount,
          outcomeTokensBought,
          trx_timestamp: casinoTrade.created_at,
          type: 'GAME',
        });
      }

      res.status(200).json(transactions);
    } else {
      return next(new ErrorHandler(404, 'User not found'));
    }
  } catch (err) {
    console.error(err);
    next(new ErrorHandler(500, err.message));
  }
};

const getTradeHistory = async (req, res, next) => {
  const user = req.user;

  if (!user) {
    return next(new ErrorHandler(404, 'User not found'));
  }

  try {
    const interactions = await casinoContract.getAMMInteractions(user.id);
    const finalizedTrades = await tradeService.getTradesByUserIdAndStatuses(user.id, [
      'closed',
      'rewarded',
      'sold',
    ]);

    const trades = finalizedTrades.map((trade) => {
      let soldAmount;
      const bet = trade._id;

      if (bet.status === 'sold') {
        const sellInteractions = interactions.filter(
          (i) =>
            i.bet === bet.betId.toString() &&
            i.direction === 'SELL' &&
            i.outcome === bet.outcomeIndex
        );
        const totalSellAmount = _.sum(
          sellInteractions.map(_.property('investmentamount')).map(BigInt).filter(Boolean)
        );
        soldAmount = fromScaledBigInt(totalSellAmount);
      }

      return {
        ...bet,
        investmentAmount: trade.totalInvestmentAmount,
        outcomeAmount: trade.totalOutcomeTokens,
        lastDate: trade.date,
        soldAmount,
      };
    });

    res.status(200).json({
      trades,
    });
  } catch (e) {
    console.error(e);
    next(new ErrorHandler(500, 'Failed to fetch trade history'));
  }
};

const confirmEmail = async (req, res, next) => {
  // Validating User Inputs
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(res.status(400).send(errors));
  }

  try {
    // Defining User Inputs
    const { code, userId } = req.query;

    const user = await userService.getUserById(userId);

    if (user.emailConfirmed && user.confirmed) {
      return res.status(200).send({ status: 'The email has been already confirmed' });
    }

    if (user.emailCode === code) {
      user.emailConfirmed = true;
      user.confirmed = true;
      await user.save();

      // await userService
      //   .createUserAwardEvent({
      //     userId,
      //     awardData: {
      //       type: AWARD_TYPES.EMAIL_CONFIRMED,
      //       award: WFAIR_REWARDS.confirmEmail,
      //     },
      //   })
      //   .catch((err) => {
      //     console.error('createUserAwardEvent', err);
      //   });

      // await userService.checkConfirmEmailBonus(userId);

      res.status(200).send({ status: 'OK' });
    } else {
      next(new ErrorHandler(422, 'The email code is invalid'));
    }
  } catch (err) {
    next(new ErrorHandler(422, err.message));
  }
};

const resendConfirmEmail = async (req, res, next) => {
  try {
    // Validating User Inputs
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(res.status(400).send(errors));
    }

    // Defining User Inputs
    const { userId } = req.query;

    const user = await userService.getUserById(userId);

    if (user.emailConfirmed && user.confirmed) {
      return res.status(200).send({ status: 'The email has been already confirmed' });
    }

    await mailService.sendConfirmMail(user);
    res.status(200).send({ status: 'OK' });
  } catch (err) {
    next(new ErrorHandler(422, err.message));
  }
};

const updateUser = async (req, res, next) => {
  if (req.user.admin === false && req.params.userId !== req.user.id) {
    return next(new ErrorHandler(403, 'Action not allowed'));
  }

  //allow notificationSettings to save without additional params
  if (req.body.username || req.body.email) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = errors.errors[0].nestedErrors[0];
      return next(new ErrorHandler(400, `${error?.param}: ${error?.value} - ${error?.msg}`));
    }
  }

  try {
    const user = await userService.updateUser(req.params.userId, req.body);
    res.status(200).send({
      name: user.name,
      username: user.username,
      email: user.email,
      aboutMe: user.aboutMe,
      profilePicture: user.profilePicture,
      alpacaBuilderProps: user.alpacaBuilderProps,
    });
  } catch (err) {
    next(new ErrorHandler(422, err.message));
  }
};

const updateUserConsent = async (req, res, next) => {
  const userId = req.user.id;
  try {
    const updatedUser = await userService.updateUserConsent(userId);
    return res.status(200).json(updatedUser);
  } catch (err) {
    if (err.message === 'NOT_FOUND') {
      next(new ErrorHandler(404, 'User not found'));
    } else {
      next(new ErrorHandler(422, err.message));
    }
  }
};

const updateUserPreferences = async (req, res, next) => {
  if (req.user.admin === false && req.params.userId !== req.user.id) {
    return next(new ErrorHandler(403, 'Action not allowed'));
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = errors.errors[0];
    return next(new ErrorHandler(400, `${error?.param}: ${error?.value} - ${error?.msg}`));
  }

  try {
    await userService.updateUserPreferences(req.params.userId, req.body.preferences);
    res.status(200).send();
  } catch (err) {
    next(new ErrorHandler(422, err.message));
  }
};

const getUserStats = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await userService.getUserById(userId);
    const stats = await statsService.getUserStats(userId).catch((err) => {
      console.error('[getUserStats] err', err);
    });

    res.status(200).json({
      userId: userId,
      username: _.get(user, 'username'),
      stats,
    });
  } catch (err) {
    console.error(err);
    next(new ErrorHandler(422, 'Get user stats failed'));
  }
};

const getUserCount = async (req, res) => {
  const total = await User.countDocuments().exec();
  res.json({
    total,
  });
};

const updateStatus = async (req, res, next) => {
  if (!req.user.admin) {
    return next(new ErrorHandler(403, 'Action not allowed'));
  }

  try {
    await userService.updateStatus(req.params.userId, req.body.status);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    next(new ErrorHandler(500, 'User could not be locked'));
  }
};

const startKycVerification = async (req, res) => {
  const { userId } = req.params;
  const user = await User.findById(userId);
  if (!user) {
    res.writeHeader(200, { 'Content-Type': 'text/html' });
    res.write(`<h1>KYC Result</h1><p>Something went wrong, please try again.</p>`);
    res.end();
  }

  const fractalUiDomain = process.env.FRACTAL_FRONTEND_DOMAIN;
  const redirectUri = encodeURIComponent(process.env.FRACTAL_AUTH_CALLBACK_URL);
  const clientId = process.env.FRACTAL_CLIENT_ID;
  const scope = encodeURIComponent(process.env.FRACTAL_SCOPE);
  const state = userId;
  const query = `client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}`;
  let url = `https://${fractalUiDomain}/authorize?${query}`;
  res.redirect(url);
};

const getUserKycData = async (req, res, next) => {
  if (req.user.admin === false && req.params.userId !== req.user.id) {
    return next(new ErrorHandler(403, 'Action not allowed'));
  }
  const { userId } = req.params;
  const user = await User.findById(userId);
  if (!user) {
    return next(new ErrorHandler(404));
  }
  if (!user.kyc?.refreshToken) {
    return next(new ErrorHandler(422, `User hasn't completed yet kyc.`));
  }

  try {
    const accessToken = await kycService.getNewAccessToken(user.kyc.refreshToken);
    const result = await kycService.getUserInfoFromFractal(accessToken);
    res.status(200).send(result);
  } catch (err) {
    next(new ErrorHandler(422, err.message));
  }
};

const getKycStatus = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) {
      return next(new ErrorHandler(404, 'User not found'));
    }

    res.status(200).json({ status: user.kyc?.status || 'unknown' });
  } catch (err) {
    console.error(err);
    next(new ErrorHandler(422, err.message));
  }
};

const getUserTransactions = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await userService.getUserById(userId);
    if (!user) return next(new ErrorHandler(403, 'Action not allowed'));

    const transactionsAgent = new Transactions();
    const transactions = await transactionsAgent.getExternalTransactionLogs({
      where: [
        // wfair deposits
        {
          internal_user_id: userId,
          originator: ExternalTransactionOriginator.DEPOSIT,
        },
        // onramp
        {
          internal_user_id: userId,
          originator: ExternalTransactionOriginator.ONRAMP,
        },
        // withdrawals
        {
          internal_user_id: userId,
          originator: ExternalTransactionOriginator.WITHDRAW,
        },
        // crypto deposits
        {
          internal_user_id: userId,
          originator: ExternalTransactionOriginator.CRYPTO,
        },
      ],
    });

    res.status(200).json(transactions);
  } catch (err) {
    console.error(err);
    next(new ErrorHandler(422, err.message));
  }
};

const randomUsername = (req, res) => {
  const username = faker.internet.userName();
  return res.send({ username });
}

const buyWithCrypto = async (req, res, next) => {
  if (!req.user || !req.user.email) return next(new ErrorHandler(404, 'Email not found'));
  const { currency, wallet, amount, estimate } = req.body;
  const email = req.user.email;

  mailService
    .sendBuyWithCryptoEmail({
      currency,
      wallet,
      amount,
      estimate,
      email,
    })
    .then(() => {
      console.log('[BUY_WITH_CRYPTO]: Email sent');
    })
    .catch((e) => {
      console.error('[BUY_WITH_CRYPTO]: Error sending email', e);
    });

  return res.status(200).send('OK');
}

const buyWithFiat = async (req, res, next) => {
  if (!req.user || !req.user.email) return next(new ErrorHandler(404, 'Email not found'));
  const { currency, amount, estimate, userId } = req.body;
  const email = req.user.email;

  mailService
    .sendBuyWithFiatEmail({
      currency,
      userId,
      amount,
      estimate,
      email,
    })
    .then(() => {
      console.log('[BUY_WITH_FIAT]: Email sent');
    })
    .catch((e) => {
      console.error('[BUY_WITH_FIAT]: Error sending email', e);
    });

  return res.status(200).send('OK');
}

const cryptoPayChannel = async (req, res, next) => {
  if (!req.user) {
    return next(new ErrorHandler(403, 'Missing user data'));
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ErrorHandler(400, errors));
  }

  try {
    let response = await cryptopayService.getChannel(req.user.id, req.body.currency);

    if (!response) {
      response = await cryptopayService.createChannel(req.user.id, req.body.currency);
    }

    return res.status(200).send(response.data);
  } catch (e) {
    console.error(e.message);
    return next(new ErrorHandler(500, 'Failed to create cryptopay channel'));
  }
};

const generateMoonpayUrl = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return next(new ErrorHandler(400, errors));
  }

  const { amount, currency } = req.body;
  const { id, email } = req.user;

  try {
    const url = moonpayService.generateUrl(id, email, amount, currency);
    return res.status(200).send({ url });
  } catch (e) {
    console.error(e.message);
    return next(new ErrorHandler(500, 'Failed to create cryptopay channel'));
  }
};

const banUser = async (req, res, next) => {
  if (!req.user || !req.user.admin) {
    return next(new ErrorHandler(403, 'Action forbidden'));
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ErrorHandler(400, errors));
  }

  const bannedUserId = req.params.userId;
  const { duration, description } = req.body;

  if (req.user.id === bannedUserId) {
    return next(new ErrorHandler(400, 'You cannot ban yourself'));
  }

  try {
    const bannedUser = await userService.updateBanDeadline(bannedUserId, +duration, description);
    return res.status(200).send(getBanData(bannedUser));
  } catch (e) {
    console.error(e.message);
    return next(new ErrorHandler(500, 'Failed to ban user'));
  }
};

const refreshKycRoute = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const userData = await userService.getUserById(userId);

    const refreshToken = userData?.kyc?.refreshToken;

    let output = {};

    if (refreshToken) {
      output = await kycService.refreshUserKyc(userId, refreshToken);
    }

    return res.send(output);
  } catch (err) {
    console.error(err);
    next(new ErrorHandler(422, err.message));
  }
}

const claimPromoCode = async (req, res, next) => {
  try {
    await casinoContract.claimPromoCode(
      req.user.id,
      req.body.promoCode,
      req.body.refId || PROMO_CODE_DEFAULT_REF
    );
    console.log(
      `User ${req.user.id} successfully claimed promo code ${req.body.promoCode}. Reference: ${req.body.refId}`
    );
    return res.status(204).send();
  } catch (e) {
    console.error('PROMO CODES ERROR: ', e.message);
    return next(`Failed to claim promo code ${req.body.promoCode}`);
  }
};

const verifySms = async (req, res, next) => {
  // Validating User Inputs
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ErrorHandler(422, 'Invalid verification code or phone'));
  }

  // Defining User Inputs
  const { phone, smsToken, userId } = req.body;

  const user = await userService.getUserById(userId);
  if (!user) {
    throw new Error('User not found, please try again', 422);
  }
  try {
    await userService.verifySms(user, phone, smsToken);

    res.status(200).send();
  } catch (err) {
    console.log(err);
    next(new ErrorHandler(422, 'Invalid verification code'));
  }
};

const sendSms = async (req, res, next) => {
  // Validating User Inputs
  const errors = validationResult(req);

  // Defining User Inputs
  const { phone } = req.body;

  if (!errors.isEmpty()) {
    return next(new ErrorHandler(422, 'Invalid phone number: ' + phone));
  }

  //Verify if phone number is already linked to another user
  const user = await userService.getUserByPhone(phone);
  if (user) {
    return next(new ErrorHandler(422, 'Phone number already linked to another user: ' + phone));
  }

  try {
    await userService.sendSms(phone);
    res.status(200).send();
  } catch (err) {
    next(new ErrorHandler(422, 'Unable to send SMS to: ' + phone));
  }
};

const claimTokens = async (req, res, next) => {
  if (process.env.PLAYMONEY !== 'true') {
    return next(new ErrorHandler(403, 'Action not allowed'));
  }

  try {
    await userService.claimTokens(req.user.id);
    res.status(204).send();
  } catch (err) {
    console.error(err.message);
    next(new ErrorHandler(500, err.message));
  }
};

const uploadImage = async (req, res, next) => {
  try {
    const imgPath = await awsS3Service.upload(req.user.id, { src: req.body.src, filename: req.body.filename });
    res.status(200).send({
      url: imgPath.split('?')[0]
    });
  } catch (err) {
    console.error(err.message);
    next(new ErrorHandler(500, err.message));
  }
}

exports.bindWalletAddress = bindWalletAddress;
exports.saveAdditionalInformation = saveAdditionalInformation;
exports.saveAcceptConditions = saveAcceptConditions;
exports.getUserInfo = getUserInfo;
exports.getBasicUserInfo = getBasicUserInfo;
exports.getRefList = getRefList;
exports.getOpenBetsList = getOpenBetsList;
exports.getHistory = getHistory;
exports.getTradeHistory = getTradeHistory;
exports.confirmEmail = confirmEmail;
exports.resendConfirmEmail = resendConfirmEmail;
exports.updateUser = updateUser;
exports.updateUserPreferences = updateUserPreferences;
exports.getLeaderboard = getLeaderboard;
exports.checkUsername = checkUsername;
exports.getUserStats = getUserStats;
exports.getUserCount = getUserCount;
exports.updateStatus = updateStatus;
exports.startKycVerification = startKycVerification;
exports.getUserTransactions = getUserTransactions;
exports.getUserKycData = getUserKycData;
exports.getKycStatus = getKycStatus;
exports.randomUsername = randomUsername;
exports.buyWithCrypto = buyWithCrypto;
exports.buyWithFiat = buyWithFiat;
exports.cryptoPayChannel = cryptoPayChannel;
exports.updateUserConsent = updateUserConsent;
exports.banUser = banUser;
exports.refreshKycRoute = refreshKycRoute;
exports.generateMoonpayUrl = generateMoonpayUrl;
exports.claimPromoCode = claimPromoCode;
exports.verifySms = verifySms;
exports.sendSms = sendSms;
exports.claimTokens = claimTokens;
exports.uploadImage = uploadImage;
