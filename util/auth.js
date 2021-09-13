const passport = require('passport');
const JWTstrategy = require('passport-jwt').Strategy;
const ExtractJWT = require('passport-jwt').ExtractJwt;
// Import User Service
const userService = require('../services/user-service');

passport.use('jwt',
  new JWTstrategy(
    {
      secretOrKey: process.env.JWT_KEY,
      jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
    },
    async (token, done) => {
      try {
        const user = await userService.getUserById(token.userId);
        return done(null, user);
      } catch (error) {
        done(error);
      }
    },
  ));
passport.use('jwt_admin',
  new JWTstrategy(
    {
      secretOrKey: process.env.JWT_KEY,
      jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
    },
    async (token, done) => {
      try {
        let user = await userService.getUserById(token.userId);
        if (!user.admin) {
          user = undefined;
        }
        return done(null, user);
      } catch (error) {
        done(error);
      }
    },
  ));
