// Import JWT for authentication process
const jwt = require("jsonwebtoken");

// Import User model
const User = require("../models/User");

// Import User Service
const userService = require("../services/user-service");

//Import twilio client
const twilio = require('twilio')(process.env.TWILIO_ACC_SID, process.env.TWILIO_AUTH_TOKEN);

exports.doLogin = async (phone, ref) => {
    // Check if user with phone already exists
    let existingUser = await userService.getUserByPhone(phone);

    let verification = await twilio.verify.services(process.env.TWILIO_SID)
        .verifications
        .create({to: phone, channel: 'sms'});


    if (!existingUser) {
        const createdUser = new User({
            phone: phone,
            ref: ref
        });

        await userService.rewardRefUser(ref);

        try {
            await userService.saveUser(createdUser);
        } catch (err) {
            throw new Error("Signing up/in failed, please try again later.", 500);
        }
    }
    return verification.status;
}

exports.verifyLogin = async (phone, smsToken) => {
    let user = await userService.getUserByPhone(phone);

    if (!user) {
        throw new Error("User not found, please try again.", 422);
    }

    let verification;

    try {
        verification = await twilio.verify.services(process.env.TWILIO_SID)
            .verificationChecks
            .create({to: phone, code: smsToken})
    } catch (err) {
        throw new Error("sms verification timeout or token incorrect", 401);
    }

    if(verification === undefined || verification.status !== "approved") {
        throw new Error("sms verification timeout or token incorrect", 401);
    }

    user.session = await this.generateJwt(user);
    user = await userService.saveUser(user);

    return user;
}

exports.generateJwt = async (user) => {
    return jwt.sign(
        { userId: user.id, phone: user.phone },
        process.env.JWT_KEY);
}