const {fromWei} = require("@wallfair.io/trading-engine");
const { notificationEvents } = require('@wallfair.io/wallfair-commons/constants/eventTypes');
const {sendMail} = require("../services/mail-service");
const fs = require("fs");
const emailDepositCreated = fs.readFileSync(__dirname + '/../emails/deposit-created.html', 'utf8');

/*
data example for notificationEvents.EVENT_DEPOSIT_CREATED

const exampleDepositData = {
  event: 'event.deposit_created',
  data: {
    event: 'Transaction/DEPOSIT_CREATED',
    producer: 'system',
    producerId: 'deposit-worker',
    data: {
      originator: 'deposit',
      external_system: 'deposit',
      status: 'completed',
      transaction_hash: '0x99d99657118be95b40fce740e11f846d910ab0309f93d1828177bc7bf9bc437a',
      external_transaction_id: '0x99d99657118be95b40fce740e11f846d910ab0309f93d1828177bc7bf9bc437a',
      network_code: 'ETH',
      block_number: 28881415,
      sender: '0xAF22FF226c8D55aF403C76898aB50477bC2Bc764',
      receiver: '0x27f9D825274bA0c54D33373bE15eB512B833d7F3',
      amount: '2000000000000000000',
      symbol: 'WFAIR'
    },
    date: 1640102863562,
    broadcast: false
  }
};

 */

const processDepositEvent = async (event, data) => {
  const eventName = data?.event;

  if(eventName === notificationEvents.EVENT_DEPOSIT_CREATED) {
    const dd = data?.data;
    const formattedAmount = fromWei(dd.amount).decimalPlaces(0);
    let emailHtml = emailDepositCreated;

    for (const entry in dd) {
      emailHtml = emailHtml.replace(`{{${entry}}}`, dd[entry]);
    }
    await sendMail('deposit-info@wallfair.io', `${notificationEvents.EVENT_DEPOSIT_CREATED} - ${process.env.ENVIRONMENT} - ${formattedAmount} ${dd.symbol}`, emailHtml);
  }
}

module.exports = { processDepositEvent };
