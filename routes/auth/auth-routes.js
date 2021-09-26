const router = require('express').Router();
const { check } = require('express-validator');
const sessionsController = require('../../controllers/sessions-controller');

router.post(
  '/login',
  [check('userIdentifier').notEmpty(), check('password').notEmpty().isLength({ min: 8, max: 255 })],
  sessionsController.login
);

router.post(
  '/sign-up',
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

/** Triggers the "I've forgot my passwort" process */
router.post(
  '/forgot-password',
  [check('email').notEmpty().isEmail()],
  sessionsController.forgotPassword
);

/** Route to acutally reset your password */
router.post(
  '/reset-password',
  [
    check('email').notEmpty().isEmail(),
    check('passwordResetToken').notEmpty().isLength({ min: 1, max: 12 }),
    check('password').notEmpty(),
    check('passwordConfirmation').notEmpty(),
  ],
  sessionsController.resetPassword,
);

module.exports = router;
