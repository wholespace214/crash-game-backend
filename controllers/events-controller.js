// Import and configure dotenv to enable use of environmental variable
const dotenv = require("dotenv");
dotenv.config();

// Imports from express validator to validate user input
const { validationResult } = require("express-validator");

// Import Models
const Event = require("../models/Event");
const Bet = require("../models/Bet");

// Import Auth Service
const eventService = require("../services/event-service");
const userService = require("../services/user-service");
const { BetContract, Erc20 } = require("smart_contract_mock");
const EVNT = new Erc20('EVNT');

// Controller to sign up a new user
const listEvents = async (req, res) => {
    // Validating User Inputs
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new Error("Invalid input passed, please check it", 422));
    }

    // Defining User Inputs
    const {id} = req.params;
    let eventList = await eventService.listEvent(id);

    res
        .status(201)
        .json(eventList);
};

const getEvent = async (req, res, next) => {
    // Validating User Inputs
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(res.status(422).send("Invalid input passed, please check it"));
    }

    // Defining User Inputs
    const {id} = req.params;

    res
        .status(200)
        .json(await eventService.getEvent(id));
};

const createEvent = async (req, res, next) => {
    // Validating User Inputs
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(res.status(422).send("Invalid input passed, please check it"));
    }

   try {
       // Defining User Inputs
       const {name, tags, streamUrl, previewImageUrl} = req.body;


       const createEvent = new Event({
           name: name,
           tags: tags,
           previewImageUrl: previewImageUrl,
           streamUrl: streamUrl,
           bets: []
       });

       let event = await eventService.saveEvent(createEvent);

       res
           .status(201)
           .json(event);
   } catch (err) {
        let error = res.status(422).send(err.message);
        next(error);
    }
};

const createBet = async (req, res, next) => {
    // Validating User Inputs
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(res.status(422).send("Invalid input passed, please check it"));
    }

    try {
        // Defining User Inputs
        const {eventId, marketQuestion, hot, betOne, betTwo, endDate, liquidityAmount} = req.body;


        let event = await eventService.getEvent(eventId);

        const createBet = new Bet({
            marketQuestion: marketQuestion,
            hot: hot,
            betOne: betOne,
            betTwo: betTwo,
            endDate: endDate,
            event: eventId,
            creator: req.user.id
        });

        const betContract = new BetContract(createBet.id);
        await betContract.addLiquidity(req.user.id, liquidityAmount * EVNT.ONE);

        let bet = await eventService.saveBet(createBet);

        if(event.bets === undefined) {
            event.bets = [];
        }

        event.bets.push(createBet);
        event = await eventService.saveEvent(event);

        res
            .status(201)
            .json(event);
    } catch (err) {
        let error = res.status(422).send(err.message);
        next(error);
    }
};

const placeBet = async (req, res, next) => {
    // Validating User Inputs
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(res.status(422).send("Invalid input passed, please check it"));
    }

    try {
        // Defining User Inputs
        const {amount, isOutcomeOne} = req.body;
        const {id} = req.params;

        let outcome = 1;
        if (isOutcomeOne) { outcome = 0; }

        const bet = await eventService.getBet(id);
        const user = await userService.getUserById(req.user.id);

        const betContract = new BetContract(id);
        await betContract.buy(req.user.id, amount * EVNT.ONE, ["yes", "no"][outcome], 1);

        user.openBets.push(bet.id);

        await userService.saveUser(user);

        res.status(201).json(bet);
    } catch (err) {
        let error = res.status(422).send(err.message);
        next(error);
    }
};

const calculateOutcome = async (req, res, next) => {
    // Validating User Inputs
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(res.status(422).send("Invalid input passed, please check it"));
    }

    try {
        // Defining User Inputs
        const {amount} = req.body;
        const {id} = req.params;

        const betContract = new BetContract(id);
        const outcomeOne = await betContract.calcBuy(amount * EVNT.ONE, "yes");
        const outcomeTwo = await betContract.calcBuy(amount * EVNT.ONE, "no");

        res.status(200).json({outcomeOne: outcomeOne / EVNT.ONE, outcomeTwo: outcomeTwo / EVNT.ONE});
    } catch (err) {
        let error = res.status(422).send(err.message);
        next(error);
    }
};

const payoutBet = async (req, res, next) => {
    // Validating User Inputs
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(res.status(422).send("Invalid input passed, please check it"));
    }

    try {
        const {id} = req.params;

        const bet = await eventService.getBet(id);
        const user = await userService.getUserById(req.user.id);

        const betContract = new BetContract(id);
        await betContract.getPayout(req.user.id);

        user.openBets = user.openBets.filter(item => item !== bet.id);
        user.closedBets.push(bet.id);

        await userService.saveUser(user);

        res.status(201).json(bet);
    } catch (err) {
        let error = res.status(422).send(err.message);
        next(error);
    }
};

exports.listEvents = listEvents;
exports.getEvent = getEvent;
exports.createEvent = createEvent;
exports.createBet = createBet;
exports.placeBet = placeBet;
exports.calculateOutcome = calculateOutcome;
exports.payoutBet = payoutBet;
