const router = require('express').Router();
const { check } = require('express-validator');

const sessionsController = require('../../../controllers/sessions-controller');

router.post(
  '/login',
  [check('userIdentifier').notEmpty(), check('password').notEmpty().isLength({ min: 8, max: 255 })],
  sessionsController.login
);

module.exports = router;
