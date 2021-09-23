/**
 * This job listens to bets being placed in the system, and then stores the price of every option after the price has been calculated.
 * This generates a time series to be consumed later to display price action history (how each option delevoped in price over time).
 *
 * TODO Move this logic to a microservice
 * 
 * CREATE TABLE IF NOT EXISTS amm_price_action (
 *  betid varchar(255), 
 *  trx_timestamp timestamp, 
 *  outcomeIndex integer, 
 *  quote decimal, 
 *  PRIMARY KEY(betid, option, trx_timestamp)
 * );
 */
const DEFAULT_CHANNEL = 'system';
let subClient;

const { BetContract, Erc20, pool } = require('@wallfair.io/smart_contract_mock');
const WFAIR = new Erc20('WFAIR');
let one = parseInt(WFAIR.ONE);

module.exports = {
  initQuoteJobs: (_subClient) => {
    subClient = _subClient;

    subClient.subscribe(DEFAULT_CHANNEL, (error, channel) => {
      console.log(error || 'QuoteStorageJob subscribed to channel:', channel);
    });

    console.log(pool);
    
    subClient.on('message', async (_, message) => {
      const messageObj = JSON.parse(message);
      if (messageObj.event === 'Notification/EVENT_BET_PLACED') {
        console.log("Bet detected! Yay!", messageObj);

        let {_id: betId, outcomes} = messageObj.data.bet;

        const betContract = new BetContract(betId, outcomes.length);

        // TODO Dont calculate on every event. Use a more scalable solution.
        for (const outcome of outcomes) {
          const outcomeSellAmount = await betContract.calcBuy(WFAIR.ONE, outcome.index);
          let parsed = parseInt(outcomeSellAmount)  / one;

          console.log(`price of outcome ${JSON.stringify(outcome)} is ${parsed}`)
        }
      }
    });
  }
}