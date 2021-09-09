const userService = require('../services/user-service');
const tradeService = require('../services/trade-service');
const eventService = require('../services/event-service');
const { User, Bet, Trade } = require("@wallfair.io/wallfair-commons").models;
const bigDecimal = require('js-big-decimal');
const { BetContract, Erc20, Wallet } = require('@wallfair.io/smart_contract_mock');
const WFAIR = new Erc20('WFAIR');

exports.placeBet = async (userId, betId, amount, outcome, minOutcomeTokens) => {
    const LOG_TAG = '[CREATE-BET]';

    amount = parseFloat(amount).toFixed(4);
    const bigAmount = new bigDecimal(amount.toString().replace('.', ''));
    amount = BigInt(bigAmount.getValue());

    let minOutcomeTokensToBuy = 1n;
    if (minOutcomeTokens > 1) {
        minOutcomeTokensToBuy = BigInt(minOutcomeTokens);
    }

    const bet = await eventService.getBet(betId);
    console.debug(LOG_TAG, 'Placing Bet', betId, userId);

    if (!eventService.isBetTradable(bet)) {
        console.error(LOG_TAG, 'Bet is not tradeable');
        throw new Error('No further action can be performed on an event/bet that has ended!');
    }

    const user = await userService.getUserById(userId);

    if (!user) {
        console.error(LOG_TAG, `User not found with id ${userId}`);
        throw new Error('User not found');
    }

    const response = {
        bet,
        trade: {},
    };

    const session = await Bet.startSession();
    try {
        await session.withTransaction(async () => {
            const betContract = new BetContract(betId, bet.outcomes.length);

            console.debug(LOG_TAG, 'Interacting with the AMM');

            await betContract.buy(userId, amount, outcome, minOutcomeTokensToBuy * WFAIR.ONE);

            console.debug(LOG_TAG, 'Successfully bought Tokens');

            const potentialReward = await betContract.calcBuy(amount, outcome);

            let trade = new Trade({
                userId: user._id,
                betId: bet._id,
                outcomeIndex: outcome,
                investmentAmount: new bigDecimal(amount).getPrettyValue("4", "."),
                outcomeTokens: new bigDecimal(potentialReward).getPrettyValue("4", "."),
            });

            response.trade = await trade.save({session});

            console.debug(LOG_TAG, 'Trade saved successfully');
        });

        await eventService.placeBet(user, bet, bigAmount.getPrettyValue(4, '.'), outcome);
        return response;
    } catch (err) {
        console.error(LOG_TAG, err);
        throw new Error('Unexpected error ocurred while placing bet');
    } finally {
        await session.endSession();
    }
};

exports.clearOpenBets = async (bet, session) => {
    const betContract = new BetContract(bet.id, bet.outcomes.length);
    for (const outcome of bet.outcomes) {
        const wallets = await betContract.getInvestorsOfOutcome(outcome.index);
        const win = outcome.index === bet.finalOutcome;

        for (const wallet of wallets) {
            const userId = wallet.owner;

            if (userId.startsWith('BET')) {
                continue;
            }

            await tradeService.closeTrades(
                userId, 
                bet, 
                outcome.index, 
                win ? 'rewarded' : 'closed', 
                session);
        }
    }
};

exports.refundUserHistory = async (bet, session) => {
    const userIds = [];
    const betContract = new BetContract(bet.id, bet.outcomes.length);

    for (const outcome of bet.outcomes) {
        const wallets = await betContract.getInvestorsOfOutcome(outcome.index);

        for (const wallet of wallets) {
            const userId = wallet.owner;

            if (userId.startsWith('BET')) {
                continue;
            }

            if (!userIds.includes(userId)) {
                userIds.push(userId);
            }

            await tradeService.closeTrades(
                userId, 
                bet, 
                outcome.index, 
                'closed', 
                session);
        }
    }

    return userIds;
};

exports.automaticPayout = async (winningUsers, bet) => {
    //Payout finalOutcome
    for (const userId of winningUsers) {
        await userService.payoutUser(userId, bet);
    }
};
