const User = require("../models/User");
const Bet = require("../models/Bet");
const Event = require("../models/Event");

// Import User Service
const userService = require("../services/user-service");

const generator = require('generate-password');

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
                ]
            }
        }, Bet, Event],
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