const { validationResult } = require("express-validator");
const { ErrorHandler } = require("../util/error-handler");
const {
  AccountNamespace,
  WFAIR_SYMBOL,
  BN,
  ONE,
  TransactionManager,
  ExternalTransactionOriginator,
  ExternalTransactionStatus,
  Transactions
} = require("@wallfair.io/trading-engine");
const { getUserByIdEmailPhoneOrUsername } = require("../services/user-api");
const { WALLETS } = require("../util/wallet");

exports.transferToUser = async (req, res, next) => {
  if (!req.user) {
    return next(new ErrorHandler(403, 'Not authorized'));
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ErrorHandler(422, 'Invalid input passed, please check it'));
  }

  const {
    email,
    amount,
    transactionHash,
    userAddress,
    inputAmount,
    inputCurrency,
  } = req.body;

  const transactionManager = new TransactionManager();

  try {
    const user = await getUserByIdEmailPhoneOrUsername(email);

    if (!user) {
      return next(new ErrorHandler(404, 'User does not exist'));
    }

    const extTransaction = await new Transactions()
      .getExternalTransactionByHash(transactionHash);

    if (extTransaction) {
      return next(new ErrorHandler(409, 'Transaction already processed'));
    }

    const amountToTransfer = new BN(amount)
      .multipliedBy(ONE.toString())
      .toString();

    await transactionManager.startTransaction();

    await transactionManager.wallet.transfer(
      {
        owner: process.env.ONRAMP_WEBHOOK_WALLET,
        namespace: AccountNamespace.ETH,
        symbol: WFAIR_SYMBOL
      },
      {
        owner: user._id,
        namespace: AccountNamespace.USR,
        symbol: WFAIR_SYMBOL
      },
      amountToTransfer
    );

    const externalData = {
      originator: ExternalTransactionOriginator.CRYPTO,
      external_system: 'manual',
      status: ExternalTransactionStatus.COMPLETED,
      external_transaction_id: transactionHash,
      transaction_hash: transactionHash,
      network_code: WALLETS[inputCurrency].network,
      internal_user_id: user._id,
    };

    await transactionManager.transactions.insertExternalTransaction(externalData);

    await transactionManager.transactions.insertExternalTransactionLog({
      ...externalData,
      symbol: WFAIR_SYMBOL,
      sender: userAddress,
      receiver: WALLETS[inputCurrency].wallet,
      amount: amountToTransfer,
      input_currency: inputCurrency,
      input_amount: inputAmount,
    });

    await transactionManager.commitTransaction();

    return res.status(204).send();
  } catch (e) {
    console.error('Transfer error: ', e.message);
    await transactionManager.rollbackTransaction();
    return next(new ErrorHandler('Something went wrong'));
  }
};