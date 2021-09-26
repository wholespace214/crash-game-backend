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

exports.listEvents = async (q) => {
  return Event.find(q).populate('bets')
    .map(calculateAllBetsStatus)
    .map(filterPublishedBets);
}

exports.filterEvents = async (
  type = 'all',
  category = 'all',
  count = 10,
  page = 1,
  sortby = 'name',
  searchQuery,
  betFilter = null,
  includeOffline = false,
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

  if (!includeOffline) {
    query.state = { $ne: "offline" };
  }

  const op = Event.find(query)
    .limit(count)
    .skip(count * (page - 1))
    .collation({ locale: 'en' })
    .sort(sortby)

  if (betFilter) {
    op.find(betFilter)
  }

  return op.lean();
};

exports.getEvent = async (id) =>
  Event.findOne({ _id: id }).populate('bets').map(calculateAllBetsStatus).map(filterPublishedBets);

exports.getCoverEvent = async (type) => {
  // TODO Sort events by number of UniversalEvent associated with it
  if (type === 'streamed') {
    return Event.find({
      type,
      state: 'online',
      bets: {
        $exists: true,
        $type: 'array',
        $ne: [],
      },
    })
      .sort({ date: -1 })
      .limit(1)
      .lean();
  } else {
    return Event.find({ type, bets: { $not: { $size: 0 } } }).sort({ date: -1 }).limit(1).lean();
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
  const liquidityAmount = 100_0000n; // bets start with 100 liquidity
  const liquidityProviderWallet = `LIQUIDITY_${createBet.id}`;
  const betContract = new BetContract(createBet.id, createBet.outcomes.length);

  console.debug(LOG_TAG, 'Minting new Tokens');
  await WFAIR.mint(liquidityProviderWallet, liquidityAmount * WFAIR.ONE);
  console.debug(LOG_TAG, 'Adding Liquidity to the Event');
  await betContract.addLiquidity(liquidityProviderWallet, liquidityAmount * WFAIR.ONE);
};

exports.saveEvent = async (event, session) => {
  const savedEvent = await event.save({ session });

  publishEvent(notificationEvents.EVENT_NEW, {
    producer: 'system',
    producerId: 'notification-service',
    data: { event },
  });

  return savedEvent;
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
  } else if (rangeType === 'day' && rangeValue === '30') {
    return '30days';
  }
  return '24hours';
}

function padData(values, now, rangeType, outcomeLength) {
  if (values.length > 1) {
    return values;
  }

  if (values.length === 0) {
    const clone = new Date(now.getTime());
    if (rangeType === 'hour') {
      clone.setHours(clone.getHours() - 1);
    } else {
      clone.setDate(clone.getDate() - 1);
    }
    const y = 1 / outcomeLength;
    return [
      { x: clone.toISOString(), y },
      { x: now.toISOString(), y },
    ];
  }
  return [...values, { x: now.toISOString(), y: values[0].y }];
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

  const now = new Date();
  return bet.outcomes.map(outcome => ({
    outcomeName: outcome.name,
    outcomeIndex: outcome.index,
    data: padData(lookup[outcome.index] ?? [], now, rangeType, bet.outcomes.length),
  }));
};
