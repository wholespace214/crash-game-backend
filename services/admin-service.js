const { BetContract, Wallet } = require("smart_contract_mock");
const User = require("../models/User");
const Bet = require("../models/Bet");
const Event = require("../models/Event");

const { Erc20 } = require('smart_contract_mock');
const EVNT = new Erc20('EVNT');

// Import services
const userService = require("../services/user-service");
const eventService = require("../services/event-service");
const betService = require("../services/bet-service");
const websocketService = require("../services/websocket-service");

const generator = require("generate-password");

const flatten = require("flat");

const AdminBro = require("admin-bro");
const AdminBroExpress = require("@admin-bro/express");
const AdminBroMongoose = require("@admin-bro/mongoose");
const {Router} = require("express");

AdminBro.registerAdapter(AdminBroMongoose);

let mongoose = null;

exports.setMongoose = (newMongoose) => (mongoose = newMongoose);

let adminBro = null;

exports.initialize = function () {
  adminBro = new AdminBro({
    databases: [mongoose],
    resources: [
      {
        resource: User,
        options: {
          listProperties: [
            "_id",
            "email",
            "name",
            "phone",
            "profilePictureUrl",
          ],
          actions: {
            mint: {
              actionType: "record",
              icon: "Cash",
              isVisible: true,
              handler: async (request, response, context) => {
                const record = context.record;
                record.params.balance = await userService
                  .getBalanceOf(record.params._id)
                  .toString();
                return {
                  record: record.toJSON(),
                };
              },
              component: AdminBro.bundle("./components/user-mint"),
            },
            "do-mint": {
              // create a totally new action
              actionType: "record",
              isVisible: false,
              handler: async (request, response, context) => {
                const addBalance = request.fields.add;
                await userService.mintUser(
                  context.record.params._id,
                  addBalance
                );
                return {
                  record: context.record.toJSON(context.currentAdmin),
                };
              },
            },
          },
        },
      },
      {
        resource: Bet,
        options: {
          actions: {
            new: {
              after: async (request) => {
                const bet = flatten.unflatten(request.record.params, {
                  safe: true,
                });

                const session = await Event.startSession();
                await session.withTransaction(async () => {
                  bet.id = bet._id;
                  await eventService.provideLiquidityToBet(bet);
                  const event = await Event.findById(bet.event).session(
                    session
                  );
                  event.bets.push(bet.id);
                  await event.save({ session });
                });
                return request;
              },
            },
            cancel: {
              // create a totally new action
              actionType: "record",
              icon: "Cancel",
              isVisible: true,
              handler: async (request, response, context) => {
                return {
                  record: context.record.toJSON(),
                };
              },
              component: AdminBro.bundle("./components/bet-cancel"),
            },
            "do-cancel": {
              // create a totally new action
              actionType: "record",
              isVisible: false,
              handler: async (request, response, context) => {
                const session = await Bet.startSession();

                let dbBet = undefined;
                let userIds = [];

                await session.withTransaction(async () => {
                  dbBet = await eventService.getBet(
                    request.params.recordId,
                    session
                  );
                  dbBet.canceled = true;
                  dbBet.reasonOfCancellation = request.fields.reason;

                  userIds = await betService.refundUserHistory(dbBet, session);
                  await eventService.saveBet(dbBet, session);

                  const betContract = new BetContract(dbBet.id);
                  await betContract.refund();
                });

                if(dbBet) {
                  const event = await eventService.getEvent(dbBet.event);

                  for(const userId of userIds) {
                    websocketService.emitEventCancelNotification(userId, dbBet.event, event.name, dbBet.reasonOfCancellation)
                  }
                }

                return {
                  record: context.record.toJSON(),
                };
              },
              component: AdminBro.bundle("./components/bet-cancel"),
            },
            resolve: {
              // create a totally new action
              actionType: "record",
              icon: "Receipt",
              isVisible: true,
              handler: async (request, response, context) => {
                const id = context.record.params._id;
                const record = context.record;
                record.params = await Bet.findById(id);
                return {
                  record: record.toJSON(),
                };
              },
              component: AdminBro.bundle("./components/resolve"),
            },
            "do-resolve": {
              // create a totally new action
              actionType: "record",
              isVisible: false,
              handler: async (request, response, context) => {
                const id = context.record.params._id;
                const bet = await eventService.getBet(id);
                const indexOutcome = request.fields.index;
                const evidenceActual = request.fields.evidenceActual;
                const evidenceDescription = request.fields.evidenceDescription;

                if (bet.status !== "active" && bet.status !== "closed") {
                  context.record.params.message =
                    "Event can only be resolved if it is active or closed";
                  return {
                    record: context.record.toJSON(context.currentAdmin),
                  };
                }

                let resolveResults = [];

                const session = await Bet.startSession();
                try {
                  await session.withTransaction(async () => {
                    bet.finalOutcome = indexOutcome;
                    bet.resolved = true;
                    bet.evidenceDescription = evidenceDescription;
                    bet.evidenceActual = evidenceActual;

                    await betService.clearOpenBets(bet, session);
                    await bet.save({ session });
                    const betContract = new BetContract(id);
                    resolveResults = await betContract.resolveAndPayout(
                      "Wallfair Admin User",
                      indexOutcome
                    );
                  });
                } catch (err) {
                  console.debug(err);
                } finally {
                  await session.endSession();

                  for (const {owner: userId, balance} of resolveResults) {
                    const winToken = Math.round(Number(balance) / Number(EVNT.ONE));

                    if(userId.includes('_')) {
                      continue;
                    }

                    const user = await User.findById({_id: userId}, {phone: 1}).exec();

                    if(user) {
                      websocketService.emitBetResolveNotification(
                        userId,
                        id,
                        bet.marketQuestion,
                        bet.outcomes[indexOutcome].name,
                        winToken
                      );
                    }
                  }
                }
                return {
                  record: context.record.toJSON(context.currentAdmin),
                };
              },
            },
          },
        },
      },
      {
        resource: Event,
        options: {
          listProperties: ["_id", "name", "date"],
          actions: {
            "new-bet-from-template": {
              actionType: "record",
              icon: "Plus",
              isVisible: true,
              handler: async (request, response, context) => {
                const record = context.record;
                return {
                  record: record.toJSON(),
                };
              },
              component: AdminBro.bundle("./components/new-bet"),
            },
            "do-new-bet-from-template": {
              actionType: "record",
              isVisible: false,
              handler: async (request, response, context) => {
                const record = context.record;
                const event = flatten.unflatten(record.params, {
                  safe: true,
                });
                let dbEvent = await eventService.getEvent(record.params._id);
                const bet = event.betTemplate;
                let createBet = new Bet({
                  marketQuestion: bet.marketQuestion,
                  description: bet.description,
                  hot: bet.hot,
                  outcomes: bet.outcomes,
                  duration: bet.duration,
                  event: record.params._id,
                  creator: bet.creator,
                  published: false,
                });

                const session = await Bet.startSession();
                try {
                  await session.withTransaction(async () => {
                    createBet = await eventService.saveBet(createBet, session);

                    createBet.endDate = new Date(
                      createBet.date.getTime() + bet.betDuration * 1000 * 60
                    );

                    createBet = await eventService.saveBet(createBet, session);

                    dbEvent.bets.push(createBet);
                    dbEvent = await eventService.saveEvent(dbEvent, session);
                  });
                } finally {
                  await session.endSession();
                }
                record.params = dbEvent;
                record.params._doc.createdBet = createBet.id;
                return {
                  record: record.toJSON(),
                };
              },
              component: AdminBro.bundle("./components/new-bet"),
            },
          },
        },
      },
    ],
    rootPath: "/admin",
    branding: {
      companyName: "WALLFAIR",
    },
  });
};
const passport = require('passport');


exports.getRootPath = function () {
  return adminBro.options.rootPath;
};

exports.getLoginPath = function () {
  return adminBro.options.loginPath;
};
let router = null;
exports.buildRouter = function () {
  /*let password = generator.generate({
    length: 10,
    numbers: true,
  });
  router = AdminBroExpress.buildAuthenticatedRouter(adminBro, {
    authenticate: async (email, password, request, response) => {
      const user = await User.findOne({ email });
      if (user) {
        if (await userService.comparePassword(user, password)) {
          return user;
        }
      }
      return false;
    },
    cookiePassword: password,
  });*/

  router = Router()
  router.use(passport.authenticate('jwt_admin', { session: false }))
  router = AdminBroExpress.buildRouter(adminBro, router)
};

exports.getRouter = function () {
  return router;
};
