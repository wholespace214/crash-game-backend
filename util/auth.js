const passport = require('passport');
const JWTstrategy = require('passport-jwt').Strategy;
const ExtractJWT = require('passport-jwt').ExtractJwt;
// Import User Service
const userService = require("../services/user-service");

passport.use(
    new JWTstrategy(
        {
            secretOrKey: process.env.JWT_KEY,
            jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken()
        },
        async (token, done) => {
            try {
                let user = await userService.getUserById(token.userId)
                return done(null, user);
            } catch (error) {
                done(error);
            }
        }
    )
);