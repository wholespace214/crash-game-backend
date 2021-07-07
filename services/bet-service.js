const userService   = require('../services/user-service');
const {BetContract, Erc20} = require("smart_contract_mock");
const EVNT = new Erc20('EVNT');

exports.clearOpenBets = async (bet, session) => {
    const winningUsers = [];
    const betContract = new BetContract(bet.id, bet.outcomes.length);
    for(const outcome of bet.outcomes) {
        const wallets = await betContract.getInvestorsOfOutcome(outcome.index);
        const winning = outcome.index === bet.finalOutcome;

        for(const wallet of wallets) {
            const userId = wallet.owner;

            if(userId.startsWith('BET')) {
                continue;
            }

            const balance = wallet.balance/EVNT.ONE;

            const user = await userService.getUserById(userId, session);
            userService.clearOpenBetAndAddToClosed(user, bet, balance, winning ? balance : 0 );

            if(winning) {
                winningUsers.push(userId);
            }
            await userService.saveUser(user, session);
        }
    }
    return winningUsers;
}

exports.automaticPayout = async (winningUsers, bet) => {
    //Payout finalOutcome
    for(const userId of winningUsers) {
        await userService.payoutUser(userId, bet);
    }
};