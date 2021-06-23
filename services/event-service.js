// Import Event model
const Event = require('../models/Event');
const Bet   = require('../models/Bet');

//Import websocket service
const websocketService = require('./websocket-service');

exports.listEvent = async (linkedTo) => {
    return Event.find().populate('bets');
};

exports.getEvent = async (id) => {
    return Event.findOne({ _id: id }).populate('bets');
};

exports.getBet = async (id) => {
    return Bet.findOne({ _id: id });
};

exports.placeBet = async (userId, bet, investmentAmount, outcome) => {
    if (bet) {
        const eventId = bet.event;
        const betId   = bet._id;

        websocketService.emitPlaceBetToAllByEventId(eventId, userId, betId, investmentAmount, outcome);
    }
};

exports.pullOutBet = async (userId, bet, amount, outcome) => {
    if (bet) {
        const eventId = bet.event;
        const betId   = bet._id;

        websocketService.emitPullOutBetToAllByEventId(eventId, userId, betId, amount, outcome);
    }
};

exports.isBetTradable = (bet) => {
        if(bet.finalOutcome !== undefined) {
            return false;
        }

        return bet.date.getTime() <= Date.now();
};

exports.saveEvent = async (event) => {
    return event.save();
};

exports.saveBet = async (bet) => {
    return bet.save();
};