// Import and configure dotenv to enable use of environmental variable
const dotenv = require('dotenv');
dotenv.config();

const _ = require('lodash');
// Imports from express validator to validate user input
const { validationResult } = require('express-validator');

// Import User and Bet model
const { User, Bet } = require('@wallfair.io/wallfair-commons').models;

// Import Auth Service
// const { BetContract } = require('@wallfair.io/smart_contract_mock');
const eventService = require('../services/event-service');
const userService = require('../services/user-service');
const tradeService = require('../services/trade-service');
const betService = require('../services/bet-service');

const { ErrorHandler } = require('../util/error-handler');
const { toScaledBigInt, fromScaledBigInt, calculateGain} = require('../util/number-helper');
const { isAdmin } = require('../helper');
const { calculateAllBetsStatus } = require('../services/event-service');
const { DEFAULT } = require('../util/constants');
const { getProbabilityMap } = require('../util/outcomes');
const logger = require('../util/logger');

const listBets = async (req, res, next) => {
  try {
    const betList = await betService.listBets();
    return res.status(200).json(calculateAllBetsStatus(betList));

  } catch (err) {
    logger.error(err);
    next(res.status(422).send(err));
  }
};

const filterBets = async (req, res, next) => {
  try {
    const { category, sortby, searchQuery, type, status, published, resolved, canceled } = req.params;
    const count = +req.params.count;
    const page = +req.params.page;

    const betList = await betService.filterBets(
      type,
      category,
      count,
      page,
      sortby,
      searchQuery,
      status,
      published,
      resolved,
      canceled,
    );

    return res.status(200).json(betList);

  } catch (err) {
    logger.error(err);
    next(res.status(422).send(err));
  }
};

const createBet = async (req, res, next) => {
  const LOG_TAG = '[CREATE-BET]';
  // Validating User Inputs
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ErrorHandler(422, 'Invalid input passed, please check it'));
  }

  try {
    const {
      event: eventId,
      marketQuestion,
      slug,
      outcomes,
      description,
      evidenceSource,
      evidenceDescription,
      date,
      published,
      endDate,
      liquidity = DEFAULT.betLiquidity,
    } = req.body;

    let event = await eventService.getEvent(eventId);
    if (!event) {
      return next(new ErrorHandler(404, 'Event not found'));
    }

    if (event.type === 'non-streamed' && event.bets.length === 1) {
      return next(new ErrorHandler(422, 'Non-streamed events can only have one bet.'));
    }

    console.debug(LOG_TAG, event);
    console.debug(LOG_TAG, {
      event: eventId,
      marketQuestion,
      slug,
      outcomes,
      evidenceSource,
      evidenceDescription,
      date: new Date(date),
      published,
      creator: req.user.id,
      endDate: new Date(endDate),
    });

    const createdBet = new Bet({
      event: eventId,
      marketQuestion,
      slug,
      outcomes: outcomes.map(({ name }, index) => ({ index, name })),
      description,
      evidenceSource,
      evidenceDescription,
      date: new Date(date),
      creator: req.user.id,
      published,
      endDate: new Date(endDate),
    });

    const session = await Bet.startSession();
    try {
      await session.withTransaction(async () => {
        console.debug(LOG_TAG, 'Save Bet to MongoDB');
        const dbBet = await eventService.saveBet(createdBet, session);

        if (!event.bets) event.bets = [];

        console.debug(LOG_TAG, 'Save Bet to Event');
        event.bets.push(dbBet._id);
        event = await eventService.saveEvent(event, session, true);

        await eventService.provideLiquidityToBet(
          createdBet,
          getProbabilityMap(outcomes),
          liquidity
        );
      });

      await eventService.betCreated(createdBet, req.user);
    } finally {
      await session.endSession();
    }
    await event.save();
    return res.status(201).json(event);
  } catch (err) {
    console.error(err.message);
    return next(new ErrorHandler(422, err.message));
  }
};

const editBet = async (req, res, next) => {
  if (!isAdmin(req)) return next(new ErrorHandler(403, 'Action not allowed'));

  try {
    const existingBet = await Bet.findById(req.params.betId);
    if (!existingBet) {
      return next(new ErrorHandler(404, 'Bet not found.'));
    }

    const { outcomes: oldOutcomes } = existingBet;
    const { outcomes: newOutcomes } = req.body;

    const indexes = ({ index }) => +index;

    if (
      oldOutcomes.length !== newOutcomes.length ||
      new Set([ // uniqify all indexes to ensure no new ones are added
        ...newOutcomes.map(indexes),
        ...oldOutcomes.map(indexes),
      ]).size !== oldOutcomes.length
    ) {
      return next(new ErrorHandler(400, 'Cannot change outcome indexes or add/remove outcomes.'));
    }

    if (
      new Set(newOutcomes.map(indexes)).size !== newOutcomes.length
    ) {
      return next(new ErrorHandler(400, 'Outcome indexes must be unique.'));
    }

    const updatedEntry = await betService.editBet(req.params.betId, req.body);
    if (!updatedEntry) {
      return res.status(500).send();
    }
    return res.status(200).json(updatedEntry);
  } catch (err) {
    return next(new ErrorHandler(422, err.message));
  }
};

