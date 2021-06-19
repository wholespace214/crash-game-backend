// Import User model
const User = require("../models/User");
const pick = require('lodash.pick');
const bcrypt = require('bcrypt');
const { BetContract, Erc20 } = require('smart_contract_mock');
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
        users.forEach(entry => result.push(pick(entry, ['id', 'name', 'email', 'date'])));
    });
    return result;
}

exports.saveUser = async (user) => {
    return user.save();
}

exports.rewardRefUser= async (ref) => {
    if(ref === undefined || ref === null) {
        return;
    }
    console.debug('try to reward ref');

    await EVNT.mint(ref, 500 * EVNT.ONE);
}

exports.securePassword = async (user, password ) => {
    bcrypt.hash(password, 10, function(err, hash) {
        user.password = hash;
        user.save();
    });
}

exports.comparePassword = async (user, plainPassword ) => {
    return await bcrypt.compare(plainPassword, user.password);
}

exports.sellBet = async (userId, bet, sellAmount, outcome) => {
    const user = await this.getUserById(userId);
    const openBet = user.openBets.find(item => item === bet.id);

    if(openBet !== undefined) {
        const betContract = new BetContract(openBet.id);
        const yesBalance  = await betContract.yesToken.balanceOf(userId);
        const noBalance   = await betContract.noToken.balanceOf(userId);

        //delete bet from openBets, if balance === 0 yes & no
        console.debug(' yesBalance = ' + yesBalance);
        console.debug(' noBalance = ' + noBalance);
        if(yesBalance === 0 && noBalance === 0) {
            user.openBets = user.openBets.filter(item => item !== bet.id);
        }

        user.closedBets.push({betId:            bet.id,
            outcome:          outcome ,
            sellAmount: sellAmount / EVNT.ONE});
    }

    await this.saveUser(user);
}



//TODO call function
exports.createUser = async (user) => {
    //TODO push user in marketing tools
    return user.save();
}
