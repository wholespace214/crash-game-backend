// Import and configure dotenv to enable use of environmental variable
const dotenv = require('dotenv');

dotenv.config();

// Imports from express validator to validate user input
const { validationResult } = require('express-validator');

// Import Event model
const { Event, Bet } = require('@wallfair.io/wallfair-commons').models;

// Import Mail Service
const mailService = require('../services/mail-service');

// Import service
const eventService = require('../services/event-service');
const { calculateAllBetsStatus } = require('../services/event-service');

const { ErrorHandler } = require('../util/error-handler');
const logger = require('../util/logger');
const youtubeService = require('../services/youtube-service');
const { isAdmin } = require('../helper');

// Controller to sign up a new user
const listEvents = async (req, res, next) => {
  // Validating User Inputs
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ErrorHandler(422, 'Invalid input passed, please check it'));
  }
  let q = {}
  if (!req.isAdmin){
    q = {bets: {$not: {$size: 0}}}
  }
  const eventList = await eventService.listEvents(q);
  res.status(201).json(calculateAllBetsStatus(eventList));
};

const filterEvents = async (req, res) => {
  const { category, sortby, searchQuery, type } = req.params;
  const count = +req.params.count;
  const page = +req.params.page;

  const eventList = await eventService.filterEvents(
    type,
    category,
    count,
    page,
    sortby,
    searchQuery,
    !req.isAdmin ? {bets: {$not: {$size: 0}}} : null
  );

  res.status(201).json(eventList);
};

const getCoverEvent = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ErrorHandler(422, 'Invalid input passed, please check it'));
  }

  let event = await eventService.getCoverEvent(req.params.type);

  res.status(200).json(calculateAllBetsStatus(event));
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
      bet,
    } = req.body;

    const isNonStreamedEvent = type === 'non-streamed';
    if (
      isNonStreamedEvent &&
      (!bet ||
        !['slug', 'marketQuestion', 'outcomes', 'endDate', 'evidenceDescription'].reduce(
          (acc, key) => acc && !!bet[key],
          true
        ))
    ) {
      throw new Error('Non-streamed event must have a bet.');
    } else if (!isNonStreamedEvent && !streamUrl) {
      throw new Error('Streamed event must have a streamUrl.');
    }

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

    if (isNonStreamedEvent) {
      const createdBet = new Bet({
        event: event._id,
        ...bet,
        date: new Date(),
        creator: req.user.id,
        published: true,
        endDate: new Date(bet.endDate),
        status: 'active',
      });
      const newBet = await createdBet.save();
      await eventService.editEvent(event._id, { bets: [newBet._id] });
    }

    return res.status(201).json(event);
  } catch (err) {
    console.error(err.message);
    return next(new ErrorHandler(422, err.message));
  }
};

const createEventFromYoutube = async (req, res, next) => {
  if (!isAdmin(req)) return next(new ErrorHandler(403, 'Action not allowed'));

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ErrorHandler(422, 'Invalid input passed, please check it'));
    }

    if (!req.body.youtubeVideoId) return next(new ErrorHandler(404, 'No Video ID given'));

    // TODO properly parse URL
    let streamUrl = req.body.youtubeVideoId;

    if (streamUrl.indexOf('/') == -1) {
      streamUrl = `https://www.youtube.com/watch?v=${req.body.youtubeVideoId}`;
    }

    let event = await youtubeService.getEventFromYoutubeUrl(streamUrl, req.body.category);

    return res.status(201).json(event);
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
exports.getTags = getTags;
exports.sendEventEvaluate = sendEventEvaluate;
exports.getCoverEvent = getCoverEvent;
