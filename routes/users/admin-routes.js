const router = require('express').Router();
const { check } = require('express-validator');
const adminController = require('../../controllers/admin-controller');
const multer = require('multer');
const upload = multer({ dest: 'tmp/uploads/' })

router.post(
  '/transfers',
  [
    check('amount').isNumeric(),
    check('transactionHash').notEmpty(),
    check('userAddress').notEmpty(),
    check('inputAmount').notEmpty(),
    check('inputCurrency').isIn(['ETH', 'USDT', 'BTC', 'LTC']),
  ],
  adminController.transferToUser,
);

router.get('/users/:id',
  adminController.getUser
);

router.get('/users',
  adminController.listUsers
);

router.post(
  '/promo-codes',
  [
    check('name').notEmpty(),
    check('type').notEmpty(),
    check('value').isNumeric(),
    check('expiresAt').notEmpty(),
  ],
  adminController.createPromoCode
);

router.get(
  '/promo-codes',
  adminController.getPromoCodes
);

router.patch(
  '/promo-codes/:id',
  adminController.updatePromoCode
);

router.post(
  '/promo-codes/add',
  [
    check('promoCode').notEmpty()
  ],
  upload.single('file'),
  adminController.addBonusManually
);


router.post(
  '/casino/mint-bonus',
  [
    check('amount').isNumeric()
  ],
  adminController.mintCasinoBonusWallet
);

router.post(
  '/bet/mint',
  [
    check('amount').isNumeric()
  ],
  adminController.mintBetLiquidity
);

module.exports = router;
