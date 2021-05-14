// Import Event model
const Stream = require("../models/Stream");

exports.listStreams = async () => {
    return Stream.find();
};

exports.getStream = async (id) => {
    return Stream.findOne({_id: id});
}

exports.saveStream = async (stream) => {
    return stream.save();
}