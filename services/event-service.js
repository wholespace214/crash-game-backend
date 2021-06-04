// Import Event model
const Event = require("../models/Event");
const Bet = require("../models/Bet");

//Import websocket service
/*const websocketService = require("./websocket-service");*/

exports.listEvent = async (linkedTo) => {
    return Event.find().populate('bets');
};

exports.getEvent = async (id) => {
    return Event.findOne({_id: id}).populate('bets');
}

exports.getBet = async (id) => {
    return Bet.findOne({_id: id});
}

exports.placeBet = async (id) => {
    let bet = Bet.findOne({_id: id});
    /*websocketService.sendMessageToEvent(bet.event, "BET ON ..XX..")*/
}

exports.saveEvent = async (event) => {
    return event.save();
}

exports.saveBet = async (bet) => {
    return bet.save();
}