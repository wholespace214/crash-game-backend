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

exports.rewardRefUser= async (ref) => {
    if(ref === undefined) {
        return;
    }

    let user = await this.getUserById(ref);
    user.coins += 500;
    await this.saveUser(user);
}


//TODO call function
exports.createUser = async (user) => {
    //TODO push user in marketing tools
    return user.save();
}
