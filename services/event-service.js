// Import Bet and Event models
const { Bet, Event } = require('@wallfair.io/wallfair-commons').models;

// Import services

const { BetContract, Erc20 } = require('@wallfair.io/smart_contract_mock');
const websocketService = require('./websocket-service');
const { toPrettyBigDecimal } = require('../util/number-helper');
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

function getPrice(interaction) {
  const priceRaw = Number(interaction.investmentamount) / Number(interaction.outcometokensbought);
  return priceRaw.toFixed(2);
}

function getPadValue(data, startIndex) {
  let index = startIndex;
  while (index > 0) {
    index = index -= 1;
    const candidate = data[index].y;
    if (candidate) {
      return candidate;
    }
  }

  // hack to make some values in sparse array
  const base = startIndex / 400;
  const variance = Math.random() * 0.05;
  return base + variance;
}

function padData(response) {
  return response.map(entry => ({
    ...entry,
    data: entry.data.map((d, idx) => ({
      ...d,
      y: d.y ?? getPadValue(entry.data.slice(1), idx),
    }))
  }));
}

exports.combineBetInteractions = async (bet, direction, rangeType, rangeValue) => {
  // todo: rewrite to show correct prices for options
  const tmpChartData = [];
  let startDate;
  let tmpDay;

  switch (rangeType) {
    case 'hour':
      startDate = new Date(new Date().getTime() - rangeValue * 60 * 60 * 1000);
      tmpDay = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate(),
        startDate.getHours(),
        0,
        0
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

  const firstRangeValue = new Date(tmpChartData[0].x);
  const startTime = new Date(firstRangeValue.getTime());
  startTime.setHours(firstRangeValue.getHours() - 1);
  const startValue = {
    x: startTime.toISOString(),
    y: 1 / bet.outcomes.length,
  };

  const data = bet.outcomes.map(outcome => {
    const outcomeInteractions = interactions.filter(i => i.outcome === outcome.index);
    const baseResult = tmpChartData.map(x => ({ ...x }));
    const chartData = baseResult.map(b => {
      const interaction = outcomeInteractions
        .find(i => new Date(i.trx_timestamp).getHours() === new Date(b.x).getHours() &&
          new Date(i.trx_timestamp).getDate() === new Date(b.x).getDate());
      return {
        ...b,
        y: interaction && getPrice(interaction),
      }
    });
    return {
      outcomeName: outcome.name,
      outcomeIndex: outcome.index,
      data: [startValue, ...chartData],
    };
  });

  return padData(data);
};
