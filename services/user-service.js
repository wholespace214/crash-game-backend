const { User } = require("@wallfair.io/wallfair-commons").models;
const pick = require('lodash.pick');
const bcrypt = require('bcrypt');
const axios = require('axios')
const bigDecimal = require("js-big-decimal");
const { BetContract, Erc20 } = require('@wallfair.io/smart_contract_mock');
const WFAIR = new Erc20('WFAIR');

exports.getUserByPhone = async (phone, session) => {
    return User.findOne({phone: phone}).session(session);
};

exports.getUserById = async (id, session) => {
    return User.findOne({_id: id}).session(session);
}

exports.getUserByIdAndWallet = async (id, walletAddress, session) => {
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

exports.getRankByUserId = async (userId) => {
    // TODO this cant stay like this. 
    // it is an improvement over the previous solution, but still bad
    // we need to have a service updating the rank frequently (ex: every 15 secs)
    let users = await User.find({username: {"$exists": true}})
        .sort({amountWon: -1, username: 1})
        .select({_id: 1, amountWon: 1})
        .exec();

    let lastDiffAmount = 0;
    let ranking = {
        rank: 0,
        toNextRank: 0,
    };

    for (let i = 0; i < users.length; i++) {
        
        if (users[i]._id == userId) {
            let rank = i+1;
            let toNextRank =  i == 0 ? 0 : lastDiffAmount - users[i].amountWon;

            ranking = {rank, toNextRank};
        }

        if (lastDiffAmount == 0 || lastDiffAmount != users[i].amountWon) {
            lastDiffAmount = users[i].amountWon;
        }
    }

    return ranking;
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

exports.payoutUser = async (userId, bet) => {
    const betId = bet.id;
    const LOG_TAG = '[PAYOUT-BET]';
    console.debug(LOG_TAG, 'Payed out Bet', betId, userId);

    console.debug(LOG_TAG, 'Requesting Bet Payout');
    const betContract = new BetContract(betId, bet.outcomes.length);
    await betContract.getPayout(userId);
}

exports.getBalanceOf = async (userId) => {
    return new bigDecimal(await WFAIR.balanceOf(userId)).getPrettyValue(4, '.');
}

const INITIAL_LIQUIDITY = 1000n;

exports.mintUser  = async (userId, amount) => {
    await WFAIR.mint(userId, amount ? BigInt(amount)  * WFAIR.ONE : INITIAL_LIQUIDITY * WFAIR.ONE);
}

exports.getTotalWin = (balance) => {
    const value = balance - INITIAL_LIQUIDITY;
    return value < 0n ? 0n : value;
}

exports.updateUser = async (userId, updatedUser) => {
    let user = await User.findById(userId);
    if (updatedUser.name) {
        user.name = updatedUser.name;
    }
    if (updatedUser.username) {
        user.username = updatedUser.username;
    }
    if (updatedUser.profilePicture) {
        user.profilePicture = updatedUser.profilePicture;
    }
    await user.save();
}

exports.increaseAmountWon = async (userId, amount) => {
    let userSession = await User.startSession();
    let user = null;
    try {
        await userSession.withTransaction(async () => {
        user = await User.findById({_id: userId}, {phone: 1, amountWon: 1}).exec();
        if(user) {
            user.amountWon += amount;
            await user.save();
        }
        });

    } catch (err) {
        console.error(err);
        throw err;
    } finally {
        await userSession.endSession();
    }
}