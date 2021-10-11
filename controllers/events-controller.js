// Import and configure dotenv to enable use of environmental variable
const dotenv = require('dotenv');

dotenv.config();

// Imports from express validator to validate user input
const { validationResult } = require('express-validator');

// Import Event model
const { Event, Bet } = require('@wallfair.io/wallfair-commons').models;
const { publishEvent, notificationEvents } = require('../services/notification-service');

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
  if (!req.isAdmin) {
    q = {
      bets: { $not: { $size: 0 } },
      state: { $ne: "offline" },
    }
  }
  const eventList = await eventService.listEvents(q);
  res.status(201).json(calculateAllBetsStatus(eventList));
};

const filterEvents = async (req, res) => {
  const { category, sortby, searchQuery, type, upcoming, deactivated } = req.params;
  const count = +req.params.count;
  const page = +req.params.page;

  const eventList = await eventService.filterEvents(
    type,
    category,
    count,
    page,
    sortby,
    upcoming === 'true',
    deactivated === 'true',
    searchQuery,
    !req.isAdmin ? { bets: { $not: { $size: 0 } } } : null,
    type === "streamed" && req.isAdmin,
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

    if (isNonStreamedEvent && (bet.outcomes.length < 2 || bet.outcomes.length > 4)) {
      throw new Error('Bet must have between 2 and 4 outcomes.');
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

    const { user } = req;
    if (isNonStreamedEvent) {
      const createdBet = new Bet({
        event: event._id,
        ...bet,
        date: new Date(),
        creator: user.id,
        published: true,
        endDate: new Date(bet.endDate),
        status: 'active',
      });
      const newBet = await createdBet.save();

      publishEvent(notificationEvents.EVENT_NEW_BET, {
        producer: 'user',
        producerId: user.id,
        data: {
          bet: newBet,
          user: {
            username: user.username,
            profilePicture: user.profilePicture,
            name: user.name,
            amountWon: user.amountWon
          }
        },
        broadcast: true
      });

      await eventService.provideLiquidityToBet(newBet);
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

const deleteEvent = async (req, res, next) => {
  if (!isAdmin(req)) return next(new ErrorHandler(403, 'Action not allowed'));
  try {
    const { id } = req.params;
    const event = await eventService.getEvent(id);
    if (!event) {
      return next(new ErrorHandler(404, 'Event not found'));
    }
    if (
      event.bets?.length > 0 &&
      event.bets.some(({ status }) => status !== eventService.BET_STATUS.canceled)
    ) {
      return next(new ErrorHandler(422, 'All event bets must be cancelled'));
    }

    const deletedEvent = await eventService.deleteEvent(id);

    return res.status(200).json(deletedEvent);
  } catch (err) {
    return next(new ErrorHandler(422, err.message));
  }
};

const bookmarkEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id
    if(id && userId){
      await eventService.bookmarkEvent(id, userId)
    } else {
      return next(new ErrorHandler(404, 'Event not found'));
    }
  } catch (err){
    return next(new ErrorHandler(422, err.message));
  }
}

const bookmarkEventCancel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id
    if(id && userId){
      await eventService.bookmarkEventCancel(id, userId)
    } else {
      return next(new ErrorHandler(404, 'Event not found'));
    }
  } catch (err){
    return next(new ErrorHandler(422, err.message));
  }
}

const getTags = async (req, res) => {
  const tags = await eventService.getTags();
  res.status(200).json({
    data: tags,
  });
};

const sendEventEvaluate = async (req, res, next) => {
  try {
    const { payload } = req.body;
    const ratings = {
      0: 'Excellent',
      1: 'Good',
      2: 'Lame',
      3: 'Unethical',
    };
    const { bet_question } = payload;
    const rating = ratings[payload.rating];
    const { comment } = payload;

    publishEvent(notificationEvents.EVENT_BET_EVALUATED, {
      producer: 'system',
      producerId: 'notification-service',
      data: {
        bet_question,
        rating,
        comment,
      },
    });

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
exports.deleteEvent = deleteEvent;
exports.getTags = getTags;
exports.sendEventEvaluate = sendEventEvaluate;
exports.getCoverEvent = getCoverEvent;
exports.bookmarkEvent = bookmarkEvent;
exports.bookmarkEventCancel = bookmarkEventCancel;
