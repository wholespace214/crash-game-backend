// Import and configure dotenv to enable use of environmental variable
const dotenv = require('dotenv');
dotenv.config();

// Imports from express validator to validate user input
const { validationResult } = require('express-validator');

// Import Auth Service
const authService = require('../services/auth-service');

// Import User Service
const userService = require('../services/user-service');

// Import Event Service
const eventService = require('../services/event-service');

// Import Mail Service
const mailService = require('../services/mail-service');

// Import User and Bet Models
const { User, Bet } = require('@wallfair.io/wallfair-commons').models;

const { ErrorHandler } = require('../util/error-handler');

const bigDecimal = require('js-big-decimal');

const { BetContract, Erc20, Wallet } = require('@wallfair.io/smart_contract_mock');
const WFAIR = new Erc20('WFAIR');

// Controller to sign up a new user
const login = async (req, res, next) => {
    // Validating User Inputs
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new ErrorHandler(422, 'Invalid phone number'));
    }

    // Defining User Inputs
    const { phone, ref } = req.body;

    try {
        let response = await authService.doLogin(phone, ref);
        res.status(201).json({
            phone: phone,
            smsStatus: response.status,
            existing: !!response.existing,
        });
    } catch (err) {
        console.error(err);
        next(new ErrorHandler(422, err.message));
    }
};

const verfiySms = async (req, res, next) => {
    // Validating User Inputs
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new ErrorHandler(422, 'Invalid verification code'));
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
        next(new ErrorHandler(422, err.message));
    }
};

const bindWalletAddress = async (req, res, next) => {
    console.log('Binding wallet address', req.body);

    // retrieve wallet address
    const { walletAddress } = req.body;

    // ensure address is present
    if (!walletAddress) {
        return next(new ErrorHandler(422, 'WalletAddress expected, but was missing'));
    }

    try {
        // check if there is already a user with this wallet
        let walletUser = await User.findOne({ walletAddress });

        // if this address was already bound to another user, return 409 error
        if (walletUser && walletUser.id != req.user.id) {
            return next(new ErrorHandler(409, 'This wallet is already bound to another user'));
        } else if (!walletUser) {
            //retrieve user who made the request
            let user = await userService.getUserById(req.user.id);

            user.walletAddress = walletAddress;
            user = await userService.saveUser(user);
        } else {
            // do nothing if wallet exists and is already bound to the same user who made the request
        }

        res.status(201).json({
            userId: user.id,
            walletAddress,
        });
    } catch (err) {
        console.log(err);
        next(new ErrorHandler(422, err.message));
    }
};

const saveAdditionalInformation = async (req, res, next) => {
    // Validating User Inputs
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new ErrorHandler(422, errors[0]));
    }

    // Defining User Inputs
    const { email, name, username } = req.body;

    try {
        let user = await userService.getUserById(req.user.id);

        if (username) {
            let usernameUser = await User.findOne({ username: username });

            if (usernameUser !== null && !usernameUser._id.equals(user._id)) {
                return next(new ErrorHandler(409, 'Username is already used'));
            }

            user.username = username.replace(' ', '');
            user.name = name;
        }

        if (email) {
            let emailUser = await User.findOne({ email: email });

            if (emailUser !== null && !emailUser._id.equals(user._id)) {
                return next(new ErrorHandler(409, 'Email address is already used'));
            }

            user.email = email.replace(' ', '');

            await rewardRefUserIfNotConfirmed(user);
            await mailService.sendConfirmMail(user);
        }

        user = await userService.saveUser(user);

        res.status(201).json({
            userId: user.id,
            phone: user.phone,
            name: user.username,
            email: user.email,
        });
    } catch (err) {
        next(new ErrorHandler(422, err.message));
    }
};

const saveAcceptConditions = async (req, res, next) => {
    // Validating User Inputs
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new ErrorHandler(422, 'All conditions need to be accepted'));
    }

    try {
        let user = await userService.getUserById(req.user.id);
        const userConfirmedChanged = await rewardRefUserIfNotConfirmed(user);

        if (userConfirmedChanged) {
            user = await userService.saveUser(user);
        }

        res.status(201).json({
            confirmed: user.confirmed,
        });
    } catch (err) {
        next(new ErrorHandler(422, err.message));
    }
};

const rewardRefUserIfNotConfirmed = async (user) => {
    if (!user.confirmed) {
        await userService.rewardRefUser(user.ref);
        await userService.createUser(user);
        user.confirmed = true;
    }

    return user.confirmed;
};

// Receive all users in leaderboard
const getLeaderboard = async (req, res, next) => {
    const limit = +req.params.limit;
    const skip = +req.params.skip;

    let users = await User.find({ username: { $exists: true } })
        .select({ username: 1, amountWon: 1 })
        .sort({ amountWon: -1 })
        .limit(limit)
        .skip(skip)
        .exec();

    let total = await User.countDocuments().exec();

    res.json({
        total,
        users,
        limit,
        skip,
    });
};

// Receive specific user information
const getUserInfo = async (req, res, next) => {
    try {
        const userId = req.params.userId;

        const user = await User.findById(userId);
        const balance = await WFAIR.balanceOf(userId);
        const formattedBalance = new bigDecimal(balance).getPrettyValue(4, '.');
        let { rank, toNextRank } = await userService.getRankByUserId(userId);

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
            amountWon: user.amountWon,
        });
    } catch (err) {
        next(new ErrorHandler(422, 'Account information loading failed'));
    }
};

