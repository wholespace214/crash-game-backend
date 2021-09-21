const logger = require('../util/logger');
const userApi = require('../services/user-api');
const { ErrorHandler } = require('../util/error-handler');
const authServiceV2 = require('../services/auth-service-v2');
const mailService = require('../services/mail-service');
const { validationResult } = require('express-validator');
const userService = require('./user-service');

module.exports = {
  async createUser(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return next(new ErrorHandler(422, errors));
      }

      const { password, email, username } = req.body;

      const counter = ((await userApi.getUserEntriesAmount()) || 0) + 1;
      const createdUser = await userApi.createUser({
        email,
        username: username || `wallfair-${counter}`,
        password,
        preferences: {
          currency: 'WFAIR',
        },
      });

      if (!createdUser) throw new Error("Couldn't create user");

      await userService.mintUser(createdUser.id.toString());
      await mailService.sendConfirmMail(createdUser);

      return res.status(200).json(createdUser);
    } catch (err) {
      logger.error(err);
    }
    return res.status(500).send();
  },

  async login(req, res, next) {
    try {
      const user = await authServiceV2.doLogin(req.body.userIdentifier, req.body.password);
      if (!user) return next(new ErrorHandler(403, "Couldn't verify user"));
      // TODO @gmussi - What do you want to return here?
      return res.status(200).json(user);
    } catch (err) {
      logger.error(err);
      return res.status(500).send();
    }
  },

  async verifyEmail(req, res, next) {
    try {
      const user = await userApi.verifyEmail(req.body.email);
      if (!user) return next(new ErrorHandler(404, "Couldn't find user"));
      return res.status(200).json(user);
    } catch (err) {
      logger.error(err);
      return res.status(500).send();
    }
  },

  async resetPassword(req, res, next) {
    try {
      const user = await userApi.getOne(req.body.email);
      if (!user) return next(new ErrorHandler(404, "Couldn't find user"));
      await mailService.sendResetPasswordMail(user);

      return res.status(201).send();
    } catch (err) {
      logger.error(err);
      return res.status(500).send();
    }
  },
};