const placeBet = async (req, res, next) => {
  // Validating User Inputs
  const errors = validationResult(req);

  const { amount, outcome, minOutcomeTokens } = req.body;

  if (!errors.isEmpty() || amount <= 0) {
    return next(new ErrorHandler(422, 'Invalid input passed, please check it'));
  }

  try {
    const response = await betService.placeBet(
      req.user.id,
      req.params.id,
      amount,
      outcome,
      minOutcomeTokens
    );

    await userService.checkTotalBetsAward(req.user.id).catch((err)=> {
      console.error('checkTotalBetsAward', err);
    });

    return res.status(200).json(response);
  } catch (err) {
    console.error(err);
    return next(new ErrorHandler(422, err.message));
  }
};

const getTrade = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ErrorHandler(422, 'Invalid input passed, please check it'));
  }

  try {
    let trade = await betService.getTrade(req.params.id);

    return res.status(200).json(trade);
  } catch (err) {
    console.error(err);
    return next(new ErrorHandler(422, err.message));
  }
};

const pullOutBet = async (req, res, next) => {
  const LOG_TAG = '[PULLOUT-BET]';
  // Validating User Inputs
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ErrorHandler(422, 'Invalid input passed, please check it'));
  }

  try {
    // Defining User Inputs
    const { outcome, minReturnAmount } = req.body;
    const { id } = req.params;

    let requiredMinReturnAmount = 0n;
    // if (minReturnAmount) {
    //   requiredMinReturnAmount = toScaledBigInt(minReturnAmount);
    // }

    const userId = req.user.id;

    console.debug(LOG_TAG, 'Pulling out Bet', id, req.user.id);
    const bet = await eventService.getBet(id);

    if (!eventService.isBetTradable(bet)) {
      return next(
        new ErrorHandler(405, 'No further action can be performed on an event/bet that has ended!')
      );
    }

    const user = await userService.getUserReducedDataById(userId);
    // let sellAmount;

    const session = await User.startSession();
    let newBalances;
    try {


      await session
        .withTransaction(async () => {
          console.debug(LOG_TAG, 'Interacting with the AMM');
          // const betContract = new BetContract(id, bet.outcomes.length);
          //
          // sellAmount = await betContract.getOutcomeToken(outcome).balanceOf(userId);
          // console.debug(
          //   LOG_TAG,
          //   `SELL ${userId} ${sellAmount} ${outcome} ${requiredMinReturnAmount}`
          // );
          //
          // await tradeService.closeTrades(userId, bet, outcome, 'sold', session);
          // console.debug(LOG_TAG, 'Trades closed successfully');
          //
          // newBalances = await betContract.sellAmount(
          //   userId,
          //   sellAmount,
          //   outcome,
          //   requiredMinReturnAmount
          // );
          // console.debug(LOG_TAG, 'Successfully sold Tokens');
        })
        .catch((err) => console.error(err));

      const soldOutcomeTokens = _.get(newBalances, 'soldOutcomeTokens');
      const earnedTokens = _.get(newBalances, 'earnedTokens');
      const investedAmountNumber = fromScaledBigInt(soldOutcomeTokens) - fromScaledBigInt(earnedTokens);
      const earnedTokensNumber = parseFloat(fromScaledBigInt(earnedTokens));
      const calculatedGain = calculateGain(investedAmountNumber, earnedTokensNumber,2);

      await eventService.pullOutBet(
        user,
        userId,
        bet,
        fromScaledBigInt(newBalances?.earnedTokens),
        outcome,
        0n,
        calculatedGain
      );
    } catch (err) {
      console.error(err);
    } finally {
      await session.endSession();
    }

    res.status(200).json(bet);
  } catch (err) {
    console.error(err);
    next(new ErrorHandler(422, err.message));
  }
};

const calculateBuyOutcome = async (req, res, next) => {
  const errors = validationResult(req);

  const { amount } = req.body;
  const { id } = req.params;

  if (!errors.isEmpty() || amount <= 0) {
    return next(new ErrorHandler(422, 'Invalid input passed, please check it'));
  }

  try {
    // const bet = await Bet.findById(id);
    // const betContract = new BetContract(id, bet.outcomes.length);
    //
    // let buyAmount = toScaledBigInt(amount);
    //
    const result = [];
    //
    // for (const outcome of bet.outcomes) {
    //   const outcomeSellAmount = await betContract.calcBuy(buyAmount, outcome.index);
    //   result.push({ index: outcome.index, outcome: fromScaledBigInt(outcomeSellAmount) });
    // }

    res.status(200).json(result);
  } catch (err) {
    console.debug(err);
    next(new ErrorHandler(422, err.message));
  }
};

