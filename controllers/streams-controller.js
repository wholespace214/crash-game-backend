// Import and configure dotenv to enable use of environmental variable
const dotenv = require("dotenv");
dotenv.config();

// Imports from express validator to validate user input
const { validationResult } = require("express-validator");

// Import Event model
const Stream = require("../models/Stream");

// Import Auth Service
const streamService = require("../services/stream-service");

// Controller to sign up a new user
const listStreams = async (req, res) => {
    res
        .status(201)
        .json(await streamService.listStreams());
};

const getStream = async (req, res, next) => {
    // Validating User Inputs
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new Error("Invalid input passed, please check it", 422));
    }

    // Defining User Inputs
    const {id} = req.params;

    res
        .status(200)
        .json(await streamService.getStream(id));
};

const createStream = async (req, res, next) => {
    // Validating User Inputs
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new Error("Invalid input passed, please check it", 422));
    }

    try {
        // Defining User Inputs
        const {title, liveMode, liveStreamUrl, endDate} = req.body;


        const createStream = new Stream({
            title: title,
            liveMode: liveMode,
            liveStreamUrl: liveStreamUrl,
            endDate: endDate
        });

        let event = await streamService.saveStream(createStream);

        res
            .status(201)
            .json(event);
    } catch (err) {
        let error = new Error(err.message, 422);
        next(error);
    }
};

exports.listStreams = listStreams;
exports.getStream = getStream;
exports.createStream = createStream;
