// Import Stream model
const { Stream } = require('@wallfair.io/wallfair-commons').models;

exports.listStreams = async () => {
    return Stream.find();
};

exports.getStream = async (id) => {
    return Stream.findOne({ _id: id });
};

exports.saveStream = async (stream) => {
    return stream.save();
};
