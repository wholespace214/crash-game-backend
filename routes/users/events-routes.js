// Import the express Router to create routes
const router = require('express').Router();
const { check, query } = require('express-validator');
const eventController = require('../../controllers/events-controller');
const betController = require('../../controllers/bets-controller');

router.get('/list', eventController.listEvents);

router.get('/list/:type/:category/:count/:page/:sortby', eventController.filterEvents);

router.get('/list/:type/:category/:count/:page/:sortby/:searchQuery', eventController.filterEvents);

router.get(
    '/chat-messages/:id',
    [check('id').notEmpty()],
    eventController.getChatMessagesByEventId
);

router.post(
    '/bet/:id/outcomes/buy',
    [check('amount').isNumeric()],
    betController.calculateBuyOutcome
);

router.post(
    '/bet/:id/outcomes/sell',
    [check('amount').isNumeric()],
    betController.calculateSellOutcome
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
    betController.betHistory
);

router.get('/tags', eventController.getTags);

module.exports = router;
