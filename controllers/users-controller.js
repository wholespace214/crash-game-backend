// Import and configure dotenv to enable use of environmental variable
const dotenv = require("dotenv");
dotenv.config();

// Imports from express validator to validate user input
const { validationResult } = require("express-validator");

// Import Auth Service
const authService = require("../services/auth-service");

// Controller to sign up a new user
const login = async (req, res, next) => {
  // Validating User Inputs
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new Error("Invalid input passed, please check it", 422));
  }

  // Defining User Inputs
  const {phone} = req.body;

  try {
    let response = await authService.doLogin(phone);
    res
        .status(201)
        .json({phone: phone, smsStatus: response});

  } catch (err) {
    let error = new Error(err.message, 422);
    next(error);
  }
};

const verfiySms = async (req, res, next) => {
  // Validating User Inputs
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new Error("Invalid input passed, please check it", 422));
  }

  // Defining User Inputs
  const {phone, smsToken} = req.body;

  try {
    let user = await authService.verifyLogin(phone, smsToken);

    res
        .status(201)
        .json({userId: user.id, phone: user.phone, session: user.session});
  } catch (err) {
    let error = new Error(err.message, 422);
    next(error);
  }
};

exports.login = login;
exports.verfiySms = verfiySms;
