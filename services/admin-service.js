const {BetContract, Wallet} = require('smart_contract_mock');
const User = require("../models/User");
const Bet = require("../models/Bet");
const Event = require("../models/Event");

// Import services
const userService = require("../services/user-service");
const eventService = require("../services/event-service");
const betService = require("../services/bet-service");

const generator = require('generate-password');

const flatten = require('flat');

const AdminBro = require('admin-bro');
const AdminBroExpress = require('@admin-bro/express');
const AdminBroMongoose = require('@admin-bro/mongoose')

AdminBro.registerAdapter(AdminBroMongoose);

let mongoose           = null;

exports.setMongoose = (newMongoose) => mongoose = newMongoose;

let adminBro = null;

exports.initialize = function () {
    adminBro = new AdminBro({
        databases: [mongoose],
        resources: [{
            resource: User,
            options: {
                listProperties: [
                    '_id',
                    'email',
                    'name',
                    'phone',
                    'profilePictureUrl',
                ],
                actions: {
                    mint: {
                        actionType: 'record',
                        icon: 'Cash',
                        isVisible: true,
                        handler: async (request, response, context) => {
                            const record = context.record;
                            record.params.balance = await userService.getBalanceOf(record.params._id);
                            return {
                                record: record.toJSON(),
                            }
                        },
                        component: AdminBro.bundle('./components/user-mint'),
                    },
                    'do-mint': {
                        // create a totally new action
                        actionType: 'record',
                        isVisible: false,
                        handler: async (request, response, context) => {
                            const addBalance = request.fields.add;
                            await userService.mintUser(context.record.params._id, addBalance);
                            return {
                                record: context.record.toJSON(context.currentAdmin),
                            }
                        },
                    },
                }
            },
        }, {
            resource: Bet,
            options: {
                actions: {
                        new: {
                            after: async (request) => {
                                const bet = flatten.unflatten(request.record.params, {
                                    safe: true
                                });

                                const session = await Event.startSession();
                                await session.withTransaction(async () => {
                                    bet.id = bet._id;
                                    await eventService.provideLiquidityToBet(bet);
                                    const event = await Event.findById(bet.event).session(session);
                                    event.bets.push(bet.id);
                                    await event.save({session});
                                });
                                return request
                            }
                        },
                        cancel: {
                            // create a totally new action
                            actionType: 'record',
                            icon: 'Cancel',
                            isVisible: true,
                            handler: async (request, response, context) => {
                                return {
                                    record: context.record.toJSON(),
                                }
                            },
                            component: AdminBro.bundle('./components/bet-cancel'),
                        },
                    'do-cancel': {
                        // create a totally new action
                        actionType: 'record',
                        isVisible: false,
                        handler: async (request, response, context) => {
                            const session = await Bet.startSession();
                            await session.withTransaction(async () => {
                                const dbBet = await eventService.getBet(request.params.recordId, session);
                                dbBet.canceled = true;
                                dbBet.reasonOfCancellation = request.fields.reason;

                                await betService.refundUserHistory(dbBet, session);
                                await eventService.saveBet(dbBet, session);

                                const betContract = new BetContract(dbBet.id);
                                await betContract.refund();
                            });
                            return {
                                record: context.record.toJSON(),
                            }
                        },
                        component: AdminBro.bundle('./components/bet-cancel'),
                    },
                        resolve: {
                            // create a totally new action
                            actionType: 'record',
                            icon: 'Receipt',
                            isVisible: true,
                            handler: async (request, response, context) => {
                                const id = context.record.params._id;
                                const record = context.record;
                                record.params = await Bet.findById(id);
                                return {
                                    record: record.toJSON(),
                                }
                            },
                            component: AdminBro.bundle('./components/resolve'),
                        },
                        'do-resolve': {
                            // create a totally new action
                            actionType: 'record',
                            isVisible: false,
                            handler: async (request, response, context) => {
                                const id = context.record.params._id;
                                const bet = await eventService.getBet(id);
                                const indexOutcome = request.fields.index;

                                if(bet.status !== 'active' && bet.status !== 'closed') {
                                    context.record.params.message = 'Event can only be resolved if it is active or closed';
                                    return {
                                        record: context.record.toJSON(context.currentAdmin),
                                    }
                                }

                                const session = await Bet.startSession();
                                try {
                                    await session.withTransaction(async () => {
                                        context.record.params.message = 'The final outcome is ' + bet.outcomes[indexOutcome].marketQuestion;
                                        bet.finalOutcome = indexOutcome;
                                        bet.resolved = true;


                                        await betService.clearOpenBets(bet, session);
                                        await bet.save({session});
                                        const betContract = new BetContract(id);
                                        await betContract.resolveAndPayout('Wallfair Admin User', indexOutcome);
                                    })
                                } finally {
                                    await session.endSession();
                                }
                                return {
                                    record: context.record.toJSON(context.currentAdmin),
                                }
                            },
                        },
                    },
            }
        }, Event],
        rootPath: '/admin',
        branding: {
            companyName: 'WALLFAIR',
        },
    });
}

exports.getRootPath = function () {
    return adminBro.options.rootPath;
}

exports.getLoginPath = function () {
    return adminBro.options.loginPath;
}
let router = null;
exports.buildRouter = function () {
    let password = generator.generate({
        length: 10,
        numbers: true
    });
    router = AdminBroExpress.buildAuthenticatedRouter(adminBro, {
        authenticate: async (email, password) => {
            const user = await User.findOne({ email });
            if (user) {
                if (await userService.comparePassword(user, password)) {
                    return user;
                }
            }
            return false;
        },
        cookiePassword: password,
    })
}

exports.getRouter = function () {
    return router;
}