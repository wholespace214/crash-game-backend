const passport = require('passport');
const Strategy = require('passport-local');
const crypto = require('crypto');
const userApi = require('../apis/user-api');

exports.initAuth = async (/** @type import('express').Express */ app) => {
  // Configure the local strategy for use by Passport.
  //
  // The local strategy requires a `verify` function which receives the credentials
  // (`username` and `password`) submitted by the user.  The function must verify
  // that the password is correct and then invoke `cb` with a user object, which
  // will be set at `req.user` in route handlers after authentication.
  passport.use(new Strategy(async (IdEmailPhoneOrUsername, password, cb) => {
    const currentUser= await userApi.getUserByIdEmailPhoneOrUsername(IdEmailPhoneOrUsername)
    if(!currentUser) return cb("Couldn't find user")

    crypto.pbkdf2(password, row.salt, 10000, 32, 'sha256', (err, hashedPassword)=> {
        if (err) { return cb(err); }
        if (!crypto.timingSafeEqual(row.hashed_password, hashedPassword)) {
          return cb(null, false, { message: 'Incorrect password.' });
        }

        return cb(null, currentUser);
      });
  }));

  // Configure Passport authenticated session persistence.
  //
  // In order to restore authentication state across HTTP requests, Passport needs
  // to serialize users into and deserialize users out of the session.  The
  // typical implementation of this is as simple as supplying the user ID when
  // serializing, and querying the user record by ID from the database when
  // deserializing.
  passport.serializeUser((user, cb) => {
    process.nextTick(() => {
      cb(null, { id: user.id, username: user.username });
    });
  });

  passport.deserializeUser((user, cb) => {
    process.nextTick(() => cb(null, user));
  });

  app.use(passport.initialize());
  app.use(passport.authenticate('session'));
};
