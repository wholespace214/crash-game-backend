const logger = require('../util/logger');
const userApi = require('./user-api');
const { ErrorHandler } = require('../util/error-handler');
const authServiceV2 = require('./auth-service-v2');
const mailService = require('./mail-service');

module.exports = {
  async createUser(req, res,next) {
    try {
      const { password, email, passwordConfirm, username } = req.body;
      if(password !== passwordConfirm) {
        next(new ErrorHandler(400, "Passwords don't match"));
      }
      const counter = (await userApi.getUserEntriesAmount() || 0) + 1;
      const createdUser = await userApi.createUser({
        email,
        username: username || `wallfair-${counter}`,
        openBeds: [],
        closedBets: [],
        confirmed: false,
        admin: false,
        date: new Date(),
        password,
      });

      if (!createdUser) throw new Error("Couldn't create user");
      await mailService.sendConfirmMail(createdUser);
      return res.status(200).json(createdUser);
    } catch (err) {
      logger.error(err);
    }
    return res.status(500).send();
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

  async login(req, res, next) {
    try {
      const user = await authServiceV2.doLogin(req.body.username, req.body.password);
      if (!user) return next(new ErrorHandler(403, "Couldn't verify user"));
      // TODO @gmussi - What do you want to return here?
      return res.status(200).json(user);
    } catch (err) {
      logger.error(err);
      return res.status(500).send();
    }
  },
};
