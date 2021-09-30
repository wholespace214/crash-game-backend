// Import the express Router to create routes
const router = require('express').Router();

// Imports from express validator to validate user input
const { check } = require('express-validator');

// Import controllers
const eventController = require('../../controllers/events-controller');
const betController = require('../../controllers/bets-controller');
const twitchController = require('../../controllers/twitch-controller');

// Login does register & login
router.get('/get/:id', [check('id').notEmpty()], eventController.getEvent);

router.post(
  '/create',
  [
    check('name').notEmpty().isString().isLength({ max: 255 }),
    check('slug'),
    check('streamUrl').isString().optional().isLength({ max: 500 }),
    check('previewImageUrl').isString().notEmpty().isLength({ max: 255 }),
    check('category').notEmpty(),
    check('tags').isArray(),
    check('date').notEmpty(),
    check('type').isString().notEmpty(),
  ],
  eventController.createEvent
);

router.post(
  '/create-from-youtube',
  [check('youtubeVideoId').isString().notEmpty(), check('type').isString().notEmpty()],
  eventController.createEventFromYoutube
);

router.post(
  '/:id',
  [
    check('name').isLength({ max: 255 }),
    check('slug'),
    check('streamUrl').isLength({ max: 500 }),
    check('previewImageUrl').isLength({ max: 255 }),
    check('category'),
    check('tags'),
    check('date'),
    check('type'),
  ],
  eventController.editEvent
);

router.post(
  '/bet/create',
  [
    check('event').isString().notEmpty(),
    check('marketQuestion').isString().notEmpty().isLength({ max: 255 }),
    check('slug').isString().notEmpty().isLength({ max: 255 }),
    check('outcomes').isArray({ min: 2, max: 4 }),
    check('evidenceSource').isLength({ max: 2200 }),
    check('evidenceDescription').isLength({ max: 2200 }),
    check('date').notEmpty(),
    check('published').default(true),
  ],
  betController.createBet
);

router.post(
  '/bet/:betId',
  [
    check('event').isString(),
    check('marketQuestion').isString().isLength({ max: 255 }),
    check('slug').isString().isLength({ max: 255 }),
    check('outcomes').isArray({ min: 0 }),
    check('evidenceDescription').isLength({ max: 1200 }),
    check('date'),
    check('published'),
  ],
  betController.editBet
);

router.post(
  '/extract/twitch',
  [check('streamUrl').notEmpty()],
  twitchController.getEventFromTwitchUrl
);

router.post(
  '/bet/:id/place',
  [
    check('amount').isNumeric(),
    check('outcome').isNumeric(),
    check('minOutcomeTokens').isNumeric().default(0).optional(),
  ],
  betController.placeBet
);

router.post(
  '/bet/:id/pullout',
  [
    check('amount').isNumeric(),
    check('outcome').isNumeric(),
    check('minReturnAmount').isNumeric().default(Number.MAX_SAFE_INTEGER).optional(),
  ],
  betController.pullOutBet
);

router.get('/bet/:id/payout', betController.payoutBet);

router.post(
  '/bet/:id/resolve',
  [
    check('evidenceActual').isString(),
    check('evidenceDescription').isString(),
    check('outcomeIndex').isNumeric(),
  ],
  betController.resolveBet
);


router.post(
  '/bet/:id/cancel',
  [
    check('id').notEmpty(),
    check('reasonOfCancellation').notEmpty(),
  ],
  betController.cancelBet,
);

router.delete(
  '/bet/:id/delete',
  [
    check('id').notEmpty(),
  ],
  betController.deleteBet,
);

module.exports = router;
