const { validationResult } = require('express-validator');
const twitchService = require('../services/twitch-service');
const { ErrorHandler } = require('../util/error-handler');

const getEventFromTwitchUrl = async (req, res, next) => {
  console.log('body', req.body);
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ErrorHandler(422, 'Invalid input passed, please check it'));
  }

  try {
    const { streamUrl, category } = req.body;

    const event = await twitchService.getEventFromTwitchUrl(streamUrl, category);

    res.status(201).json(event);
  } catch (err) {
    console.error(err.message);
    next(new ErrorHandler(422, err.message));
  }
};
exports.getEventFromTwitchUrl = getEventFromTwitchUrl;
