const {Wallet} = require('smart_contract_mock');

// Import models
const User = require("../models/User");
const Bet = require("../models/Bet");

const pick = require('lodash.pick');
const bcrypt = require('bcrypt');
const axios = require('axios')

//Import sc mock
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

    await EVNT.mint(ref, 50 * EVNT.ONE);
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
        await removeClosedTrades(user, bet);

        user.closedBets.push({betId:            bet.id,
            outcome:          outcome ,
            sellAmount: sellAmount / EVNT.ONE});
    }

    await this.saveUser(user);
}

async function removeClosedTrades(user, openBet) {
    const userId = user.id;
    let allTradesAreClosed = true;

    const bet = new BetContract(openBet.id, openBet.outcomes.length);

    const wallet = new Wallet(userId);
    for (const outcome of openBet.outcomes) {
        const investment = await wallet.investmentBet(openBet.id, outcome.index);
        const balance = await bet.getOutcomeToken(outcome.index).balanceOf(userId.toString());

        if (investment || balance) {
            allTradesAreClosed = false;
        }
    }

    //delete trade from openBets, if all trade closed and payed out
    if (allTradesAreClosed) {
        user.openBets = user.openBets.filter(item => item !== openBet.id);
    }
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

exports.createUser = async (user) => {
    axios
        .post('https://hooks.zapier.com/hooks/catch/10448019/b3155io/', {
            name: user.name,
            email: user.email
        })
        .then(res => {
            console.log(`statusCode: ${res.statusCode}`)
            console.log(res)
        })
        .catch(error => {
            console.error(error)
        })
}
