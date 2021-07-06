const userService   = require('../services/user-service');
const {BetContract} = require("smart_contract_mock");

exports.automaticPayout = async (bet, session) => {
    const betContract = new BetContract(bet.id, bet.outcomes.length);

    for(const outcome of bet.outcomes) {
        const balances = await betContract.getInvestorsOfOutcome(outcome.index);

        for(const balance of balances) {
            const userId = balance.owner;

            if(userId.startsWith('BET')) {
                continue;
            }

            const user = await userService.getUserById(userId, session);
            await userService.payoutUser(user, bet, session);
        }
    }
};