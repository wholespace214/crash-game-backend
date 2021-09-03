// Import and configure dotenv to enable use of environmental variable
const dotenv = require('dotenv');
dotenv.config();

// Imports from express validator to validate user input
const { validationResult } = require('express-validator');

// Import Event model
const { Event } = require("@wallfair.io/wallfair-commons").models;

// Import service
const eventService           = require('../services/event-service');
const chatMessageService           = require('../services/chat-message-service');
const { calculateAllBetsStatus } = require("../services/event-service");

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
        .json(calculateAllBetsStatus(eventList));
};

const filterEvents = async (req, res) => {
    let { category, sortby, searchQuery, type} = req.params;
    let count = parseInt(req.params.count);
    let page = parseInt(req.params.page);

    let eventList = await eventService.filterEvents(type, category, count, page, sortby, searchQuery);

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
        .json(calculateAllBetsStatus(await eventService.getEvent(id)));
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

const getChatMessagesByEventId = async (req, res, next) => {
    // Validating User Inputs
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(res.status(422).send('Invalid input passed, please check it'));
    }

    // Defining User Inputs
    const { id } = req.params;
    res
        .status(200)
        .json(await chatMessageService.getNewestChatMessagesByEvent(id));
};

const getTags = async (req, res) => {
    const tags = await eventService.getTags();
    res
        .status(200)
        .json({
            data: tags
        })
}

exports.listEvents = listEvents;
exports.filterEvents = filterEvents;
exports.getEvent = getEvent;
exports.createEvent = createEvent;
exports.getChatMessagesByEventId = getChatMessagesByEventId;
exports.getTags = getTags;
