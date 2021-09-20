const logger = require('../util/logger');
const userApi = require('./user-api');
const { ErrorHandler } = require('../util/error-handler');
const authServiceV2 = require('./auth-service-v2');

module.exports = {
  async createUser(req, res) {
    try {
      const {
        phone, username, password, email,
      } = req.body;
      const createdUser = await userApi.createUser({
        // Phone is currently required by backend
        phone,
        email,
        username,
        openBeds: [],
        closedBets: [],
        confirmed: false,
        admin: false,
        date: new Date(),
        password,
      });

      if (!createdUser) throw new Error("Couldn't create user");
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
