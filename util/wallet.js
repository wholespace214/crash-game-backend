const { NetworkCode, toWei, AccountNamespace, WFAIR_SYMBOL, TransactionManager} = require("@wallfair.io/trading-engine");

exports.transferBonus = async (amount, userId) => {
  const transactionManager = new TransactionManager();
  const amountToTransfer = toWei(amount).toString();
  await transactionManager.startTransaction();

  try {
    await transactionManager.wallet.transfer(
      {
        owner: process.env.REWARD_WALLET,
        namespace: AccountNamespace.ETH,
        symbol: WFAIR_SYMBOL
      },
      {
        owner: userId,
        namespace: AccountNamespace.USR,
        symbol: WFAIR_SYMBOL
      },
      amountToTransfer
    );

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
