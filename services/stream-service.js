// Import Stream model
const { Stream } = require('@wallfair.io/wallfair-commons').models;

exports.listStreams = async () => Stream.find();

exports.getStream = async (id) => Stream.findOne({ _id: id });

exports.saveStream = async (stream) => stream.save();
