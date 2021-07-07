const userService   = require('../services/user-service');
const {BetContract} = require("smart_contract_mock");

exports.automaticPayout = async (bet, session) => {
    const betContract = new BetContract(bet.id, bet.outcomes.length);


    //Payout finalOutcome
    const winnerBalances = await betContract.getInvestorsOfOutcome(bet.finalOutcome);
    for(const balance of winnerBalances) {
        const userId = balance.owner;

        if(userId.startsWith('BET')) {
            continue;
        }

        const user = await userService.getUserById(userId, session);
        await userService.payoutUser(user, bet, session);
    }


    //Clear openBets of losing outcomes and add to closed bets
    for(const outcome of bet.outcomes.filter(outcome => outcome.index !== bet.finalOutcome)) {
        const balances = await betContract.getInvestorsOfOutcome(outcome.index);

        for(const balance of balances) {
            const userId = balance.owner;

            if(userId.startsWith('BET')) {
                continue;
            }

            const user = await userService.getUserById(userId, session);
            userService.clearOpenBetAndAddToClosed(user, bet, 0);
            await userService.saveUser(user, session);
        }
    }
};