// Import and configure dotenv to enable use of environmental variable
const dotenv = require("dotenv");
dotenv.config();

// Imports from express validator to validate user input
const { validationResult } = require("express-validator");

// Import Event model
const Event = require("../models/Event");

// Import Auth Service
const eventService = require("../services/event-service");

// Controller to sign up a new user
const listEvents = async (req, res) => {
    res
        .status(201)
        .json(await eventService.listEvent());
};

const getEvent = async (req, res, next) => {
    // Validating User Inputs
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new Error("Invalid input passed, please check it", 422));
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
        return next(new Error("Invalid input passed, please check it", 422));
    }

   try {
       // Defining User Inputs
       const {title, liveMode, liveStreamUrl, endDate} = req.body;


       const createEvent = new Event({
           title: title,
           liveMode: liveMode,
           liveStreamUrl: liveStreamUrl,
           endDate: endDate
       });

       let event = await eventService.saveEvent(createEvent);

       res
           .status(201)
           .json(event);
   } catch (err) {
        let error = new Error(err.message, 422);
        next(error);
    }
};

exports.listEvents = listEvents;
exports.getEvent = getEvent;
exports.createEvent = createEvent;
