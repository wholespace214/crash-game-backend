// Import Event model
const Event = require('../models/Event');
const Bet   = require('../models/Bet');

//Import services
const websocketService = require('./websocket-service');
const smsService = require('./sms-notification-service');

const { BetContract, Erc20 } = require('smart_contract_mock');
const EVNT                   = new Erc20('EVNT');

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
        date=undefined,
        endDate=undefined,
        evidenceActual='',
        evidenceDescription='',
        resolved=false,
        canceled=false
    } = bet;

    const now = new Date();
    if(date && Date.parse(date) >= now) {
        status = BET_STATUS.upcoming;
    } else if(date && endDate && Date.parse(endDate) <= now) {
        status = BET_STATUS.closed;
    }

    if(resolved) {
        status = BET_STATUS.resolved;
    } else if (canceled) {
        status = BET_STATUS.canceled
    }

    bet.status = status;
    return bet;
}
exports.calculateBetStatus = calculateBetStatus;

const calculateEventAllBetsStatus = (event) => {
    for(const bet of event.bets || []) {
        calculateBetStatus(bet)
    }
    return event;
}

const calculateAllBetsStatus = (eventOrArray) => {
    const array = Array.isArray(eventOrArray) ? eventOrArray : [eventOrArray];

    array.forEach((event) => calculateEventAllBetsStatus(event))

    return eventOrArray
}
exports.calculateAllBetsStatus = calculateAllBetsStatus;

const filterPublishedBets = (eventOrArray) => {
    const array = Array.isArray(eventOrArray) ? eventOrArray : [eventOrArray];

    array.forEach((event) => {
        event.bets = (event.bets || []).filter((bet) => bet.published)
    })

    return eventOrArray
}
exports.filterPublishedBets = filterPublishedBets;

exports.listEvent = async (linkedTo) => {
 return Event.find().populate('bets').map(calculateAllBetsStatus).map(filterPublishedBets);
};


exports.getEvent = async (id) => {
    return Event.findOne({ _id: id }).populate('bets').map(calculateAllBetsStatus).map(filterPublishedBets);
};

exports.getBet = async (id, session) => {
    return Bet.findOne({ _id: id }).session(session).map(calculateBetStatus);
};

exports.placeBet = async (user, bet, investmentAmount, outcome) => {
    if (bet) {
        const userId = user.id;
        const eventId = bet.event;
        const betId   = bet._id;

        await websocketService.emitPlaceBetToAllByEventId(eventId, userId, betId, investmentAmount, outcome);
        await smsService.notifyPlacedBet(user, bet, investmentAmount, outcome);
    }
};

exports.pullOutBet = async (user, bet, amount, outcome, currentPrice) => {
    if (bet) {
        const userId = user.id;
        const eventId = bet.event;
        const betId   = bet._id;

        await websocketService.emitPullOutBetToAllByEventId(eventId, userId, betId, amount, outcome, currentPrice);
        await smsService.notifyPullOutBet(user, bet, amount, outcome);
    }
};

exports.isBetTradable = async (bet) => {
        const {status} = await Bet.findOne({_id: bet._id}, {status: 1}).exec()
        return status === BET_STATUS.active;

};

exports.betCreated = async (bet, userId) => {
    if (bet) {
        const eventId = bet.event;
        const betId   = bet._id;

        await websocketService.emitBetCreatedByEventId(eventId, userId, betId, bet.title);
    }
};


exports.provideLiquidityToBet = async (createBet) => {
    const LOG_TAG = '[CREATE-BET]';
    const liquidityAmount                                           = 214748n;
    const liquidityProviderWallet = 'LIQUIDITY_' + createBet.id;
    const betContract             = new BetContract(createBet.id, createBet.outcomes.length);

    console.debug(LOG_TAG, 'Minting new Tokens');
    await EVNT.mint(liquidityProviderWallet, liquidityAmount * EVNT.ONE);
    console.debug(LOG_TAG, 'Adding Liquidity to the Event');
    await betContract.addLiquidity(liquidityProviderWallet, liquidityAmount * EVNT.ONE);
}

exports.saveEvent = async (event, session) => {
    return event.save({session});
};

exports.saveBet = async (bet, session) => {
    return bet.save({session});
};