// Receive specific user information
const getRefList = async (req, res, next) => {
    try {
        const refList = await userService.getRefByUserId(req.user.id);

        res.status(200).json({
            userId: req.user.id,
            refList: refList,
        });
    } catch (err) {
        next(new ErrorHandler(422, 'Account information loading failed'));
    }
};

const getClosedBetsList = async (req, res, next) => {
    const user = req.user;

    try {
        if (user) {
            const userId = req.user.id;
            const user = await userService.getUserById(userId);
            const closedBets = user.closedBets;

            response.status(200).json({
                closedBets,
            });
        } else {
            return next(new ErrorHandler(404, 'User not found'));
        }
    } catch (err) {
        console.error(err);
        next(new ErrorHandler(500, err.message));
    }
};

const getOpenBetsList = async (req, res, next) => {
    const user = req.user;

    try {
        if (user) {
            const userId = user.id;
            const openBetIds = user.openBets.filter(
                (value, index, self) => self.indexOf(value) === index
            );
            const openBets = [];

            for (const openBetId of openBetIds) {
                const wallet = new Wallet(userId);
                const betEvent = await Bet.findById(openBetId);

                //TODO For the payout function, the bet may have to be displayed as an open bet!
                if (betEvent.finalOutcome !== undefined && betEvent.finalOutcome.length > 0) {
                    continue;
                }

                const bet = new BetContract(openBetId, betEvent.outcomes.length);

                for (const outcome of betEvent.outcomes) {
                    const investment = await wallet.investmentBet(openBetId, outcome.index);
                    const balance = await bet
                        .getOutcomeToken(outcome.index)
                        .balanceOf(userId.toString());

                    if (!investment || !balance) {
                        continue;
                    }

                    const openBet = {
                        betId: openBetId,
                        outcome: outcome.index,
                        investmentAmount: new bigDecimal(investment).getPrettyValue('4', '.'),
                        outcomeAmount: new bigDecimal(balance).getPrettyValue('4', '.'),
                    };

                    openBets.push(openBet);
                }
            }

            res.status(200).json({
                openBets,
            });
        } else {
            return next(new ErrorHandler(404, 'User not found'));
        }
    } catch (err) {
        console.error(err);
        next(new ErrorHandler(500, err.message));
    }
};

const getTransactions = async (req, res, next) => {
    const user = req.user;

    try {
        if (user) {
            const wallet = new Wallet(user.id);
            const trx = await wallet.getTransactions();

            res.status(200).json(trx);
        } else {
            return next(new ErrorHandler(404, 'User not found'));
        }
    } catch (err) {
        console.error(err);
        next(new ErrorHandler(500, err.message));
    }
};

const getAMMHistory = async (req, res, next) => {
    const user = req.user;

    try {
        if (user) {
            const wallet = new Wallet(user.id);
            const interactions = await wallet.getAMMInteractions();
            const transactions = [];

            for (const interaction of interactions) {
                const investmentAmount = new bigDecimal(
                    BigInt(interaction.investmentamount) / WFAIR.ONE
                ).getPrettyValue('4', '.');
                const feeAmount = new bigDecimal(
                    BigInt(interaction.feeamount) / WFAIR.ONE
                ).getPrettyValue('4', '.');
                const outcomeTokensBought = new bigDecimal(
                    BigInt(interaction.outcometokensbought) / WFAIR.ONE
                ).getPrettyValue('4', '.');

                transactions.push({
                    ...interaction,
                    investmentAmount,
                    feeAmount,
                    outcomeTokensBought,
                });
            }

            res.status(200).json(transactions);
        } else {
            return next(new ErrorHandler(404, 'User not found'));
        }
    } catch (err) {
        console.error(err);
        next(new ErrorHandler(500, err.message));
    }
};

const confirmEmail = async (req, res, next) => {
    // Validating User Inputs
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(res.status(400).send(errors));
    }

    // Defining User Inputs
    const { code, userId } = req.query;

    const user = await userService.getUserById(userId);

    if (user.emailConfirmed) {
        return next(new ErrorHandler(403, 'The email has been already confirmed'));
    }

    if (user.emailCode === code) {
        user.emailConfirmed = true;
        await user.save();
        res.status(200).send({ status: 'OK' });
    } else {
        next(new ErrorHandler(422, 'The email code is invalid'));
    }
};

const resendConfirmEmail = async (req, res, next) => {
    try {
        const user = await userService.getUserById(req.user.id);
        await mailService.sendConfirmMail(user);
        res.status(200).send({ status: 'OK' });
    } catch (err) {
        next(new ErrorHandler(422, err.message));
    }
};

const updateUser = async (req, res, next) => {
    if (req.user.admin === false && req.params.userId !== req.user.id) {
        return next(new ErrorHandler(403, 'Action not allowed'));
    }

    try {
        await userService.updateUser(request.params.userId, request.body);
        res.status(200).send({ status: 'OK' });
    } catch (error) {
        next(new ErrorHandler(422, err.message));
    }
};

exports.login = login;
exports.verfiySms = verfiySms;
exports.bindWalletAddress = bindWalletAddress;
exports.saveAdditionalInformation = saveAdditionalInformation;
exports.saveAcceptConditions = saveAcceptConditions;
exports.getUserInfo = getUserInfo;
exports.getRefList = getRefList;
exports.getOpenBetsList = getOpenBetsList;
exports.getClosedBetsList = getClosedBetsList;
exports.getTransactions = getTransactions;
exports.getAMMHistory = getAMMHistory;
exports.confirmEmail = confirmEmail;
exports.resendConfirmEmail = resendConfirmEmail;
exports.updateUser = updateUser;
exports.getLeaderboard = getLeaderboard;
