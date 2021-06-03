// Import User model
const User = require("../models/User");
const pick = require('lodash.pick');

const { Erc20 } = require('smart_contract_mock');
const EVNT = new Erc20('EVNT');

exports.getUserByPhone = async (phone) => {
    return User.findOne({phone: phone});
};

exports.getUserById = async (id) => {
    return User.findOne({_id: id});
}

exports.getRefByUserId = async (id) => {
    let result = [];
    await User.find({ref: id}).then(function(users) {
        users.forEach(entry => result.push(pick(entry, ['name', 'email'])));
    });
    return result;
}

exports.saveUser = async (user) => {
    return user.save();
}

exports.rewardRefUser= async (ref) => {
    if(ref === undefined) {
        return;
    }

    await EVNT.mint(ref, 500 * EVNT.ONE);
}


//TODO call function
exports.createUser = async (user) => {
    //TODO push user in marketing tools
    return user.save();
}
