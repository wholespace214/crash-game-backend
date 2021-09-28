const dotenv = require('dotenv');

dotenv.config();
const { validationResult } = require('express-validator');
const { Erc20, Wallet } = require('@wallfair.io/smart_contract_mock');
const { User } = require('@wallfair.io/wallfair-commons').models;
const userService = require('../services/user-service');
const tradeService = require('../services/trade-service');
const { ErrorHandler } = require('../util/error-handler');
const { toPrettyBigDecimal, toCleanBigDecimal } = require('../util/number-helper');
const { WFAIR_REWARDS } = require('../util/constants');
const { BetContract } = require('@wallfair.io/smart_contract_mock');
const _ = require('lodash');

const WFAIR = new Erc20('WFAIR');

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

      await rewardRefUserIfNotConfirmed(user);
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
    await userService.rewardUserAction(user.ref, WFAIR_REWARDS.referral);
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
    .select({ username: 1, amountWon: 1 })
    .sort({ amountWon: -1 })
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
    const balance = await WFAIR.balanceOf(userId);
    const formattedBalance = toPrettyBigDecimal(balance);
    const { rank, toNextRank } = await userService.getRankByUserId(userId);

    res.status(200).json({
      userId: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      profilePicture: user.profilePicture,
      balance: formattedBalance,
      totalWin: userService.getTotalWin(balance).toString(),
      admin: user.admin,
      emailConfirmed: user.emailConfirmed,
      rank,
      toNextRank,
      amountWon: user.amountWon,
      preferences: user.preferences,
    });
  } catch (err) {
    next(new ErrorHandler(422, 'Account information loading failed'));
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
        const outcomes = trade._id.bet.outcomes || [];
        let outcomeBuy = 0;
        let outcomeSell = 0;

        if (outcomes.length) {
          const betContract = new BetContract(betId, outcomes.length);
          outcomeBuy = await betContract.calcBuy(
            BigInt(toCleanBigDecimal(parseFloat(trade.totalInvestmentAmount).toFixed(4)).getValue()),
            outcomeIndex
          );
          outcomeSell = await betContract.calcSellFromAmount(
            BigInt(toCleanBigDecimal(parseFloat(trade.totalOutcomeTokens).toFixed(4)).getValue()),
            outcomeIndex
          );
        }

        openBets.push({
          betId,
          outcome: outcomeIndex,
          investmentAmount: trade.totalInvestmentAmount,
          outcomeAmount: trade.totalOutcomeTokens,
          lastDate: trade.date,
          currentBuyAmount: toPrettyBigDecimal(outcomeBuy),
          sellAmount: toPrettyBigDecimal(outcomeSell),
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

const getTransactions = async (req, res, next) => {
  const { user } = req;

  try {
    if (user) {
      const wallet = new Wallet(user.id);
      const trx = await wallet.getTransactions();

      res.status(200).json(trx);
    } else {
      return next(new ErrorHandler(404, 'User not found'));
    }
  } catch (err) {
    console.error(err);
    next(new ErrorHandler(500, err.message));
  }
};

const getAMMHistory = async (req, res, next) => {
  const { user } = req;

  try {
    if (user) {
      const wallet = new Wallet(user.id);
      const interactions = await wallet.getAMMInteractions();
      const transactions = [];

      for (const interaction of interactions) {
        const investmentAmount = toPrettyBigDecimal(BigInt(interaction.investmentamount));
        const feeAmount = toPrettyBigDecimal(BigInt(interaction.feeamount));
        const outcomeTokensBought = toPrettyBigDecimal(BigInt(interaction.outcometokensbought));

        transactions.push({
          ...interaction,
          investmentAmount,
          feeAmount,
          outcomeTokensBought,
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
    const wallet = new Wallet(user.id);
    const interactions = await wallet.getAMMInteractions();
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
          sellInteractions.map(_.property('investmentamount')).map(Number).filter(_.isFinite)
        );
        soldAmount = toPrettyBigDecimal(BigInt(totalSellAmount || 0));
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

  // Defining User Inputs
  const { code, userId } = req.query;

  const user = await userService.getUserById(userId);

  if (user.emailConfirmed) {
    return next(new ErrorHandler(403, 'The email has been already confirmed'));
  }

  if (user.emailCode === code) {
    user.emailConfirmed = true;
    await user.save();
    await userService.rewardUserAction(user.ref, WFAIR_REWARDS.confirmEmail);
    res.status(200).send({ status: 'OK' });
  } else {
    next(new ErrorHandler(422, 'The email code is invalid'));
  }
};

const resendConfirmEmail = async (_, res, next) => {
  try {
    // const user = await userService.getUserById(req.user.id);
    // TODO: Provide event to resend confirmation mail
    res.status(200).send({ status: 'OK' });
  } catch (err) {
    next(new ErrorHandler(422, err.message));
  }
};

const updateUser = async (req, res, next) => {
  if (req.user.admin === false && req.params.userId !== req.user.id) {
    return next(new ErrorHandler(403, 'Action not allowed'));
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = errors.errors[0].nestedErrors[0];
    return next(new ErrorHandler(400, `${error?.param}: ${error?.value} - ${error?.msg}`));
  }

  try {
    await userService.updateUser(req.params.userId, req.body);
    res.status(200).send({ status: 'OK' });
  } catch (err) {
    next(new ErrorHandler(422, err.message));
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

exports.bindWalletAddress = bindWalletAddress;
exports.saveAdditionalInformation = saveAdditionalInformation;
exports.saveAcceptConditions = saveAcceptConditions;
exports.getUserInfo = getUserInfo;
exports.getRefList = getRefList;
exports.getOpenBetsList = getOpenBetsList;
exports.getTransactions = getTransactions;
exports.getAMMHistory = getAMMHistory;
exports.getTradeHistory = getTradeHistory;
exports.confirmEmail = confirmEmail;
exports.resendConfirmEmail = resendConfirmEmail;
exports.updateUser = updateUser;
exports.updateUserPreferences = updateUserPreferences;
exports.getLeaderboard = getLeaderboard;
