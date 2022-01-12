const { validationResult } = require("express-validator");
const { ErrorHandler } = require("../util/error-handler");
const {
  AccountNamespace,
  WFAIR_SYMBOL,
  TransactionManager,
  ExternalTransactionOriginator,
  ExternalTransactionStatus,
  Transactions,
  toWei
} = require("@wallfair.io/trading-engine");
const { getUserByIdEmailPhoneOrUsername } = require("../services/user-api");
const { WALLETS } = require("../util/wallet");
const userService = require('../services/user-service')

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

    const amountToTransfer = toWei(amount).toString();

    await transactionManager.startTransaction();

    await transactionManager.wallet.transfer(
      {
        owner: process.env.ONRAMP_WEBHOOK_WALLET,
        namespace: AccountNamespace.ETH,
        symbol: WFAIR_SYMBOL
      },
      {
        owner: user._id.toString(),
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
      internal_user_id: user._id.toString(),
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

    console.log(`Transferred ${amount} WFAIR to user ${user._id} successfully`);

    return res.status(204).send();
  } catch (e) {
    console.error('Transfer error: ', e.message);
    await transactionManager.rollbackTransaction();
    return next(new ErrorHandler('Something went wrong'));
  }
};

exports.getUser = async (req, res, next) => {
  const { id } = req.params;
  try {
    const data = await userService.getUserDataForAdmin(id)
    return res.send(data)
  } catch (e) {
    console.error(e)
    return next(new ErrorHandler(500));
  }
}

exports.listUsers = async (req, res, next) => {
  if (!req.user) {
    return next(new ErrorHandler(403, 'Not authorized'));
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ErrorHandler(400, errors));
  }

  const {
    search,
    sortField = 'date',
    sortOrder = 'desc',
    limit = 10,
    page = 1,
  } = req.query;

  try {
    const data = await userService.searchUsers(+limit, +limit * (+page - 1), search, sortField, sortOrder);
    return res.send(data)
  } catch (e) {
    console.error(e)
    return next(new ErrorHandler(500));
  }
}