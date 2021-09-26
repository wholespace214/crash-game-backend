// Import Bet and Event models
const { Bet, Event } = require('@wallfair.io/wallfair-commons').models;

// Import services

const { BetContract, Erc20 } = require('@wallfair.io/smart_contract_mock');
const websocketService = require('./websocket-service');
const { publishEvent, notificationEvents } = require('./notification-service');

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

  const { date = undefined, endDate = undefined, resolved = false, canceled = false } = bet;

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

exports.listEvent = async () =>
  Event.find().populate('bets').map(calculateAllBetsStatus).map(filterPublishedBets);

exports.filterEvents = async (
  type = 'all',
  category = 'all',
  count = 10,
  page = 1,
  sortby = 'name',
  searchQuery
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
    .collation({ locale: 'en' })
    .sort(sortby)
    .lean();
};

exports.getEvent = async (id) =>
  Event.findOne({ _id: id }).populate('bets').map(calculateAllBetsStatus).map(filterPublishedBets);

exports.getCoverEvent = async (type) => {
  // TODO Sort events by number of UniversalEvent associated with it
  if (type === 'streamed') {
    return Event.find({ type, state: 'online' }).sort({ date: -1 }).limit(1).lean();
  } else {
    return Event.find({ type }).sort({ date: -1 }).limit(1).lean();
  }
};

exports.getBet = async (id, session) =>
  Bet.findOne({ _id: id }).session(session).map(calculateBetStatus);

exports.placeBet = async (user, bet, investmentAmount, outcome) => {
  if (bet) {
    const eventId = bet.event;
    const betId = bet._id;

    await websocketService.emitPlaceBetToAllByEventId(
      eventId,
      betId,
      user,
      investmentAmount,
      outcome
    );
  }
};

exports.pullOutBet = async (user, bet, amount, outcome, currentPrice) => {
  if (bet) {
    const eventId = bet.event;
    const betId = bet._id;

    await websocketService.emitPullOutBetToAllByEventId(
      eventId,
      betId,
      user,
      amount,
      outcome,
      currentPrice
    );

    publishEvent(notificationEvents.EVENT_BET_CASHED_OUT, {
      producer: 'user',
      producerId: user.id,
      data: { bet, amount: amount.toString(), currentPrice: currentPrice.toString(), outcome },
    });
  }
};

exports.isBetTradable = (bet) => bet.status === BET_STATUS.active;

/**
 *
 * @param Object bet
 * @param String userId
 */
exports.betCreated = async (bet, userId) => {
  if (bet) {
    const eventId = bet.event;
    const betId = bet._id;

    publishEvent(notificationEvents.EVENT_NEW_BET, {
      producer: 'user',
      producerId: userId,
      data: { bet },
    });

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

exports.saveEvent = async (event, session) => {
  event.save({ session });

  publishEvent(notificationEvents.EVENT_NEW, {
    producer: 'system',
    producerId: 'notification-service',
    data: { event },
  });
};
exports.editEvent = async (eventId, userData) => {
  const updatedEvent = await Event.findByIdAndUpdate(eventId, userData, { new: true });

  publishEvent(notificationEvents.EVENT_UPDATED, {
    producer: 'system',
    producerId: 'notification-service',
    data: { updatedEvent },
  });

  return updatedEvent;
};

exports.saveBet = async (bet, session) => bet.save({ session });

exports.getTags = async () => Event.distinct('tags.name').exec();

const getTimeOption = (rangeType, rangeValue) => {
  if (rangeType === 'day' && rangeValue === '7') {
    return '7days';
  } else if (rangeType === 'day' && rangeValue === '30' ){
    return '30days';
  }
  return '24hours';
}

function padData(values, now) {
  // if there is one point on the graph, add point for today
  // so the client can draw a line
  return value.length > 1
    ? values
    : [...values, { x: now.toISOString(), y: values[0].y }]
}

exports.combineBetInteractions = async (bet, direction, rangeType, rangeValue) => {
  const betContract = new BetContract(bet.id, bet.outcomes.length);
  const timeOption = getTimeOption(rangeType, rangeValue);
  const allPrices = await betContract.getAmmPriceActions(timeOption);

  const toXY = action => ({ x: action.trxTimestamp, y: action.quote });
  const lookup = allPrices.reduce((agg, current) => ({
    ...agg,
    [current.outcomeIndex]: [...(agg[current.outcomeIndex] ?? []), toXY(current)],
  }), {});

  // add an extra point if there is one value so the client can draw a line
  const now = new Date();
  const lookupWithExtraValues = Object.fromEntries(
    Object.keys(lookup).map(key => [key, padData(lookup[key], now)]),
  );

  return bet.outcomes.map(outcome => ({
    outcomeName: outcome.name,
    outcomeIndex: outcome.index,
    data: lookupWithExtraValues[outcome.index] ?? [],
  }));
};
