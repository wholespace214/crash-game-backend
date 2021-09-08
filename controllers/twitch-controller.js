const twitchService = require('../services/twitch-service');
// Imports from express validator to validate user input
const { validationResult } = require('express-validator');

const getEventFromTwitchUrl = async (req, res, next) => {
    console.log('body', req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new ErrorHandler(422, 'Invalid input passed, please check it'));
    }

    try {
        const { streamUrl } = req.body;

        let event = await twitchService.getEventFromTwitchUrl(streamUrl);

        res.status(201).json(event);
    } catch (err) {
        console.error(err.message);
        next(new ErrorHandler(422, err.message));
    }
};
exports.getEventFromTwitchUrl = getEventFromTwitchUrl;