const calculateSellOutcome = async (req, res, next) => {
  const errors = validationResult(req);

  const { amount } = req.body;
  // const { id } = req.params;

  if (!errors.isEmpty() || amount <= 0) {
    return next(new ErrorHandler(422, 'Invalid input passed, please check it'));
  }

  try {
    // const bet = await Bet.findById(id);
    // const betContract = new BetContract(id, bet.outcomes.length);
    // const bigAmount = toScaledBigInt(amount);
    const result = [];
    //
    // for (const outcome of bet.outcomes) {
    //   const outcomeSellAmount = await betContract.calcSellFromAmount(
    //     bigAmount,
    //     outcome.index
    //   );
    //   result.push({ index: outcome.index, outcome: fromScaledBigInt(outcomeSellAmount) });
    // }

    res.status(200).json(result);
  } catch (err) {
    console.error(err);
    next(new ErrorHandler(422, err.message));
  }
};

const payoutBet = async (req, res, next) => {
  const LOG_TAG = '[PAYOUT-BET]';
  // Validating User Inputs
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ErrorHandler(422, 'Invalid input passed, please check it'));
  }

  try {
    const id = req.params.id;
    const session = await User.startSession();
    let bet = {};

    try {
      await session.withTransaction(async () => {
        console.debug(LOG_TAG, 'Payout Bet', id, req.user.id);
        bet = await eventService.getBet(id, session);
        const user = await userService.getUserById(req.user.id, session);

        console.debug(LOG_TAG, 'Payed out Bet');
        // TODO store more information in closedBets
        user.openBets = user.openBets.filter((item) => item !== bet.id);
        user.closedBets.push(bet.id);

        await userService.saveUser(user, session);

        console.debug(LOG_TAG, 'Requesting Bet Payout');
        // const betContract = new BetContract(id, bet.outcomes.length);
        // await betContract.getPayout(req.user.id);
      });
    } finally {
      await session.endSession();
    }
    res.status(201).json(bet);
  } catch (err) {
    console.error(err.message);
    next(new ErrorHandler(422, err.message));
  }
};

const resolveBet = async (req, res, next) => {
  if (!isAdmin(req)) {
    return next(new ErrorHandler(403, 'Action not allowed.'));
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ErrorHandler(422, errors));
  }

  try {
    const { id: betId } = req.params;
    const reporter = req.user.id;
    const { outcomeIndex, evidenceActual, evidenceDescription } = req.body;

    await betService.resolve({
      betId,
      outcomeIndex,
      evidenceActual,
      evidenceDescription,
      reporter,
    });

    res.status(200).send();
  } catch (err) {
    return next(new ErrorHandler(422, err.message));
  }
};

const cancelBet = async (req, res, next) => {
  if (!isAdmin(req)) {
    return next(new ErrorHandler(403, 'Action not allowed'));
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ErrorHandler(422, errors));
  }

  const { reasonOfCancellation } = req.body;
  const { id } = req.params;

  try {
    const bet = await Bet.findById(id);
    if (!bet) {
      return next(new ErrorHandler(404, 'Bet does not exist'));
    }

    const cancelledBet = await betService.cancel(bet, reasonOfCancellation);

    res.status(200).send(cancelledBet);
  } catch (err) {
    console.debug(err);
    next(new ErrorHandler(422, err.message));
  }

};

const deleteBet = async (req, res, next) => {
  if (!isAdmin(req)) {
    return next(new ErrorHandler(403, 'Action not allowed'));
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ErrorHandler(422, errors));
  }

  const { id } = req.params;
  try {
    const bet = await Bet.findById(id);
    if (!bet) {
      return next(new ErrorHandler(404, 'Bet does not exist.'));
    }
    if (!bet.canceled) {
      return next(new ErrorHandler(422, 'Bet must be cancelled prior to deletion.'));
    }

    const deletedBet = await Bet.findByIdAndDelete(id);

    res.status(200).send(deletedBet);
  } catch (err) {
    console.debug(err);
    next(new ErrorHandler(422, err.message));
  }
};

const betHistory = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ErrorHandler(422, errors));
  }

  const { direction, rangeType, rangeValue } = req.query;
  const { id } = req.params;

  try {
    const bet = await Bet.findById(id);
    if (!bet) {
      return next(new ErrorHandler(404, 'Bet does not exist'));
    }

    const interactionsList = await eventService.combineBetInteractions(
      bet,
      direction,
      rangeType,
      rangeValue
    );

    res.status(200).json(interactionsList);
  } catch (err) {
    console.debug(err);
    next(new ErrorHandler(422, err.message));
  }
};

const getOpenBetsList = async (request, response, next) => {
  const { betId } = request.params;
  try {
    const trades = await tradeService.getTradesByBetAndStatuses(betId,['active']);
    const openBets = trades.slice(0, 20);

    response.send({ openBets });
  } catch (error) {
    console.error(error);
    next(new ErrorHandler(500, error.message));
  }
}

exports.listBets = listBets;
exports.filterBets = filterBets;
exports.createBet = createBet;
exports.editBet = editBet;
exports.placeBet = placeBet;
exports.pullOutBet = pullOutBet;
exports.calculateBuyOutcome = calculateBuyOutcome;
exports.calculateSellOutcome = calculateSellOutcome;
exports.payoutBet = payoutBet;
exports.betHistory = betHistory;
exports.getTrade = getTrade;
exports.resolveBet = resolveBet;
exports.cancelBet = cancelBet;
exports.deleteBet = deleteBet;
exports.getOpenBetsList = getOpenBetsList;
