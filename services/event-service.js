// Import Event model
const Event = require('../models/Event');
const Bet   = require('../models/Bet');

//Import services
const websocketService = require('./websocket-service');
const smsService = require('./sms-notificaiton-service');

exports.listEvent = async (linkedTo) => {
    return Event.find().populate('bets');
};

exports.getEvent = async (id) => {
    return Event.findOne({ _id: id }).populate('bets');
};

exports.getBet = async (id) => {
    return Bet.findOne({ _id: id });
};

exports.placeBet = async (user, bet, investmentAmount, outcome) => {
    if (bet) {
        const userId = user.id;
        const eventId = bet.event;
        const betId   = bet._id;

        websocketService.emitPlaceBetToAllByEventId(eventId, userId, betId, investmentAmount, outcome);
        await smsService.notifyPlacedBet(user, bet, investmentAmount, outcome);
    }
};

exports.pullOutBet = async (user, bet, amount, outcome, currentPrice) => {
    if (bet) {
        const userId = user.id;
        const eventId = bet.event;
        const betId   = bet._id;

        websocketService.emitPullOutBetToAllByEventId(eventId, userId, betId, amount, outcome, currentPrice);
        await smsService.notifyPullOutBet(user, bet, amount, outcome);
    }
};

exports.isBetTradable = async (bet) => {
        if(bet.finalOutcome !== undefined) {
            return false;
        }

        const event = await Event.findById(bet.event);

        if(event.date !== undefined) {
            return event.date <= Date.now();
        }

    return bet.date.getTime() <= Date.now();
};

exports.betCreated = async (bet, userId) => {
    if (bet) {
        const eventId = bet.event;
        const betId   = bet._id;

        websocketService.emitBetCreatedByEventId(eventId, userId, betId, bet.title);
    }
};

exports.saveEvent = async (event) => {
    return event.save();
};

exports.saveBet = async (bet) => {
    return bet.save();
};