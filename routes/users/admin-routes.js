const router = require('express').Router();
const { check } = require('express-validator');
const adminController = require('../../controllers/admin-controller');

router.post(
  '/transfers',
  [
    check('amount').isNumeric(),
    check('email').notEmpty(),
    check('transactionHash').notEmpty(),
    check('userAddress').notEmpty(),
    check('inputAmount').notEmpty(),
    check('inputCurrency').isIn(['ETH', 'USDT', 'BTC', 'LTC']),
  ],
  adminController.transferToUser,
);

router.get('/users/:id',
  adminController.getUser
)

router.get('/users',
  adminController.listUsers
)

module.exports = router;
