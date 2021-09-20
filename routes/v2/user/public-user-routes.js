const router = require('express').Router();
const { check } = require('express-validator');

const userServiceV2 = require('../../../services/user-service-v2');

router.post(
  '/create',
  [
    check('email').notEmpty().isEmail(),
    check('password').notEmpty().isLength({ min: 8, max: 255 }),
  ],
  userServiceV2.createUser,
);

router.post(
  '/verify-email',
  [check('email').notEmpty().isEmail()],
  userServiceV2.verifyEmail,
);

router.post(
  '/reset-password',
  [check('email').notEmpty().isEmail()],
  userServiceV2.resetPassword,
);

module.exports = router;
