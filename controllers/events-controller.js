// Import and configure dotenv to enable use of environmental variable
const dotenv = require('dotenv');
dotenv.config();

// Imports from express validator to validate user input
const { validationResult } = require('express-validator');

// Import Models
const Event = require('../models/Event');
const Bet   = require('../models/Bet');

// Import Auth Service
const eventService           = require('../services/event-service');
const userService            = require('../services/user-service');
const { BetContract, Erc20 } = require('smart_contract_mock');
const EVNT                   = new Erc20('EVNT');

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
        const { name, tags, streamUrl, previewImageUrl } = req.body;

        console.debug(LOG_TAG, 'Create a new Event',
            { name: name, tags: tags, previewImageUrl: previewImageUrl, streamUrl: streamUrl },
        );
        const createEvent = new Event({
            name:            name,
            tags:            tags,
            previewImageUrl: previewImageUrl,
            streamUrl:       streamUrl,
            bets:            [],
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
        const { eventId, marketQuestion, hot, betOne, betTwo, endDate } = req.body;
        const liquidityAmount                                           = 10000;

        let event = await eventService.getEvent(eventId);

        console.debug(LOG_TAG, event);
        console.debug(LOG_TAG, {
            marketQuestion: marketQuestion, hot: hot, betOne: betOne,
            betTwo:         betTwo, endDate: endDate, event: eventId, creator: req.user.id,
        });

        const createBet = new Bet({
            marketQuestion: marketQuestion,
            hot:            hot,
            betOne:         betOne,
            betTwo:         betTwo,
            endDate:        endDate,
            event:          eventId,
            creator:        req.user.id,
        });

        const liquidityProviderWallet = 'LIQUIDITY_' + createBet.id;
        const betContract             = new BetContract(createBet.id);

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
        const {amount, isOutcomeOne, minOutcomeTokens} = req.body;
        const {id} = req.params;

        if (amount <= 0) {
            throw Error('Invalid input passed, please check it');
        }

        let minOutcomeTokensToBuy = 1;
        if (minOutcomeTokens > 1) {
            minOutcomeTokensToBuy = minOutcomeTokens;
        }

        let outcome = 1;

        if (isOutcomeOne) {
            outcome = 0;
        }

        const userId = req.user.id;

        console.debug(LOG_TAG, 'Placing Bet', id, userId);

        const bet  = await eventService.getBet(id);
        const user = await userService.getUserById(userId);

        console.debug(LOG_TAG, 'Interacting with the AMM');

        const betContract      = new BetContract(id);
        const investmentAmount = amount * EVNT.ONE;
        const outcomeToken     = ['yes', 'no'][outcome];

        await betContract.buy(userId, investmentAmount, outcomeToken, minOutcomeTokensToBuy * EVNT.ONE);

        console.debug(LOG_TAG, 'Successfully bought Tokens');

        user.openBets.push(bet.id);

        const outcomeValue = [bet.betOne, bet.betTwo][outcome];

        eventService.placeBet(userId, bet, amount, outcomeValue);

        await userService.saveUser(user);
        console.debug(LOG_TAG, 'Saved user');

        res.status(200).json(bet);
    } catch (err) {
        console.error(err.message);
        let error = res.status(422).send(err.message);
        next(error);
    }
};

const pullOutBet = async (req, res, next) => {
    const LOG_TAG = '[PLACE-BET]';
    // Validating User Inputs
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(res.status(422).send("Invalid input passed, please check it"));
    }

    try {
        // Defining User Inputs
        const {amount, isOutcomeOne, maxOutcomeTokens} = req.body;
        const {id} = req.params;

        if (amount <= 0) {
            throw Error("Invalid input passed, please check it");
        }

        let maxOutcomeTokensToSell = Number.MAX_SAFE_INTEGER;
        if (maxOutcomeTokens) {
            maxOutcomeTokensToSell = maxOutcomeTokens;
        }

        let outcome = 1;
        if (isOutcomeOne) {
            outcome = 0;
        }

        console.debug(LOG_TAG, 'Placing Bet', id, req.user.id);
        const bet = await eventService.getBet(id);

        console.debug(LOG_TAG, 'Interacting with the AMM');
        const betContract = new BetContract(id);
        await betContract.sell(req.user.id, amount * EVNT.ONE, ["yes", "no"][outcome], maxOutcomeTokensToSell * EVNT.ONE);
        console.debug(LOG_TAG, 'Successfully sold Tokens');

        res.status(200).json(bet);
    } catch (err) {
        console.error(err.message);
        let error = res.status(422).send(err.message);
        next(error);
    }
};

const calculateOutcome = async (req, res, next) => {
    const LOG_TAG = '[CALCULATE-OUTCOME]';
    // Validating User Inputs
    const errors  = validationResult(req);
    if (!errors.isEmpty()) {
        return next(res.status(422).send('Invalid input passed, please check it'));
    }

    try {
        // Defining User Inputs
        const { amount } = req.body;
        const { id }     = req.params;

        if (amount <= 0) {
            throw Error('Invalid input passed, please check it');
        }

        console.debug(LOG_TAG, 'Calculating Outcomes');
        const betContract = new BetContract(id);
        const outcomeOne  = await betContract.calcBuy(amount * EVNT.ONE, 'yes');
        const outcomeTwo  = await betContract.calcBuy(amount * EVNT.ONE, 'no');

        console.debug(LOG_TAG, 'Outcomes successfully calculated',
            { outcomeOne: outcomeOne / EVNT.ONE, outcomeTwo: outcomeTwo / EVNT.ONE },
        );

        res.status(200).json({ outcomeOne: outcomeOne / EVNT.ONE, outcomeTwo: outcomeTwo / EVNT.ONE });
    } catch (err) {
        console.error(err.message);
        let error = res.status(422).send(err.message);
        next(error);
    }
};

const payoutBet = async (req, res, next) => {
    const LOG_TAG = '[PAYOUT-BET]';
    // Validating User Inputs
    const errors  = validationResult(req);
    if (!errors.isEmpty()) {
        return next(res.status(422).send('Invalid input passed, please check it'));
    }

    try {
        const { id } = req.params;

        console.debug(LOG_TAG, 'Payout Bet', id, req.user.id);
        const bet  = await eventService.getBet(id);
        const user = await userService.getUserById(req.user.id);

        console.debug(LOG_TAG, 'Requesting Bet Payout');
        const betContract = new BetContract(id);
        await betContract.getPayout(req.user.id);

        console.debug(LOG_TAG, 'Payed out Bet');
        user.openBets = user.openBets.filter(item => item !== bet.id);
        user.closedBets.push(bet.id);

        await userService.saveUser(user);

        res.status(201).json(bet);
    } catch (err) {
        console.error(err.message);
        let error = res.status(422).send(err.message);
        next(error);
    }
};

exports.listEvents = listEvents;
exports.getEvent = getEvent;
exports.createEvent = createEvent;
exports.createBet = createBet;
exports.placeBet = placeBet;
exports.pullOutBet = pullOutBet;
exports.calculateOutcome = calculateOutcome;
exports.payoutBet        = payoutBet;
