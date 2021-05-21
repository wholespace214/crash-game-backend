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
const {BetContract} = require("smart_contract_mock");

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
        const {eventId, marketQuestion, hot, betOne, betTwo, endDate} = req.body;


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

        let bet = await eventService.saveBet(createBet);

        if(event.bets === undefined) {
            event.bets = [];
        }

        // ToDo Konsti: Provide Liquidity

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
        const {amount, outcome} = req.body;
        const {id} = req.params;

        if (outcome > 1 || outcome < 0) {
            throw Error("Invalid outcome");
        }

        let bet = await eventService.getBet(id);

        const betContract = new BetContract(id);
        await betContract.buy(req.user.id, amount, ["yes", "no"][outcome], 1);

        bet = await eventService.saveBet(createBet);

        res
            .status(201)
            .json(bet);
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
