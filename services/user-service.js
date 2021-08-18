// Import models
const User = require("../models/User");

const pick = require('lodash.pick');
const bcrypt = require('bcrypt');
const axios = require('axios')

//Import services
const eventService = require("./event-service");
const bigDecimal = require("js-big-decimal");
const { BET_STATUS } = require("./event-service");

//Import sc mock
const { BetContract, Erc20 } = require('@wallfair.io/smart_contract_mock');
const EVNT = new Erc20('EVNT');

exports.getUserByPhone = async (phone, session) => {
    return User.findOne({phone: phone}).session(session);
};

exports.getUserById = async (id, session) => {
    return User.findOne({_id: id}).session(session);
}

exports.getRefByUserId = async (id) => {
    let result = [];
    await User.find({ref: id}).then(function(users) {
        users.forEach(entry => result.push(pick(entry, ['id', 'name', 'email', 'date'])));
    });
    return result;
}

exports.saveUser = async (user, session) => {
    return user.save({session});
}

exports.rewardRefUser= async (ref) => {
    if(ref === undefined || ref === null) {
        return;
    }
    console.debug('try to reward ref');
    await this.mintUser(ref, 50);
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

exports.sellBet = async (userId, bet, sellAmount, outcome, newBalances, session) => {
    const user = await this.getUserById(userId, session);
    const openBetId = user.openBets.find(item => item === bet.id);
    const openBet = await eventService.getBet(openBetId);

    if(![BET_STATUS.active].includes(openBet.status)) {
        throw new Error('bet had not have status active, but was: ' + openBet.status);
    }

    if(openBet !== undefined) {
        user.openBets = filterClosedTrades(user, bet, newBalances);

        user.closedBets.push(
            {
                betId:            bet.id,
                outcome:          outcome ,
                sellAmount: (sellAmount / EVNT.ONE).toString(),
                earnedTokens: (newBalances.earnedTokens / EVNT.ONE).toString(),
            });
    }

    await this.saveUser(user, session);
}

function filterClosedTrades(user, openBet, newBalances) {
    //delete trade from openBets, if all trade closed and payed out
    if (!newBalances.isInvested) {
        return user.openBets.filter(item => item !== openBet.id);
    }
    return user.openBets;
}


exports.getRankByUserId = async (userId) => {
    let users = await User.find({}).sort({amountWon: -1}).select({_id: 1, amountWon: 1}).exec();

    let lastDiffAmount = 0;
    for (let i = 0; i < users.length; i++) {
        
        if (users[i]._id == userId) {
            let rank = i+1;
            let toNextRank =  i == 0 ? 0 : lastDiffAmount - users[i].amountWon;

            return {rank, toNextRank};
        }

        if (lastDiffAmount == 0 || lastDiffAmount != users[i].amountWon) {
            lastDiffAmount = users[i].amountWon;
        }
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

exports.findAllUserInvestedInBet = async (betId) => {
    return User.find({openBets: {$contains: betId}});
}

exports.payoutUser = async (userId, bet) => {
    const betId = bet.id;
    const LOG_TAG = '[PAYOUT-BET]';
    console.debug(LOG_TAG, 'Payed out Bet', betId, userId);

    console.debug(LOG_TAG, 'Requesting Bet Payout');
    const betContract = new BetContract(betId, bet.outcomes.length);
    await betContract.getPayout(userId);
}

exports.clearOpenBetAndAddToClosed = (user, bet, sellAmount, earnedTokens) => {
    user.openBets = user.openBets.filter(item => item !== bet.id);
    user.closedBets.push({
        betId:            bet.id,
        outcome:          bet.finalOutcome,
        sellAmount: (BigInt(sellAmount) / EVNT.ONE).toString(),
        earnedTokens: (BigInt(earnedTokens) / EVNT.ONE).toString(),
    });
}

exports.getBalanceOf = async (userId) => {
    return new bigDecimal(await EVNT.balanceOf(userId)).getPrettyValue(4, '.');
}

const INITIAL_LIQUIDITY = 1000n;

exports.mintUser  = async (userId, amount) => {
    await EVNT.mint(userId, amount ? BigInt(amount)  * EVNT.ONE : INITIAL_LIQUIDITY * EVNT.ONE);
}

exports.getTotalWin = (balance) => {
    const value = balance - INITIAL_LIQUIDITY;
    return value < 0n ? 0n : value;
}
