// Import and configure dotenv to enable use of environmental variable
const dotenv = require("dotenv");
dotenv.config();

// Imports from express validator to validate user input
const { validationResult } = require("express-validator");

// Import Auth Service
const authService = require("../services/auth-service");

// Import User Service
const userService = require("../services/user-service");

// Controller to sign up a new user
const login = async (req, res, next) => {
  // Validating User Inputs
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(res.status(422).send("Invalid input passed, please check it"));
  }

  // Defining User Inputs
  const {phone} = req.body;

  try {
    let response = await authService.doLogin(phone);
    res
        .status(201)
        .json({phone: phone, smsStatus: response});

  } catch (err) {
    let error = res.status(422).send(err.message);
    next(error);
  }
};

const verfiySms = async (req, res, next) => {
  // Validating User Inputs
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(res.status(422).send("Invalid input passed, please check it"));
  }

  // Defining User Inputs
  const {phone, smsToken} = req.body;

  try {
    let user = await authService.verifyLogin(phone, smsToken);

    res
        .status(201)
        .json({userId: user.id, phone: user.phone, name: user.name, email: user.email, session: user.session});
  } catch (err) {
    let error = res.status(422).send(err.message);
    next(error);
  }
};

const saveAdditionalInformation = async (req, res, next) => {
  // Validating User Inputs
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(res.status(422).send("Invalid input passed, please check it"));
  }

  // Defining User Inputs
  const {email, name} = req.body;

  try {
    let user = await userService.getUserById(req.user.id);

    user.name = name;
    user.email = email;
    user = await userService.saveUser(user);

    res
        .status(201)
        .json({userId: user.id, phone: user.phone, name: user.name, email: user.email});
  } catch (err) {
    let error = res.status(422).send(err.message);
    next(error);
  }
}

exports.login = login;
exports.verfiySms = verfiySms;
exports.saveAdditionalInformation = saveAdditionalInformation;