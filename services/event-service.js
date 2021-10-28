// Import Bet and Event models
const { Bet, Event } = require('@wallfair.io/wallfair-commons').models;

// Import services

const { BetContract, Erc20 } = require('@wallfair.io/smart_contract_mock');
const { notificationEvents } = require('@wallfair.io/wallfair-commons/constants/eventTypes');
const amqp = require('./amqp-service');
const { onNewBet } = require('./quote-storage-service');
const mongoose = require('mongoose');
const { DEFAULT } = require('../util/constants');
const outcomesUtil = require('../util/outcomes');

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
  upcoming = false,
  deactivated = false,
  searchQuery,
  betFilter = null,
  includeOffline = false,
) => {
  const query = {
    "slug": { "$exists": true, "$ne": "" },
    "bets": { $ne: [] },
  };

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

  if (!includeOffline && !upcoming && !deactivated) {
    query.state = { $ne: "offline" };
  }

  query.deactivatedAt = { $exists: deactivated }
  query.date = upcoming ? { $gt: new Date() } : { $lt: new Date() };

  const op = Event.find(query)
    .populate('bets')
    .limit(count)
    .skip(count * (page - 1))
    .collation({ locale: 'en' })
    .sort(sortby)
    .map(calculateAllBetsStatus)
    .map(filterPublishedBets);

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

exports.pullOutBet = async (user, userId, bet, amount, outcome, currentPrice, calculatedGain) => {
  if (bet) {
    amqp.send('universal_events', 'event.bet_cashed_out', JSON.stringify({
      event: notificationEvents.EVENT_BET_CASHED_OUT,
      producer: 'user',
      producerId: userId,
      data: { bet, amount: amount.toString(), currentPrice: currentPrice.toString(), outcome, user, gain: calculatedGain },
      date: Date.now(),
      broadcast: true
    }));
  }
};

exports.isBetTradable = (bet) => bet.status === BET_STATUS.active;

/**
 *
 * @param Object bet
 * @param String userId
 */
exports.betCreated = async (bet, user) => {
  if (bet) {
    amqp.send('universal_events', 'event.new_bet', JSON.stringify({
      event: notificationEvents.EVENT_NEW_BET,
      producer: 'user',
      producerId: user.id,
      data: {
        bet, user: {
          username: user.username,
          profilePicture: user.profilePicture,
          name: user.name,
          amountWon: user.amountWon
        }
      },
      date: Date.now(),
      broadcast: true
    }));

    await onNewBet(bet);
  }
};

exports.provideLiquidityToBet = async (createBet, probabilityDistribution, liquidityAmount = DEFAULT.betLiquidity) => {
  const LOG_TAG = '[CREATE-BET]';
  const liquidityProviderWallet = `LIQUIDITY_${createBet.id}`;
  const betContract = new BetContract(createBet.id, createBet.outcomes.length);
  const liquidity = BigInt(liquidityAmount) * WFAIR.ONE;
  const outcomeBalanceDistribution = outcomesUtil.getOutcomeBalancesByProbability(liquidity, probabilityDistribution);

  console.debug(LOG_TAG, 'Minting new Tokens');
  await WFAIR.mint(liquidityProviderWallet, liquidity);
  console.debug(LOG_TAG, 'Adding Liquidity to the Event');
  await betContract.addLiquidity(
    liquidityProviderWallet,
    liquidity,
    outcomeBalanceDistribution,
  );
};

exports.saveEvent = async (event, session, existing = false) => {
  const savedEvent = await event.save({ session });

  if (!existing) {
    amqp.send('universal_events', 'event.new_event', JSON.stringify({
      event: notificationEvents.EVENT_NEW,
      producer: 'system',
      producerId: 'notification-service',
      data: { event },
      date: Date.now(),
      broadcast: true
    }));
  }

  return savedEvent;
};

exports.editEvent = async (eventId, userData) => {
  const updatedEvent = await Event.findByIdAndUpdate(eventId, userData, { new: true });

  amqp.send('universal_events', 'event.event_updated', JSON.stringify({
    event: notificationEvents.EVENT_UPDATED,
    producer: 'system',
    producerId: 'notification-service',
    data: { updatedEvent },
    date: Date.now(),
    broadcast: true
  }));

  return updatedEvent;
};

exports.deleteEvent = async (eventId) => {
  await Bet.updateMany({ event: eventId }, { event: null });
  return await Event.findByIdAndDelete(eventId);
}

exports.bookmarkEvent = async (eventId, userId) => {
  const event = await Event.findById(eventId)
  if (event && event.bookmarks) {
    event.bookmarks.push(mongoose.Types.ObjectId(userId));
    return event.save()
  } else {
    throw new Error('Event not found')
  }
}

exports.bookmarkEventCancel = async (eventId, userId) => {
  const event = await Event.findById(eventId)
  if (event && event.bookmarks) {
    event.bookmarks.pull(mongoose.Types.ObjectId(userId));
    return event.save()
  } else {
    throw new Error('Event not found')
  }
}

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

function padData(values, now, rangeType, outcomeIndex, lookup) {
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
    const y = lookup.get(outcomeIndex);
    return [
      { x: clone.toISOString(), y },
      { x: now.toISOString(), y },
    ];
  }
  return [...values, { x: now.toISOString(), y: values[0].y }];
}

async function getLatestPriceLookup(betContract) {
  const latestPrices = await betContract.getLatestPriceActions();
  return new Map(latestPrices.map(p => ([
    p.outcomeindex,
    Number(p.quote),
  ])));
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

  const latestQuotes = await getLatestPriceLookup(betContract);

  const now = new Date();
  return bet.outcomes.map(outcome => ({
    outcomeName: outcome.name,
    outcomeIndex: outcome.index,
    data: padData(lookup[outcome.index] ?? [], now, rangeType, outcome.index, latestQuotes),
  }));
};
