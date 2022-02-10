// Import the express Router to create routes
const router = require('express').Router();
const { check } = require('express-validator');
const userController = require('../../controllers/users-controller');

router.get('/getLeaderboard/:skip/:limit', userController.getLeaderboard);

router.get(
  '/confirm-email',
  [check('userId').isString(), check('code').isLength({ min: 6, max: 6 })],
  userController.confirmEmail
);

router.get('/resend-confirm',
  [check('userId').isString()],
  userController.resendConfirmEmail);

router.get('/:userId/info', userController.getBasicUserInfo);

router.post('/check-username', userController.checkUsername);

router.get('/:userId/stats', userController.getUserStats);

router.get('/count', userController.getUserCount)

router.get('/:userId/kyc-start', userController.startKycVerification);

router.get('/random-username', userController.randomUsername)

router.post(
  '/verify-sms',
  [check('userId').isString(), check('phone').isMobilePhone(), check('smsToken').isNumeric().isLength({ min: 6, max: 6 })],
  userController.verifySms
);
router.post(
  '/send-sms',
  [check('phone').isMobilePhone()],
  userController.sendSms
);
module.exports = router;
