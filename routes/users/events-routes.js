// Import the express Router to create routes
const router = require('express').Router();
const { check, query } = require('express-validator');
const eventController = require('../../controllers/events-controller');
const betController = require('../../controllers/bets-controller');
const passport = require("passport");

function checkAdmin(req, res, next) {
  return passport.authenticate('jwt', { session: false }, function (err, user) {
    req.isAdmin = !err && user && user.admin;
    next();
  })(req, res, next);
}

router.get('/list',
  checkAdmin,
  eventController.listEvents);

router.get('/list/:type/:category/:count/:page/:sortby',
  checkAdmin,
  eventController.filterEvents);

router.get('/list/:type/:category/:count/:page/:sortby/:searchQuery',
  checkAdmin,
  eventController.filterEvents);

router.get(
  '/cover/:type',
  [check('type').notEmpty()],
  eventController.getCoverEvent);

router.post(
  '/bet/:id/outcomes/buy',
  [check('amount').isNumeric()],
  betController.calculateBuyOutcome,
);

router.post(
  '/bet/:id/outcomes/sell',
  [check('amount').isNumeric()],
  betController.calculateSellOutcome,
);

router.get(
  '/bet/:id/history',
  [
    check('id').notEmpty(),
    query('direction')
      .isIn(['BUY', 'SELL'])
      .withMessage('Direction type must be one of values [BUY, SELL]'),
    query('rangeType')
      .isIn(['day', 'hour'])
      .withMessage('Range type must be one of values [day, hour]'),
    query('rangeValue').isInt({ min: 1 }).withMessage('Range value must be numeric and >= 1'),
  ],
  betController.betHistory,
);

router.get(
  '/trade/:id',
  [check('id').notEmpty()],
  betController.getTrade
)

router.get('/tags', eventController.getTags);

router.post('/evaluate', eventController.sendEventEvaluate);

module.exports = router;
