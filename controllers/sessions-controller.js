const logger = require('../util/logger');
const userApi = require('../services/user-api');
const { ErrorHandler } = require('../util/error-handler');
const authService = require('../services/auth-service');
const mailService = require('../services/mail-service');
const { validationResult } = require('express-validator');
const userService = require('../services/user-service');
const { generate } = require('../helper');
const notificationService = require('../services/notification-service');
const bcrypt = require('bcryptjs');
const { notificationEvents } = require('@wallfair.io/wallfair-commons/constants/eventTypes');

module.exports = {
  async createUser(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ErrorHandler(422, errors));
    }

    try {
      const { password, email, username } = req.body;

      const existing = await userApi.getUserByIdEmailPhoneOrUsername(email);

      if (existing) {
        return next(new ErrorHandler(400, 'User exists'));
      }

      const counter = ((await userApi.getUserEntriesAmount()) || 0) + 1;
      const passwordHash = await bcrypt.hash(password, 8);

      const createdUser = await userApi.createUser({
        email,
        username: username || `wallfair-${counter}`,
        password: passwordHash,
        preferences: {
          currency: 'WFAIR',
        },
      });

      await userService.mintUser(createdUser.id.toString());
      await mailService.sendConfirmMail(createdUser);

      return res.status(201).json({
        userId: createdUser.id,
        email: createdUser.email,
      });
    } catch (err) {
      logger.error(err);
    }
    return res.status(500).send();
  },

  async login(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ErrorHandler(422, errors));
    }

    try {
      const { userIdentifier, password } = req.body;
      const user = await userApi.getUserByIdEmailPhoneOrUsername(userIdentifier);
      const valid = user && (await bcrypt.compare(password, user.password));

      if (!valid) {
        return next(new ErrorHandler(401, 'Invalid login'));
      }

      res.status(200).json({
        userId: user.id,
        session: await authService.generateJwt(user),
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
      console.log(user)
      // check if token matches
      if (user.passwordResetToken !== req.body.passwordResetToken) {
        return next(new ErrorHandler(401, "Token not valid"));
      }

      // check if email matches
      if (user.email !== req.body.email) {
        return next(new ErrorHandler(401, "Emails do not match"));
      }
      console.log(req.body, req.body.password, req.body.passwordConfirmation)
      // check if given passwords match
      if (req.body.password !== req.body.passwordConfirmation) {
        return next(new ErrorHandler(401, "Passwords do not match"));
      }

      // actually update user
      const updatedUser = await userApi.updateUser({
        id: user.id,
        password: req.body.password,
        $unset:{passwordResetToken: 1}
      })

      logger.info(
        updatedUser,
      )

      notificationService.publishEvent(
        { type: notificationEvents.EVENT_USER_CHANGED_PASSWORD },
        user,
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
      if (!user) return next(new ErrorHandler(404, "Couldn't find user"));

      // generate token
      const passwordResetToken = generate(10);
      // store user token
      const updatedUser = await userApi.updateUser({ id: user._id, passwordResetToken: passwordResetToken });

      const resetPwUrl = `${process.env.CLIENT_URL}?email=${user.email}&passwordResetToken=${passwordResetToken}`

      notificationService.publishEvent(
        { type: notificationEvents.EVENT_USER_FORGOT_PASSWORD },
        { ...user, resetPwUrl },
      );
      logger.info(
        notificationEvents.EVENT_USER_FORGOT_PASSWORD,
        updatedUser,
        resetPwUrl
      );

      return res.status(200).send();
    } catch (err) {
      logger.error(err);
      return res.status(500).send();
    }
  },
};
