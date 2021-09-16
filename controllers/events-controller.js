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
const logger = require('../util/logger');
const youtubeApi = require('../apis/youtube-api');
const { isAdmin } = require('../helper');

// Controller to sign up a new user
const listEvents = async (req, res, next) => {
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
  if (!isAdmin(req)) return next(new ErrorHandler(403, 'Action not allowed'));

  // Validating User Inputs
  const LOG_TAG = '[CREATE-EVENT]';

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ErrorHandler(422, 'Invalid input passed, please check it'));
  }

  try {
    // Defining User Inputs
    const {
      name,
      slug,
      streamUrl,
      previewImageUrl,
      category,
      tags = [],
      date,
      type,
    } = req.body;

    console.debug(LOG_TAG, 'Create a new Event', {
      name,
      slug,
      streamUrl,
      previewImageUrl,
      category,
      tags,
      date,
      type,
    });
    const createdEvent = new Event({
      name,
      slug,
      streamUrl,
      previewImageUrl,
      category,
      tags,
      date: new Date(date),
      type,
    });

    const event = await eventService.saveEvent(createdEvent);
    console.debug(LOG_TAG, 'Successfully created a new Event');

    return res.status(201).json(event);
  } catch (err) {
    console.error(err.message);
    return next(new ErrorHandler(422, err.message));
  }
};

const createEventFromYoutube = async (req, res, next) => {
  try {
    if (!req.body.youtubeVideoId) {
      return next(new ErrorHandler(404, 'No Video ID given'));
    }
    const videoData = youtubeApi.getVideosById(req.body.youtubeVideoId);
    if (!videoData) {
      return next(new ErrorHandler(404, 'Video not found'));
    }
    console.log(videoData);
    return videoData;
  } catch (err) {
    logger.error(err);
    return next(new ErrorHandler(422, err.message));
  }
};

const editEvent = async (req, res, next) => {
  if (!isAdmin(req)) return next(new ErrorHandler(403, 'Action not allowed'));

  try {
    const updatedEntry = await eventService.editEvent(req.params.id, req.body);
    if (!updatedEntry) return res.status(500).send();
    return res.status(200).json(updatedEntry);
  } catch (err) {
    return next(new ErrorHandler(422, err.message));
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
exports.createEventFromYoutube = createEventFromYoutube;
exports.editEvent = editEvent;
exports.getChatMessagesByEventId = getChatMessagesByEventId;
exports.getTags = getTags;
exports.sendEventEvaluate = sendEventEvaluate;
