// Import Event model
const Event = require("../models/Event");

exports.listEvent = async (linkedTo) => {
    return Event.find({linkedTo: linkedTo});
};

exports.getEvent = async (id) => {
    return Event.findOne({_id: id});
}

exports.saveEvent = async (event) => {
    return event.save();
}