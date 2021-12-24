const { ObjectId } = require('mongodb');
const logger = require('../util/logger');
const userApi = require('../services/user-api');
const { ErrorHandler, BannedError } = require('../util/error-handler');
const authService = require('../services/auth-service');
const { validationResult } = require('express-validator');
// const userService = require('../services/user-service');
const mailService = require('../services/mail-service');
const { generate, hasAcceptedLatestConsent } = require('../helper');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const { notificationEvents } = require('@wallfair.io/wallfair-commons/constants/eventTypes');
const { Account } = require('@wallfair.io/trading-engine');
const amqp = require('../services/amqp-service');
const { isUserBanned } = require('../util/user');
const userService = require("../services/user-service");

module.exports = {
  async createUser(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ErrorHandler(422, errors));
    }

    try {
      const { password, email, username, ref, cid, sid, recaptchaToken } = req.body;
      const { skip } = req.query;
      if (!process.env.RECAPTCHA_SKIP_TOKEN || process.env.RECAPTCHA_SKIP_TOKEN !== skip) {
        const recaptchaRes = await axios.post(
          `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.GOOGLE_RECAPTCHA_CLIENT_SECRET}&response=${recaptchaToken}`
        );
        console.log('[RECAPTCHA DATA - SIGN UP]:', recaptchaRes.data);
        if (
          !recaptchaRes.data.success ||
          recaptchaRes.data.score < 0.5 ||
          recaptchaRes.data.action !== 'join'
        ) {
          console.log(
            'ERROR',
            'Recaptcha verification failed',
            recaptchaRes ? recaptchaRes.data : 'NULL'
          );
          return next(
            new ErrorHandler(422, 'Recaptcha verification failed, please try again later.')
          );
        }
      }

      const existing = await userApi.getUserByIdEmailPhoneOrUsername(email);

      if (existing) {
        return next(
          new ErrorHandler(400, 'User with provided email/phone/username already exists')
        );
      }

      // init data
      const wFairUserId = new ObjectId().toHexString();
      const counter = ((await userApi.getUserEntriesAmount()) || 0) + 1;
      const passwordHash = await bcrypt.hash(password, 8);
      const emailCode = generate(6);
      const createdUser = await userApi.createUser({
        _id: wFairUserId,
        email,
        emailCode,
        username: username || `wallfair-${counter}`,
        password: passwordHash,
        preferences: {
          currency: 'WFAIR',
        },
        ref, cid, sid,
        tosConsentedAt: new Date(),
      });

      const account = new Account();
      await account.createUser(wFairUserId);

      await userService.checkUserRegistrationBonus(wFairUserId.toString());

      let initialReward = 0;
      // if (ref) {
      //   if (INFLUENCERS.indexOf(ref) > -1) {
      //     console.debug('[REWARD BY INFLUENCER] ', ref);
      //     setTimeout(async () => {
      //       await userService
      //         .createUserAwardEvent({
      //           userId: createdUser.id.toString(),
      //           awardData: {
      //             type: AWARD_TYPES.CREATED_ACCOUNT_BY_INFLUENCER,
      //             award: WFAIR_REWARDS.registeredByInfluencer,
      //             ref,
      //           },
      //         })
      //         .catch((err) => {
      //           console.error('createUserAwardEvent', err);
      //         });
      //     }, 3000);
      //
      //     initialReward += WFAIR_REWARDS.registeredByInfluencer;
      //   } else {
      //     console.debug('[REWARD BY USER] ', ref);
      //
      //     const refList = await userService.getRefByUserId(ref);
      //     //max ref awards elements per user
      //     if (refList.length <= 10) {
      //       setTimeout(async () => {
      //         await userService
      //           .createUserAwardEvent({
      //             userId: ref,
      //             awardData: {
      //               type: AWARD_TYPES.CREATED_ACCOUNT_BY_THIS_REF,
      //               award: WFAIR_REWARDS.referral,
      //               ref,
      //             },
      //           })
      //           .catch((err) => {
      //             console.error('createUserAwardEvent', err);
      //           });
      //       }, 3000);
      //     }
      //   }
      // }

      amqp.send(
        'universal_events',
        'event.user_signed_up',
        JSON.stringify({
          event: notificationEvents.EVENT_USER_SIGNED_UP,
          producer: 'user',
          producerId: createdUser._id,
          data: {
            email: createdUser.email,
            userId: createdUser._id,
            username: createdUser.username,
            ref, cid, sid,
            initialReward,
            updatedAt: Date.now(),
          },
          date: Date.now(),
          broadcast: true,
        })
      );

      mailService
        .sendConfirmMail(createdUser)
        .then(() => {
          console.log(`[SIGNUP] Confirmation email sent to ${createdUser.email}`);
        })
        .catch((e) => {
          console.error(`[SIGNUP] Error sending email to ${createdUser.email}`, e);
        });

      return res.status(201).json({
        userId: createdUser.id,
        email: createdUser.email,
        initialReward,
      });
    } catch (err) {
      logger.error(err);
      return next(new ErrorHandler(500, 'Something went wrong.'));
    }
  },

  async loginThroughProvider(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ErrorHandler(422, errors));
    }

    try {
      const { provider } = req.params;
      const { ref = null, sid = null, cid = null } = req.body;

      const userData = await authService.getUserDataForProvider(provider, req.body);

      if (!userData.email) {
        throw new Error('NO_SOCIAL_ACCOUNT_EMAIL');
      }

      const existingUser = await userApi.getUserByIdEmailPhoneOrUsername(userData.email);

      if (existingUser) {
        // if exists, log user in
        if (isUserBanned(existingUser)) {
          return next(new BannedError(existingUser));
        }
        amqp.send(
          'universal_events',
          'event.user_signed_in',
          JSON.stringify({
            event: notificationEvents.EVENT_USER_SIGNED_IN,
            producer: 'user',
            producerId: existingUser._id,
            data: {
              userIdentifier: existingUser.email,
              userId: existingUser._id,
              username: existingUser.username,
              updatedAt: Date.now(),
            },
            broadcast: true,
          })
        );
        res.status(200).json({
          userId: existingUser.id,
          session: await authService.generateJwt(existingUser),
          newUser: false,
          shouldAcceptToS: hasAcceptedLatestConsent(existingUser),
        });
      } else {
        const newUserId = new ObjectId().toHexString();
        // create user and log them it
        const createdUser = await userApi.createUser({
          _id: newUserId,
          ...userData,
          birthdate: null,
          ...(!userData.emailConfirmed && { emailCode: generate(6) }),
          preferences: {
            currency: 'WFAIR',
          },
          ref, cid, sid
        });

        await userService.checkUserRegistrationBonus(newUserId.toString());
        //treat as confirm email, when new account and logged-in through provider
        await userService.checkConfirmEmailBonus(newUserId.toString());

        const initialReward = 0;
        amqp.send(
          'universal_events',
          'event.user_signed_up',
          JSON.stringify({
            event: notificationEvents.EVENT_USER_SIGNED_UP,
            producer: 'user',
            producerId: createdUser._id,
            data: {
              email: createdUser.email,
              userId: createdUser._id,
              username: createdUser.username,
              initialReward,
              updatedAt: Date.now(),
              provider,
            },
            date: Date.now(),
            broadcast: true,
          })
        );

        return res.status(200).json({
          userId: createdUser.id,
          session: await authService.generateJwt(createdUser),
          newUser: true,
          initialReward,
          user: createdUser,
        });
      }
    } catch (e) {
      console.log(e);
      const errorCode = e.message === e.message.toUpperCase() ? e.message : 'UNKNOWN';
      return res.status(400).json({ errorCode });
    }
  },

  async login(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ErrorHandler(422, errors));
    }

    const isAdminOnly = req.query.admin === 'true';

    try {
      const { userIdentifier, password } = req.body;
      const user = await userApi.getUserByIdEmailPhoneOrUsername(userIdentifier);

      if (!user || (isAdminOnly && !user.admin)) {
        return next(new ErrorHandler(401, 'Invalid login'));
      }

      if (user.status === 'locked') {
        return next(new ErrorHandler(403, 'Your account is locked'));
      }

      if (!user.accountSource || user.accountSource !== 'email' || !user.password) {
        return next(new ErrorHandler(401, 'Invalid login'));
      }

      if (isUserBanned(user)) {
        return next(new BannedError(user));
      }

      const valid = user && (await bcrypt.compare(password, user.password));

      if (!valid) {
        return next(new ErrorHandler(401, 'Invalid login'));
      }

      amqp.send(
        'universal_events',
        'event.user_signed_in',
        JSON.stringify({
          event: notificationEvents.EVENT_USER_SIGNED_IN,
          producer: 'user',
          producerId: user._id,
          data: {
            userIdentifier,
            userId: user._id,
            username: user.username,
            updatedAt: Date.now(),
          },
          broadcast: true,
        })
      );

      res.status(200).json({
        userId: user.id,
        session: await authService.generateJwt(user),
        shouldAcceptToS: hasAcceptedLatestConsent(user),
      });
    } catch (err) {
      logger.error(err);
      return next(new ErrorHandler(401, "Couldn't verify user"));
    }
  },

  async verifyEmail(req, res, next) {
    try {
      const user = await userApi.verifyEmail(req.body.email);
      if (!user) return next(new ErrorHandler(404, "Couldn't find user"));
      return res.status(200).send();
    } catch (err) {
      logger.error(err);
      return res.status(500).send();
    }
  },

  /** Handler to acutally reset your password */
  async resetPassword(req, res, next) {
    try {
      // get user
      const user = await userApi.getUserByIdEmailPhoneOrUsername(req.body.email);
      if (!user) return next(new ErrorHandler(404, "Couldn't find user"));

      // check if token matches
      if (user.passwordResetToken !== req.body.passwordResetToken) {
        return next(new ErrorHandler(401, 'Token not valid'));
      }

      // check if email matches
      if (user.email !== req.body.email) {
        return next(new ErrorHandler(401, 'Emails do not match'));
      }

      // check if given passwords match
      if (req.body.password !== req.body.passwordConfirmation) {
        return next(new ErrorHandler(401, 'Passwords do not match'));
      }

      user.password = await bcrypt.hash(req.body.password, 8);
      user.passwordResetToken = undefined;
      await user.save();

      amqp.send(
        'universal_events',
        'event.user_changed_password',
        JSON.stringify({
          event: notificationEvents.EVENT_USER_CHANGED_PASSWORD,
          producer: 'user',
          producerId: user._id,
          data: {
            email: user.email,
            passwordResetToken: req.body.passwordResetToken,
          },
        })
      );

      return res.status(200).send();
    } catch (err) {
      logger.error(err);
      return res.status(500).send();
    }
  },

  /** Hanlder to init the "I've forgot my passwort" process */
  async forgotPassword(req, res, next) {
    try {
      const user = await userApi.getUserByIdEmailPhoneOrUsername(req.body.email);
      if (!user) {
        console.log('ERROR', 'Forgot password: User not found ', req.body);
        return next(new ErrorHandler(404, "Couldn't find user"));
      }

      const passwordResetToken = generate(10);
      const resetPwUrl = `${process.env.CLIENT_URL}/reset-password?email=${user.email}&passwordResetToken=${passwordResetToken}`;

      user.passwordResetToken = passwordResetToken;
      await user.save();
      await mailService.sendPasswordResetMail(user.email, resetPwUrl);

      amqp.send(
        'universal_events',
        'event.user_forgot_password',
        JSON.stringify({
          event: notificationEvents.EVENT_USER_FORGOT_PASSWORD,
          producer: 'user',
          producerId: user._id,
          data: {
            email: user.email,
            passwordResetToken: user.passwordResetToken,
          },
        })
      );

      return res.status(200).send();
    } catch (err) {
      logger.error(err);
      return res.status(500).send();
    }
  },
};
