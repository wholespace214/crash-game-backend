// Import Bet and Event models
const { Bet, Event } = require('@wallfair.io/wallfair-commons').models;

// Import services

const { BetContract, Erc20 } = require('@wallfair.io/smart_contract_mock');
const websocketService = require('./websocket-service');
const { toPrettyBigDecimal } = require('../util/number-helper');

const WFAIR = new Erc20('WFAIR');

const BET_STATUS = {
  upcoming: 'upcoming',
  active: 'active',
  closed: 'closed',
  resolved: 'resolved',
  canceled: 'canceled',
};
exports.BET_STATUS = BET_STATUS;

const calculateBetStatus = (bet) => {
  let status = BET_STATUS.active;

  const {
    date = undefined,
    endDate = undefined,
    evidenceActual = '',
    evidenceDescription = '',
    resolved = false,
    canceled = false,
  } = bet;

  const now = new Date();
  if (date && Date.parse(date) >= now) {
    status = BET_STATUS.upcoming;
  } else if (date && endDate && Date.parse(endDate) <= now) {
    status = BET_STATUS.closed;
  }

  if (resolved) {
    status = BET_STATUS.resolved;
  } else if (canceled) {
    status = BET_STATUS.canceled;
  }

  bet.status = status;
  return bet;
};
exports.calculateBetStatus = calculateBetStatus;

const calculateEventAllBetsStatus = (event) => {
  for (const bet of event.bets || []) {
    calculateBetStatus(bet);
  }
  return event;
};

const calculateAllBetsStatus = (eventOrArray) => {
  const array = Array.isArray(eventOrArray) ? eventOrArray : [eventOrArray];

  array.forEach((event) => calculateEventAllBetsStatus(event));

  return eventOrArray;
};
exports.calculateAllBetsStatus = calculateAllBetsStatus;

const filterPublishedBets = (eventOrArray) => {
  const array = Array.isArray(eventOrArray) ? eventOrArray : [eventOrArray];

  array.forEach((event) => {
    event.bets = (event.bets || []).filter((bet) => bet.published);
  });

  return eventOrArray;
};
exports.filterPublishedBets = filterPublishedBets;

exports.listEvent = async (linkedTo) => Event.find().populate('bets').map(calculateAllBetsStatus).map(filterPublishedBets);

exports.filterEvents = async (
  type = 'all',
  category = 'all',
  count = 10,
  page = 1,
  sortby = 'name',
  searchQuery,
) => {
  const query = {};

  // only filter by type if it is not 'all'
  if (type !== 'all') {
    query.type = type;
  }

  if (category !== 'all') {
    query.category = category;
  }

  // only filter by searchQuery if it is present
  if (searchQuery) {
    query.name = { $regex: searchQuery, $options: 'i' };
  }

  return Event.find(query)
    .limit(count)
    .skip(count * (page - 1))
    .sort(sortby)
    .lean();
};

exports.getEvent = async (id) => Event.findOne({ _id: id })
  .populate('bets')
  .map(calculateAllBetsStatus)
  .map(filterPublishedBets);

exports.getBet = async (id, session) => Bet
  .findOne({ _id: id })
  .session(session)
  .map(calculateBetStatus);

exports.placeBet = async (user, bet, investmentAmount, outcome) => {
  if (bet) {
    const userId = user.id;
    const eventId = bet.event;
    const betId = bet._id;

    await websocketService.emitPlaceBetToAllByEventId(
      eventId,
      userId,
      betId,
      investmentAmount,
      outcome,
    );
  }
};

exports.pullOutBet = async (user, bet, amount, outcome, currentPrice) => {
  if (bet) {
    const userId = user.id;
    const eventId = bet.event;
    const betId = bet._id;

    await websocketService.emitPullOutBetToAllByEventId(
      eventId,
      userId,
      betId,
      amount,
      outcome,
      currentPrice,
    );
  }
};

exports.isBetTradable = (bet) => bet.status === BET_STATUS.active;

