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

// Import Mail Service
const mailService = require("../services/mail-service");

// Import User Model
const User = require("../models/User");

const Bet   = require('../models/Bet');
const bigDecimal = require("js-big-decimal");


const { BetContract, Erc20, Wallet } = require('@wallfair.io/smart_contract_mock');
const WFAIR = new Erc20('WFAIR');


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
      walletAddress: user.walletAddress,
      session: await authService.generateJwt(user),
      confirmed: user.confirmed,
    });
  } catch (err) {
    let error = res.status(422).send(err.message);
    next(error);
  }
};

const bindWalletAddress = async (req, res, next) => {
  console.log("Binding wallet address", req.body);

  // retrieve wallet address
  const { walletAddress } = req.body;

  // ensure address is present
  if (!walletAddress) {
    return next(res.status(422).send("Property 'walletAddress' expected but was missing"));
  }

  try {
    //retrieve user who made the request
    let user = await userService.getUserById(req.user.id);

    // check if there is already a user with this wallet
    let walletUser = await User.findOne({walletAddress});

    // if this address was already bound to another user, return 409 error
    if (walletUser && walletUser.id != user.id) {
      return next(res.status(409).send("This wallet is already bound to another user"));
    } else if (!walletUser) {  
      user.walletAddress = walletAddress;
      user = await userService.saveUser(user);
    } else {
      // do nothing if wallet exists and is already bound to the same user who made the request
    }

    res.status(201).json({
      userId: user.id,
      walletAddress
    });

  } catch (err) {
    console.log(err);
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

    await rewardRefUserIfNotConfirmed(user);

    user = await userService.saveUser(user);

    await mailService.sendConfirmMail(user);

    res.status(201).json({
      userId: user.id,
      phone: user.phone,
      name: user.username,
      email: user.email,
    });
  } catch (err) {
      console.log(err);
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
    const userConfirmedChanged  = await rewardRefUserIfNotConfirmed(user);

    if (userConfirmedChanged) {
        user = await userService.saveUser(user);
    }

    res.status(201).json({
      confirmed: user.confirmed,
    });
  } catch (err) {
    let error = res.status(422).send(err.message);
    next(error);
  }
};

const rewardRefUserIfNotConfirmed = async (user) => {
    if(!user.confirmed) {
        await userService.rewardRefUser(user.ref);
        await userService.createUser(user);

        user.confirmed = true;

        return true;
    }

    return false;
}

// Receive all users in leaderboard
const getLeaderboard = async (req, res, next) => {
  let limit = parseInt(req.params.limit);
  let skip = parseInt(req.params.skip);

  let users = await User.find({username: {"$exists": true}})
                        .select({username: 1, amountWon: 1})
                        .sort({amountWon: -1})
                        .limit(limit)
                        .skip (skip)
                        .exec();

  let total = await User.countDocuments().exec();

  res.json({
    total,
    users,
    limit,
    skip
  });
};

// Receive all users
// TODO is this method being used by anything other than leaderboard?
// if no, remove it
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
    const balance = await WFAIR.balanceOf(user.id);
      if(user.username === undefined || user.username === null) {
          continue;
      }
    usersWithBalance.push({userId: user.id, name: user.username, balance: (balance / WFAIR.ONE).toString()});
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
        const balance = await WFAIR.balanceOf(req.params.userId);
        const formattedBalance = new bigDecimal(balance).getPrettyValue(4, '.');
        let {rank, toNextRank} = await userService.getRankByUserId(req.params.userId);
        res.status(200).json({
            userId: user.id,
            name: user.name,
            username: user.username,
            profilePicture: user.profilePicture,
            balance: formattedBalance,
            totalWin: userService.getTotalWin(balance).toString(),
            admin: user.admin,
            emailConfirmed: user.emailConfirmed,
            rank,
            toNextRank,
            amountWon: user.amountWon
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
                if(betEvent.finalOutcome !== undefined && betEvent.finalOutcome.length > 0) {
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
                        investmentAmount: new bigDecimal(investment).getPrettyValue('4', '.'),
                        outcomeAmount: new bigDecimal(balance).getPrettyValue('4', '.')
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
                const investmentAmount    = new bigDecimal(BigInt(interaction.investmentamount) / WFAIR.ONE).getPrettyValue('4', '.');
                const feeAmount           = new bigDecimal(BigInt(interaction.feeamount) / WFAIR.ONE).getPrettyValue('4', '.');
                const outcomeTokensBought = new bigDecimal(BigInt(interaction.outcometokensbought) / WFAIR.ONE).getPrettyValue('4', '.');

                transactions.push({
                    ...interaction,
                    investmentAmount,
                    feeAmount,
                    outcomeTokensBought,
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

const confirmEmail = async (req, res, next) => {
    // Validating User Inputs
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(
            res
                .status(400)
                .send(
                    errors
                )
        );
    }

    // Defining User Inputs
    const { code, userId } = req.query;

    const user = await userService.getUserById(userId);

    if(user.emailConfirmed) {
        return next(res
            .status(403)
            .send(
                {error: 'EMAIL_ALREADY_CONFIRMED', message: 'The email has already been confirmed!' }
            ));
    }

    if(user.emailCode === code) {
        user.emailConfirmed = true;
        await user.save();
        res
            .status(200)
            .send(
                {status: 'OK'}
            );
    } else {
        res
            .status(403)
            .send(
                {error: 'INVALID_EMAIL_CODE', message: 'The email code is invalid!' }
            );
    }
}

const resendConfirmEmail = async (req, res) => {
    const userId = req.user.id;

    const user = await userService.getUserById(userId);

    await mailService.sendConfirmMail(user);

    res
        .status(200)
        .send(
            {status: 'OK'}
        );
}

const updateUser = async (request, response) => {
    if (request.user.admin === false && request.params.userId !== request.user.id) {
        response
            .status(403)
            .send(
                {status: 'Forbidden'}
            )
    } else {
        await userService.updateUser(request.params.userId, request.body)
        response
            .status(200)
            .send(
                {status: 'OK'}
            );
    }
}

exports.login                     = login;
exports.verfiySms                 = verfiySms;
exports.bindWalletAddress         = bindWalletAddress;
exports.saveAdditionalInformation = saveAdditionalInformation;
exports.saveAcceptConditions      = saveAcceptConditions;
exports.getUsers                  = getUsers;
exports.getUserInfo               = getUserInfo;
exports.getRefList                = getRefList;
exports.getOpenBetsList           = getOpenBetsList;
exports.getClosedBetsList         = getClosedBetsList;
exports.getTransactions           = getTransactions;
exports.getAMMHistory             = getAMMHistory;
exports.confirmEmail              = confirmEmail;
exports.resendConfirmEmail        = resendConfirmEmail;
exports.updateUser                = updateUser;
exports.getLeaderboard            = getLeaderboard;
