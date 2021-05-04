// Import Event model
const Event = require("../models/Event");

exports.listEvent = async () => {
    return Event.find();
};

exports.getEvent = async (id) => {
    return Event.findOne({_id: id});
}

exports.saveEvent = async (event) => {
    return event.save();
}