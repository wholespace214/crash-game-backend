const { NetworkCode, toWei, AccountNamespace, WFAIR_SYMBOL, TransactionManager} = require("@wallfair.io/trading-engine");
const mongoose = require("mongoose");
const {BONUS_STATES} = require("../util/constants");
const { User } = require('@wallfair.io/wallfair-commons').models;

exports.transferBonus = async (bonusCfg, userId) => {
  const transactionManager = new TransactionManager();
  const amountToTransfer = toWei(bonusCfg.amount).toString();
  const userIdString = userId.toString();
  await transactionManager.startTransaction();

  try {
    await transactionManager.wallet.transfer(
      {
        owner: process.env.REWARD_WALLET,
        namespace: AccountNamespace.ETH,
        symbol: WFAIR_SYMBOL
      },
      {
        owner: userIdString,
        namespace: AccountNamespace.USR,
        symbol: WFAIR_SYMBOL
      },
      amountToTransfer
    );

    await User.updateOne({
      _id: mongoose.Types.ObjectId(userIdString)
    }, {
      $push: {
        bonus: {
          name: bonusCfg.type,
          state: BONUS_STATES.Used,
          amount: bonusCfg.amount
        }
      }
    });

    await transactionManager.commitTransaction();
  } catch (e) {
    await transactionManager.rollbackTransaction();
    throw e;
  }
}

exports.WALLETS = {
  'ETH': {
    network: NetworkCode.ETH,
    wallet: process.env.DEPOSIT_WALLET_ETHEREUM,
  },
  'USDT': {
    network: NetworkCode.ETH,
    wallet: process.env.DEPOSIT_WALLET_ETHEREUM,
  },
  'BTC': {
    network: NetworkCode.BTC,
    wallet: process.env.DEPOSIT_WALLET_BITCOIN,
  },
  'LTC': {
    network: NetworkCode.LTC,
    wallet: process.env.DEPOSIT_WALLET_LITECOIN,
  }
}
