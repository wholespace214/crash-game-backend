const router = require('express').Router();
const { check } = require('express-validator');

const userServiceV2 = require('../../../services/user-service-v2');

router.post(
  '/create',
  [
    check('phone').notEmpty(),
    check('username').notEmpty(),
    check('email').notEmpty(),
    check('password').notEmpty().isLength({min:8,max:255}),
  ],
  userServiceV2.createUser
);

router.post(
  "/verify-email",
  [check('email').notEmpty(),],
  userServiceV2.verifyEmail
);

module.exports = router;
