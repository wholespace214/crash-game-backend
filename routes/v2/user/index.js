// const passport = require('passport');
const router = require('express').Router();

const publicUserRoutes = require('./public-user-routes');
const protectedUserRoutes = require('./protected-user-routes');

router.use(publicUserRoutes);
// TODO make these routes protected
// router.use(passport.authenticate('jwt', { session: false }), protectedUserRoutes);
router.use(protectedUserRoutes);

module.exports = router;
