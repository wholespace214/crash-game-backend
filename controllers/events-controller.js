// Import and configure dotenv to enable use of environmental variable
const dotenv = require('dotenv');
dotenv.config();

// Imports from express validator to validate user input
const { validationResult } = require('express-validator');

// Import Models
const Event = require('../models/Event');

// Import service
const eventService           = require('../services/event-service');

// Controller to sign up a new user
const listEvents = async (req, res) => {
    // Validating User Inputs
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new Error('Invalid input passed, please check it', 422));
    }

    // Defining User Inputs
    const { id }  = req.params;
    let eventList = await eventService.listEvent(id);

    res
        .status(201)
        .json(eventList);
};

const getEvent = async (req, res, next) => {
    // Validating User Inputs
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(res.status(422).send('Invalid input passed, please check it'));
    }

    // Defining User Inputs
    const { id } = req.params;

    res
        .status(200)
        .json(await eventService.getEvent(id));
};

const createEvent = async (req, res, next) => {
    // Validating User Inputs
    const LOG_TAG = '[CREATE-EVENT]';

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(res.status(422).send('Invalid input passed, please check it'));
    }

    try {
        // Defining User Inputs
        const { name, tags, streamUrl, previewImageUrl, date } = req.body;

        console.debug(LOG_TAG, 'Create a new Event',
            { name: name, tags: tags, previewImageUrl: previewImageUrl, streamUrl: streamUrl },
        );
        const createEvent = new Event({
            name:            name,
            tags:            tags,
            previewImageUrl: previewImageUrl,
            streamUrl:       streamUrl,
            bets:            [],
            date: date,
        });

        let event = await eventService.saveEvent(createEvent);
        console.debug(LOG_TAG, 'Successfully saved');

        res.status(201).json(event);
    } catch (err) {
        console.error(err.message);
        let error = res.status(422).send(err.message);
        next(error);
    }
};

const createBet = async (req, res, next) => {
    const LOG_TAG = '[CREATE-BET]';
    // Validating User Inputs
    const errors  = validationResult(req);
    if (!errors.isEmpty()) {
        return next(res.status(422).send('Invalid input passed, please check it'));
    }

    try {
        // Defining User Inputs
        const { eventId, marketQuestion, description, hot, outcomes, endDate } = req.body;
        const liquidityAmount                                           = 214748;

        let event = await eventService.getEvent(eventId);

        console.debug(LOG_TAG, event);
        console.debug(LOG_TAG, {
            marketQuestion: marketQuestion, hot: hot, outcomes: outcomes, endDate: endDate, event: eventId, creator: req.user.id,
        });

        const outcomesDb = outcomes.map((outcome, index) =>
            ({ index, name: outcome.value })
        );

        const createBet = new Bet({
            marketQuestion: marketQuestion,
            description:    description,
            hot:            hot,
            outcomes:       outcomesDb,
            date:        endDate,
            event:          eventId,
            creator:        req.user.id,
        });

        const liquidityProviderWallet = 'LIQUIDITY_' + createBet.id;
        const betContract             = new BetContract(createBet.id, createBet.outcomes.length);

        console.debug(LOG_TAG, 'Minting new Tokens');
        await EVNT.mint(liquidityProviderWallet, liquidityAmount * EVNT.ONE);
        console.debug(LOG_TAG, 'Adding Liquidity to the Event');
        await betContract.addLiquidity(liquidityProviderWallet, liquidityAmount * EVNT.ONE);

        console.debug(LOG_TAG, 'Save Bet to MongoDB');
        await eventService.saveBet(createBet);

        if (event.bets === undefined) {
            event.bets = [];
        }

        console.debug(LOG_TAG, 'Save Bet to Event');
        event.bets.push(createBet);
        event = await eventService.saveEvent(event);

        await eventService.betCreated(createBet, req.user.id);

        res.status(201).json(event);
    } catch (err) {
        console.error(err.message);
        let error = res.status(422).send(err.message);
        next(error);
    }
};

const placeBet = async (req, res, next) => {
    const LOG_TAG = '[PLACE-BET]';
    // Validating User Inputs
    const errors  = validationResult(req);
    if (!errors.isEmpty()) {
        return next(res.status(422).send('Invalid input passed, please check it'));
    }

    try {
        // Defining User Inputs
        const {amount, outcome, minOutcomeTokens} = req.body;
        const {id} = req.params;

        if (amount <= 0) {
            throw Error('Invalid input passed, please check it');
        }

        let minOutcomeTokensToBuy = 1;
        if (minOutcomeTokens > 1) {
            minOutcomeTokensToBuy = minOutcomeTokens;
        }

        const userId = req.user.id;

        console.debug(LOG_TAG, 'Placing Bet', id, userId);

        const bet  = await eventService.getBet(id);

        if(eventService.isBetTradable(bet)) {
            res.status(405).json('No further action can be performed on an event that has ended!');
            return;
        }

        const user = await userService.getUserById(userId);

        console.debug(LOG_TAG, 'Interacting with the AMM');

        const betContract      = new BetContract(id, bet.outcomes.length);
        const investmentAmount = amount * EVNT.ONE;

        await betContract.buy(userId, investmentAmount, outcome, minOutcomeTokensToBuy * EVNT.ONE);

        console.debug(LOG_TAG, 'Successfully bought Tokens');

        if(user.openBets.indexOf(bet.id) === -1) {
            user.openBets.push(bet.id);
        }

        eventService.placeBet(user, bet, amount, outcome);

        await userService.saveUser(user);
        console.debug(LOG_TAG, 'Saved user');

        res.status(200).json(bet);
    } catch (err) {
        console.error(err.message);
        let error = res.status(422).send(err.message);
        next(error);
    }
};

exports.listEvents = listEvents;
exports.getEvent = getEvent;
exports.createEvent = createEvent;
