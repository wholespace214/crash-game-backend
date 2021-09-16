const passport = require('passport');
const Strategy = require('passport-local');
const crypto = require('crypto');

const fakeDb = {
  dbirke: 'foobar',
};

exports.initAuth = async (/** @type import('express').Express */ app) => {
  // Configure the local strategy for use by Passport.
  //
  // The local strategy requires a `verify` function which receives the credentials
  // (`username` and `password`) submitted by the user.  The function must verify
  // that the password is correct and then invoke `cb` with a user object, which
  // will be set at `req.user` in route handlers after authentication.
  passport.use(new Strategy((username, password, cb) => {
    if (fakeDb[username] && fakeDb[username] === password) {
      cb(null, { username: fakeDb[username], foo: 222, id: '0815' });
    }
    cb('User not found');
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
