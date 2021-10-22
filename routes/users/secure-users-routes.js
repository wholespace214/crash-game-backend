// Import the express Router to create routes
const router = require('express').Router();

// Imports from express validator to validate user input
const { check, oneOf } = require('express-validator');

// Import User Controller
const userController = require('../../controllers/users-controller');

router.post(
  '/bindWalletAddress',
  [check('walletAddress').notEmpty()],
  userController.bindWalletAddress
);

router.post(
  '/saveAdditionalInformation',
  oneOf([
    [
      check('name').notEmpty(),
      check('username').notEmpty(),
      check('username').isLength({ min: 3, max: 25 }),
      check('name').isLength({ min: 3 }),
    ],
    check('email').isEmail(),
  ]),
  userController.saveAdditionalInformation
);

router.post(
  '/acceptConditions',
  [check('conditions').isArray({ min: 3, max: 3 })],
  userController.saveAcceptConditions
);

router.get('/refList', userController.getRefList);

router.get('/open-bets', userController.getOpenBetsList);

router.get('/history', userController.getHistory);

router.get('/trade-history', userController.getTradeHistory);
router.post('/requestTokens', userController.requestTokens);

router.patch(
  '/:userId',
  oneOf([[check('username').isLength({ min: 3, max: 25 }), check('email').isEmail()]]),
  userController.updateUser
);

router.patch(
  '/:userId/preferences',
  [check('preferences').notEmpty()],
  userController.updateUserPreferences
);

router.get('/:userId', userController.getUserInfo);

router.post('/:userId/status', userController.updateStatus);

module.exports = router;
