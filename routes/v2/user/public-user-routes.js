const router = require('express').Router();
const { check } = require('express-validator');

const sessionsController = require('../../../controllers/sessions-controller');

router.post(
  '/create',
  [
    check('email').notEmpty(),
    check('passwordConfirm').notEmpty(),
    check('password')
      .notEmpty()
      .isLength({ min: 8, max: 255 })
      .custom((value, { req }) => {
        if (value !== req.body.passwordConfirm) {
          throw new Error("Passwords don't match");
        } else {
          return value;
        }
      }),
  ],
  sessionsController.createUser
);

router.post('/verify-email', [check('email').notEmpty().isEmail()], sessionsController.verifyEmail);

router.post(
  '/reset-password',
  [check('email').notEmpty().isEmail()],
  sessionsController.resetPassword
);

module.exports = router;
