// Import Event model
const Event = require("../models/Event");

//Import websocket service
const websocketService = require("./websocket-service");

exports.listEvent = async (linkedTo) => {
    return Event.find({linkedTo: linkedTo});
};

exports.getEvent = async (id) => {
    return Event.findOne({_id: id});
}

exports.betOnEvent = async (id) => {
    let event = Event.findOne({_id: id});
    websocketService.sendMessageToEvent(event.id, "BET ON ..XX..")
}

exports.saveEvent = async (event) => {
    return event.save();
}