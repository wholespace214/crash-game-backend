// Import User model
const User = require("../models/User");
const pick = require('lodash.pick');
const bcrypt = require('bcrypt');
const Mailchimp = require('mailchimp-api-v3');
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

exports.sellBet = async (userId, bet, sellAmount, outcome, newBalances) => {
    const user = await this.getUserById(userId);
    const openBet = user.openBets.find(item => item === bet.id);

    if(openBet !== undefined) {
        const yesBalance  = newBalances.yes;
        const noBalance   = newBalances.no;

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


exports.getRankByUserId = async (userId) => {
    let users = await User.find({}, { name: 1 });
    const usersWithBalance = [];

    for (const user of users) {
        const balance = await EVNT.balanceOf(user.id);
        usersWithBalance.push({userId: user.id, name: user.name, balance: balance / EVNT.ONE});
    }

    usersWithBalance.sort(function (a, b) {
        return b.balance - a.balance;
    });

    let counter = 1;
    for (const user of usersWithBalance) {
        if(user.userId === userId) {
            return counter;
        }
        counter += 1;
    }
}

/*
exports.createUser = async (user) => {
    var mailchimp = new Mailchimp(process.env.MAILCHIMP_API_KEY);

    return user.save();
}
*/
