const { fromWei, WFAIR_SYMBOL, TransactionManager, AccountNamespace, Transactions, ExternalTransactionOriginator } = require("@wallfair.io/trading-engine");
const { notificationEvents } = require('@wallfair.io/wallfair-commons/constants/eventTypes');
const { sendMail } = require("../services/mail-service");
const fs = require("fs");
const { claimUserDeposit } = require("./promo-codes-service");
const emailDepositCreated = fs.readFileSync(__dirname + '/../emails/deposit-created.html', 'utf8');
const emailWithdrawRequested = fs.readFileSync(__dirname + '/../emails/withdraw-requested.html', 'utf8');

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

const processDepositEvent = async (_, data) => {
  const eventName = data?.event;

  if ([notificationEvents.EVENT_DEPOSIT_CREATED, notificationEvents.EVENT_WEBHOOK_TRIGGERED].includes(eventName)) {
    const dd = data?.data;
    dd.symbol = WFAIR_SYMBOL;

    if (eventName === notificationEvents.EVENT_WEBHOOK_TRIGGERED && dd.status !== 'completed') {
      return;
    }

    const deposits = await new Transactions().getExternalTransactionLogs({
      where: {
        internal_user_id: dd.internal_user_id,
        originator: ExternalTransactionOriginator.DEPOSIT
      }
    });

    if (deposits.length === 1) {
      await claimUserDeposit(dd.internal_user_id, dd.amount)
        .catch((e) => console.log('DEPOSIT CLAIM: ', e.message));
    }

    if (!process.env.DEPOSIT_NOTIFICATION_EMAIL) {
      console.log('DEPOSIT_NOTIFICATION_EMAIL is empty, skipping email notification for deposits...');
      return;
    }

    const formattedAmount = fromWei(dd.amount).decimalPlaces(0);
    let emailHtml = emailDepositCreated;

    for (const entry in dd) {
      emailHtml = emailHtml.replace(`{{${entry}}}`, dd[entry]);
    }
    await sendMail(
      process.env.DEPOSIT_NOTIFICATION_EMAIL,
      `${notificationEvents.EVENT_DEPOSIT_CREATED} - ${process.env.ENVIRONMENT} - ${formattedAmount} ${dd.symbol}`,
      emailHtml
    );
  }
}

const processWithdrawEvent = async (_, data) => {
  const eventName = data?.event;

  if (!process.env.DEPOSIT_NOTIFICATION_EMAIL) {
    console.log('DEPOSIT_NOTIFICATION_EMAIL is empty, skipping email notification for withdraws...');
    return;
  }

  if (eventName === notificationEvents.EVENT_WITHDRAW_APPROVED) {
    const dd = data?.data;
    const formattedAmount = fromWei(dd.amount).decimalPlaces(0);
    let emailHtml = emailWithdrawRequested;

    for (const entry in dd) {
      emailHtml = emailHtml.replace(`{{${entry}}}`, dd[entry]);
    }
    await sendMail(process.env.DEPOSIT_NOTIFICATION_EMAIL, `${notificationEvents.EVENT_WITHDRAW_SCHEDULED} - ${process.env.ENVIRONMENT} - ${formattedAmount} ${dd.symbol}`, emailHtml);
  }
}

const checkPromoCodesExpiration = async () => {
  PROCESSORS.promoCodesExpiration.running = true;
  const transaction = new TransactionManager();

  try {
    await transaction.startTransaction();

    const result = await transaction.queryRunner.query(`
      UPDATE promo_code_user pcu
      SET status = 'EXPIRED' 
      FROM promo_code pc 
      WHERE pcu.promo_code_id = pc.id AND 
            pcu.status = 'CLAIMED' AND 
            (pcu.expires_at <= now() OR pc.expires_at <= now())
      RETURNING *`
    );
    const users = result[0].map(r => r.user_id);
    users.length > 0 &&
      await transaction.wallet.burnAll(users, AccountNamespace.USR, 'BFAIR');

    await transaction.commitTransaction();

    console.log(new Date(), `${result[1]} user promo codes expired`);
  } catch (e) {
    console.error(e);
    await transaction.rollbackTransaction();
  }

  PROCESSORS.promoCodesExpiration.running = false;
};

const PROCESSORS = {
  deposit: {
    call: processDepositEvent,
    running: false,
  },
  withdraw: {
    call: processWithdrawEvent,
    running: false,
  },
  promoCodesExpiration: {
    call: checkPromoCodesExpiration,
    running: false,
  },
};

module.exports = { PROCESSORS }
