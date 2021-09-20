const router = require('express').Router();
const { check } = require('express-validator');

const userServiceV2 = require('../../../services/user-service-v2');

router.post(
  '/login',
  [
    check('userIdentifier').notEmpty(),
    check('password').notEmpty().isLength({ min: 8, max: 255 }),
  ],
  userServiceV2.login,
);

module.exports = router;
