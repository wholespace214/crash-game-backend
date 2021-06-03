// Import and configure dotenv to enable use of environmental variable
const dotenv = require("dotenv");
dotenv.config();

// Imports from express validator to validate user input
const { validationResult } = require("express-validator");

// Import Auth Service
const authService = require("../services/auth-service");

// Import User Service
const userService = require("../services/user-service");

// Import User Model
const User = require("../models/User");


const { Erc20 } = require('smart_contract_mock');
const EVNT = new Erc20('EVNT');


// Controller to sign up a new user
const login = async (req, res, next) => {
  // Validating User Inputs
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      res
        .status(422)
        .send(
          "The phone number entered does not seem to be in the correct format"
        )
    );
  }

  // Defining User Inputs
  const { phone, ref } = req.body;

  try {
    let response = await authService.doLogin(phone, ref);
    res.status(201).json({ phone: phone, smsStatus: response });
  } catch (err) {
    let error = res.status(422).send(err.message);
    next(error);
  }
};

const verfiySms = async (req, res, next) => {
  // Validating User Inputs
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(res.status(422).send("The code you entered seems to be wrong"));
  }

  // Defining User Inputs
  const { phone, smsToken } = req.body;

  try {
    let user = await authService.verifyLogin(phone, smsToken);

    res.status(201).json({
      userId: user.id,
      phone: user.phone,
      name: user.name,
      email: user.email,
      session: user.session,
      confirmed: user.confirmed,
    });
  } catch (err) {
    let error = res.status(422).send(err.message);
    next(error);
  }
};

const saveAdditionalInformation = async (req, res, next) => {
  // Validating User Inputs
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      res
        .status(422)
        .send(
          "The mail address entered does not seem to be in the correct format"
        )
    );
  }

  // Defining User Inputs
  const { email, name } = req.body;

  try {
    let user = await userService.getUserById(req.user.id);

    user.name = name;
    user.email = email;
    user = await userService.saveUser(user);

    res.status(201).json({
      userId: user.id,
      phone: user.phone,
      name: user.name,
      email: user.email,
    });
  } catch (err) {
    let error = res.status(422).send(err.message);
    next(error);
  }
};

const saveAcceptConditions = async (req, res, next) => {
  // Validating User Inputs
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(res.status(422).send("All conditions need to be accepted!"));
  }

  try {
    let user = await userService.getUserById(req.user.id);
    user.confirmed = true;
    user = await userService.saveUser(user);

    res.status(201).json({
      confirmed: user.confirmed,
    });
  } catch (err) {
    let error = res.status(422).send(err.message);
    next(error);
  }
};

// Receive all users
const getUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find({}, { name: 1 });
  } catch (err) {
    const error = new Error(
      "Fetching users failed, please try again later.",
      500
    );
    return next(error);
  }
  const usersWithBalance = [];

  for (const user of users) {
    const balance = await EVNT.balanceOf(user.id);
    usersWithBalance.push({userId: user.id, name: user.name, balance: balance / EVNT.ONE});
  }

  res.json({ users: usersWithBalance });
};

// Receive specific user information
const getUserInfo = async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        const balance = await EVNT.balanceOf(req.params.userId);
        res.status(200).json({
            userId: user.id,
            name: user.name,
            profilePictureUrl: user.profilePictureUrl,
            balance: balance / EVNT.ONE,
        });
    } catch (err) {
        res.status(400).send( "Es ist ein Fehler beim laden deiner Account Informationen aufgetreten" );
    }
};

// Receive specific user information
const getRefList = async (req, res) => {
  try {
    const refList = await userService.getRefByUserId(req.user.id);
    res.status(200).json({
      userId: req.user.id,
      refList: refList
    });
  } catch (err) {
    res.status(400).send( "Es ist ein Fehler beim laden deiner Account Informationen aufgetreten" );
  }
};

exports.login = login;
exports.verfiySms = verfiySms;
exports.saveAdditionalInformation = saveAdditionalInformation;
exports.saveAcceptConditions = saveAcceptConditions;
exports.getUsers = getUsers;
exports.getUserInfo = getUserInfo;
exports.getRefList = getRefList;