exports.betCreated = async (bet, userId) => {
  if (bet) {
    const eventId = bet.event;
    const betId = bet._id;

    await websocketService.emitBetCreatedByEventId(eventId, userId, betId, bet.title);
  }
};

exports.provideLiquidityToBet = async (createBet) => {
  const LOG_TAG = '[CREATE-BET]';
  const liquidityAmount = 214748n;
  const liquidityProviderWallet = `LIQUIDITY_${createBet.id}`;
  const betContract = new BetContract(createBet.id, createBet.outcomes.length);

  console.debug(LOG_TAG, 'Minting new Tokens');
  await WFAIR.mint(liquidityProviderWallet, liquidityAmount * WFAIR.ONE);
  console.debug(LOG_TAG, 'Adding Liquidity to the Event');
  await betContract.addLiquidity(liquidityProviderWallet, liquidityAmount * WFAIR.ONE);
};

exports.saveEvent = async (event, session) => event.save({ session });
exports.editEvent = async (eventId, userData) => {
  const updatedEvent = await Event.findByIdAndUpdate(eventId, userData, { new: true });
  return updatedEvent;
};

exports.saveBet = async (bet, session) => bet.save({ session });

exports.getTags = async (params = {}) => Event.distinct('tags.name').exec();

exports.combineBetInteractions = async (bet, direction, rangeType, rangeValue) => {
  const response = [];
  const tmpChartData = [];
  let startDate; let
    tmpDay;

  switch (rangeType) {
    case 'hour':
      startDate = new Date(new Date().getTime() - rangeValue * 60 * 60 * 1000);
      tmpDay = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate(),
        startDate.getHours(),
        0,
        0,
      );

      for (let i = 1; i <= rangeValue; i++) {
        tmpChartData.push({
          x: new Date(tmpDay.getTime() + i * 1000 * 60 * 60),
          y: 0,
        });
      }
      break;
    case 'day':
      startDate = new Date(Date.now() - rangeValue * 24 * 60 * 60 * 1000);
      tmpDay = new Date(startDate);

      for (let i = 1; i <= rangeValue; i++) {
        tmpChartData.push({
          x: new Date(tmpDay.getTime() + i * 1000 * 60 * 60 * 24),
          y: 0,
        });
      }
      break;
  }

  const betContract = new BetContract(bet.id, bet.outcomes.length);
  const interactions = await betContract.getBetInteractions(startDate, direction);
  const summary = await betContract.getBetInteractionsSummary(direction, startDate);

  bet.outcomes.forEach((outcome) => {
    const chartData = tmpChartData.map((tmp) => ({ ...tmp }));
    const initValue = +summary.filter((e) => e.outcome === outcome.index)[0]?.amount || 0;
    const interactionHours = [];
    const interactionDays = [];
    const interactionAmounts = [];

    interactions.forEach((interaction) => {
      if (interaction.outcome === outcome.index) {
        interactionHours.push(new Date(interaction.trx_timestamp).getHours());
        interactionDays.push(new Date(interaction.trx_timestamp).getDate());
        interactionAmounts.push(+interaction.investmentamount);
      }
    });

    chartData.map((entry, index) => {
      if (index === 0) {
        entry.y = initValue;
      } else {
        entry.y = chartData[index - 1].y;
      }

      if (rangeType === 'hour') {
        interactionHours.forEach((hour, index) => {
          if (hour === new Date(entry.x).getHours()) {
            entry.y += interactionAmounts[index];
          }
        });
      } else {
        interactionDays.forEach((day, index) => {
          if (day === new Date(entry.x).getDate()) {
            entry.y += interactionAmounts[index];
          }
        });
      }
    });

    chartData.forEach((entry) => {
      entry.y = parseFloat(toPrettyBigDecimal(entry.y));
    });

    response.push({
      outcomeName: outcome.name,
      outcomeIndex: outcome.index,
      data: chartData,
    });
  });

  return response;
};
