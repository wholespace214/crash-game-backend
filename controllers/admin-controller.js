const { validationResult } = require("express-validator");
const { ErrorHandler } = require("../util/error-handler");
const {
  AccountNamespace,
  WFAIR_SYMBOL,
  TransactionManager,
  ExternalTransactionOriginator,
  ExternalTransactionStatus,
  Transactions,
  toWei,
  Query,
  fromWei
} = require("@wallfair.io/trading-engine");
const { getUserByIdEmailPhoneOrUsername } = require("../services/user-api");
const { WALLETS } = require("../util/wallet");
const userService = require('../services/user-service');

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

exports.createPromoCode = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ErrorHandler(400, errors));
  }

  const {
    name,
    type,
    value,
    count,
    expiresAt
  } = req.body;

  try {
    const queryRunner = new Query();
    const result = await queryRunner.query(
      `INSERT INTO promo_code(name, type, value, count, expires_at) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [name, type, toWei(value).toString(), count || 0, expiresAt]
    );
    return res.status(201).send(result);
  } catch (e) {
    console.error('CRATE PROMO CODE: ', e.message);
    return next(new ErrorHandler('Failed to create a promo code'));
  }
};

exports.getPromoCodes = async (req, res, next) => {
  try {
    const result = await new Query().query(`SELECT * FROM promo_code`);
    return res.status(200)
      .send(result.map((r) => {
        return {
          ...r,
          value: fromWei(r.value).toFixed(2),
        }
      }));
  } catch (e) {
    console.error('GET PROMO CODES: ', e.message);
    return next(new ErrorHandler('Failed to fetch promo codes'));
  }
};

exports.updatePromoCode = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await new Query().query(
      'UPDATE promo_code SET expires_at = $1 WHERE id = $2 RETURNING *',
      [req.body.expiresAt, id]
    );
    return res.status(200).send(result);
  } catch (e) {
    console.error('UPDATE PROMO CODE: ', e.message);
    return next(new ErrorHandler('Failed to update promo code'));
  }
};
