// Import JWT for authentication process
const jwt = require('jsonwebtoken');

// Import User model
const { User } = require('@wallfair.io/wallfair-commons').models;

// Import User Service
const userService = require('../services/user-service');

//Import twilio client
const twilio = require('twilio')(process.env.TWILIO_ACC_SID, process.env.TWILIO_AUTH_TOKEN);

const { Erc20 } = require('@wallfair.io/smart_contract_mock');
const WFAIR = new Erc20('WFAIR');

exports.doLogin = async (phone, ref) => {
    // Check if user with phone already exists
    let existingUser = await userService.getUserByPhone(phone);

    let verification = await twilio.verify
        .services(process.env.TWILIO_SID)
        .verifications.create({ to: phone, channel: 'sms' });

    if (!existingUser) {
        let createdUser = new User({
            phone: phone,
            ref: ref,
        });

        try {
            const session = await User.startSession();
            try {
                await session.withTransaction(async () => {
                    await userService.saveUser(createdUser, session);
                    createdUser = await userService.getUserByPhone(phone, session);
                    console.debug('createdUser ' + createdUser.id);
                    await userService.mintUser(createdUser.id.toString());
                });
            } finally {
                await session.endSession();
            }
        } catch (err) {
            console.debug(err);
            throw new Error('Signing up/in failed, please try again later.', 500);
        }
    }

    return { status: verification.status, existing: existingUser && existingUser.confirmed };
};

exports.verifyLogin = async (phone, smsToken) => {
    let user = await userService.getUserByPhone(phone);

    if (!user) {
        throw new Error('User not found, please try again', 422);
    }

    let verification;

    try {
        verification = await twilio.verify
            .services(process.env.TWILIO_SID)
            .verificationChecks.create({ to: phone, code: smsToken });
    } catch (err) {
        throw new Error('Invalid verification code', 401);
    }

    if (!verification || verification.status !== 'approved') {
        throw new Error('Invalid verification code', 401);
    }

    return user;
};

exports.generateJwt = async (user) => {
    return jwt.sign({ userId: user.id, phone: user.phone }, process.env.JWT_KEY);
};
