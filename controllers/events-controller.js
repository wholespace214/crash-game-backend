// Import and configure dotenv to enable use of environmental variable
const dotenv = require('dotenv');

dotenv.config();

// Imports from express validator to validate user input
const { validationResult } = require('express-validator');

// Import Event model
const { Event } = require('@wallfair.io/wallfair-commons').models;

// Import Mail Service
const mailService = require('../services/mail-service');

// Import service
const eventService = require('../services/event-service');
const chatMessageService = require('../services/chat-message-service');
const { calculateAllBetsStatus } = require('../services/event-service');

const { ErrorHandler } = require('../util/error-handler');

// Controller to sign up a new user
const listEvents = async (req, res) => {
  // Validating User Inputs
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ErrorHandler(422, 'Invalid input passed, please check it'));
  }

  // Defining User Inputs
  const { id } = req.params;
  const eventList = await eventService.listEvent(id);

  res.status(201).json(calculateAllBetsStatus(eventList));
};

const filterEvents = async (req, res) => {
  const {
    category, sortby, searchQuery, type,
  } = req.params;
  const count = +req.params.count;
  const page = +req.params.page;

  const eventList = await eventService.filterEvents(
    type,
    category,
    count,
    page,
    sortby,
    searchQuery,
  );

  res.status(201).json(eventList);
};

const getEvent = async (req, res, next) => {
  // Validating User Inputs
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ErrorHandler(422, 'Invalid input passed, please check it'));
  }

  res.status(200).json(calculateAllBetsStatus(await eventService.getEvent(req.params.id)));
};

const createEvent = async (req, res, next) => {
  // Validating User Inputs
  const LOG_TAG = '[CREATE-EVENT]';

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ErrorHandler(422, 'Invalid input passed, please check it'));
  }

  try {
    // Defining User Inputs
    const {
      name, tags, streamUrl, previewImageUrl, date, slug,
    } = req.body;

    console.debug(LOG_TAG, 'Create a new Event', {
      name,
      tags,
      previewImageUrl,
      streamUrl,
      slug,
    });
    const createEvent = new Event({
      name,
      tags,
      previewImageUrl,
      streamUrl,
      bets: [],
      date,
      slug,
    });

    const event = await eventService.saveEvent(createEvent);
    console.debug(LOG_TAG, 'Successfully saved');

    res.status(201).json(event);
  } catch (err) {
    console.error(err.message);
    next(new ErrorHandler(422, err.message));
  }
};

const getChatMessagesByEventId = async (req, res, next) => {
  // Validating User Inputs
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ErrorHandler(422, 'Invalid input passed, please check it'));
  }

  res.status(200).json(await chatMessageService.getNewestChatMessagesByEvent(req.params.id));
};

const getTags = async (req, res) => {
  const tags = await eventService.getTags();
  res.status(200).json({
    data: tags,
  });
};

const sendEventEvaluate = async (req, res, next) => {
  try {
    const { payload } = req.body;
    await mailService.sendEventEvaluateMail(payload);
    res.status(200).send({ status: 'OK' });
  } catch (err) {
    next(new ErrorHandler(422, err.message));
  }
};

exports.listEvents = listEvents;
exports.filterEvents = filterEvents;
exports.getEvent = getEvent;
exports.createEvent = createEvent;
exports.getChatMessagesByEventId = getChatMessagesByEventId;
exports.getTags = getTags;
exports.sendEventEvaluate = sendEventEvaluate;
