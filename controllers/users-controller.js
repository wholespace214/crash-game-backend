// Import and configure dotenv to enable use of environmental variable
const dotenv = require('dotenv');
dotenv.config();

// Imports from express validator to validate user input
const { validationResult } = require("express-validator");

// Import Auth Service
const authService = require("../services/auth-service");

// Import User Service
const userService = require("../services/user-service");

// Import Event Service
const eventService = require("../services/event-service");

// Import User Model
const User = require("../models/User");

const Bet   = require('../models/Bet');


const { BetContract, Erc20, Wallet } = require('smart_contract_mock');
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
    console.error(err);
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
      session: await authService.generateJwt(user),
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
  const { email, name, username } = req.body;

  try {
    let user = await userService.getUserById(req.user.id);

    let emailUser = await User.findOne({email: email});
    let usernameUser = await User.findOne({username: username});

    if(emailUser !== null) {
        res
            .status(409)
            .send(
                "The mail address already exists"
            )
        return;
    }

    if(usernameUser !== null) {
          res
              .status(409)
              .send(
                  "The username already exists"
              )
          return;
      }

    if(username.length < 3) {
        res
            .status(409)
            .send(
                "The username must have at least 3 characters"
            )
        return;
    }

    user.name = name;
    user.email = email.replace(" ", "");
    user.username = username.replace(" ", "");
    user = await userService.saveUser(user);

    res.status(201).json({
      userId: user.id,
      phone: user.phone,
      name: user.username,
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

    if(!user.confirmed) {
        await userService.rewardRefUser(user.ref);
        await userService.createUser(user);
    }

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
    users = await User.find({}, { name: 1, username: 1 });
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
      if(user.username === undefined || user.username === null) {
          continue;
      }
    usersWithBalance.push({userId: user.id, name: user.username, balance: balance / EVNT.ONE});
  }

    usersWithBalance.sort(function (a, b) {
        return b.balance - a.balance;
    });

  let counter = 1;
    for (const user of usersWithBalance) {
        user['index'] = counter;
        counter += 1;
    }

  res.json({ users: usersWithBalance });
};

// Receive specific user information
const getUserInfo = async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        const balance = await EVNT.balanceOf(req.params.userId);
        const rank = await userService.getRankByUserId(req.params.userId);
        res.status(200).json({
            userId: user.id,
            name: user.name,
            username: user.username,
            profilePictureUrl: user.profilePictureUrl,
            balance: balance / EVNT.ONE,
            rank: rank
        });
    } catch (err) {
        console.error(err);
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

const getClosedBetsList = async (request, response) => {
    const user = request.user;

    try {
        if (user) {
            const userId     = request.user.id;
            const user = await userService.getUserById(userId);

            const closedBets = user.closedBets;
            response
                .status(200)
                .json({
                    closedBets
                })
            ;
        } else {
            response
                .status(404)
                .send('User not found')
            ;
        }
    } catch (error) {
        console.error(error);
        response
            .status(500)
            .send('An error occured loading closed bets list: ' + error.message)
        ;
    }
};

const getOpenBetsList = async (request, response) => {
    const user = request.user;

    try {
        if (user) {
            const userId     = user.id;
            const openBetIds = user.openBets.filter(
                (value, index, self) => self.indexOf(value) === index,
            );
            const openBets   = [];

            for (const openBetId of openBetIds) {
                const wallet = new Wallet(userId);
                const betEvent = await Bet.findById(openBetId);

                //TODO For the payout function, the bet may have to be displayed as an open bet!
                if(betEvent.finalOutcome !== undefined) {
                    continue;
                }

                const bet = new BetContract(openBetId, betEvent.outcomes.length);


                for(const outcome of betEvent.outcomes) {
                    const investment  = await wallet.investmentBet(openBetId, outcome.index);
                    const balance  = await bet.getOutcomeToken(outcome.index).balanceOf(userId.toString());

                    if(!investment  || !balance) {
                        continue;
                    }

                    const openBet = {
                        betId:            openBetId,
                        outcome:          outcome.index,
                        investmentAmount: investment / EVNT.ONE,
                        outcomeAmount: balance / EVNT.ONE
                    };

                    openBets.push(openBet);
                }
            }

            response
                .status(200)
                .json({
                    openBets,
                })
            ;
        } else {
            response
                .status(404)
                .send('User not found')
            ;
        }
    } catch (error) {
        console.error(error);
        response
            .status(500)
            .send('An error occured loading open bets list: ' + error.message)
        ;
    }
};

const getTransactions = async (request, response) => {
    const user = request.user;

    try {
        if (user) {
            const userId     = user.id;
            const wallet     = new Wallet(userId);
            const trx        = await wallet.getTransactions();

            response
                .status(200)
                .json(trx);
        } else {
            response
                .status(404)
                .send('User not found');
        }
    } catch (error) {
        console.error(error);
        response
            .status(500)
            .send('An error occured loading open bets list: ' + error.message);
    }
};

const getAMMHistory = async (request, response) => {
    const user = request.user;

    try {
        if (user) {
            const userId       = user.id;
            const wallet       = new Wallet(userId);
            const interactions = await wallet.getAMMInteractions();
            const transactions = [];

            for (const interaction of interactions) {
                transactions.push({
                    ...interaction,
                    investmentamount:    interaction.investmentamount / EVNT.ONE,
                    feeamount:           interaction.feeamount / EVNT.ONE,
                    outcometokensbought: interaction.outcometokensbought / EVNT.ONE,
                });
            }

            response
                .status(200)
                .json(transactions);
        } else {
            response
                .status(404)
                .send('User not found');
        }
    } catch (error) {
        console.error(error);
        response
            .status(500)
            .send('An error occured loading open bets list: ' + error.message);
    }
};

exports.login                     = login;
exports.verfiySms                 = verfiySms;
exports.saveAdditionalInformation = saveAdditionalInformation;
exports.saveAcceptConditions      = saveAcceptConditions;
exports.getUsers                  = getUsers;
exports.getUserInfo               = getUserInfo;
exports.getRefList                = getRefList;
exports.getOpenBetsList           = getOpenBetsList;
exports.getClosedBetsList         = getClosedBetsList;
exports.getTransactions           = getTransactions;
exports.getAMMHistory             = getAMMHistory;
