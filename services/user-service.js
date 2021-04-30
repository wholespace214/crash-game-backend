// Import User model
const User = require("../models/User");

exports.getUserByPhone = async (phone) => {
    return User.findOne({phone: phone});
};

exports.getUserById = async (id) => {
    return User.findOne({_id: id});
}

exports.saveUser = async (user) => {
    return user.save();
}
